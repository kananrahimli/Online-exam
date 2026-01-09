import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface CreateOrderRequest {
  amount: number;
  language: 'AZ' | 'EN' | 'RU';
  currency: 'AZN' | 'USD' | 'EUR';
  description: string;
  callbackUrl: string;
  cardSave?: boolean;
  operation?: 'PURCHASE' | 'PRE_AUTH';
  metadata?: Record<string, any>;
  merchant?: string; // PayRiff merchant/application ID
}

export interface CreateOrderResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  responseId: string;
  payload: {
    orderId: string;
    paymentUrl: string;
    transactionId: number;
  };
}

export interface OrderInfoResponse {
  code: string;
  message: string;
  route: string;
  internalMessage: string | null;
  responseId: string;
  payload: {
    orderId: string;
    amount: number;
    currencyType: string;
    merchantName: string;
    operationType: string;
    paymentStatus: string;
    auto: boolean;
    createdDate: string;
    description: string;
    transactions: Array<{
      uuid: string;
      createdDate: string;
      status: string;
      channel: string;
      channelType: string;
      requestRrn: string;
      responseRrn: string | null;
      pan: string;
      paymentWay: string;
      cardDetails: {
        maskedPan: string;
        brand: string;
        cardHolderName: string;
      };
      merchantCategory: string;
      installment: {
        type: string | null;
        period: string | null;
      };
    }>;
  };
}

@Injectable()
export class PayriffService {
  private readonly apiClient: AxiosInstance;
  private readonly merchant: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.merchant = this.configService.get<string>('PAYRIFF_MERCHANT') || '';
    this.baseUrl = this.configService.get<string>('PAYRIFF_BASE_URL');

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${this.configService.get<string>('PAYRIFF_SECRET_KEY') || ''}`,
      },
    });
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      // Check if merchant is configured
      if (!this.merchant && !request.merchant) {
        throw new BadRequestException(
          'PayRiff merchant ID təyin edilməyib. Zəhmət olmasa .env faylında PAYRIFF_MERCHANT dəyişənini təyin edin.',
        );
      }

      // Add merchant to request if not provided
      const requestWithMerchant = {
        body: { ...request },
        merchant: request.merchant || this.merchant,
      };

      const response = await this.apiClient.post<CreateOrderResponse>(
        '/createOrder',
        requestWithMerchant,
      );

      if (response.data.code !== '00000') {
        throw new BadRequestException(
          response.data.message || 'PayRiff ödəniş yaradıla bilmədi',
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorMessage =
          error.response.data?.message || 'PayRiff API xətası';
        const errorCode = error.response.data?.code;

        // Provide helpful error message for "Application not found"
        if (
          errorMessage.includes('Application not found') ||
          errorMessage.includes('Application not found!') ||
          errorCode === '14010' ||
          errorCode === '14013' ||
          errorCode === '14014'
        ) {
          throw new BadRequestException(
            `PayRiff application tapılmadı. Xəta: ${errorMessage}. Zəhmət olmasa .env faylında PAYRIFF_MERCHANT və PAYRIFF_SECRET_KEY dəyişənlərini düzgün təyin edin.`,
          );
        }

        throw new BadRequestException(
          `PayRiff API xətası: ${errorMessage} (Code: ${errorCode || 'N/A'})`,
        );
      }

      // If it's our custom error, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `PayRiff bağlantı xətası: ${error.message || 'Naməlum xəta'}`,
      );
    }
  }

  async getOrderInfo(orderId: string): Promise<OrderInfoResponse> {
    const requestInvoice = {
      merchant: this.merchant,
      body: {
        uuid: orderId,
      },
    };

    try {
      const response = await this.apiClient.post<any>(
        `/get-invoice`,
        requestInvoice,
      );

      if (response.data.code !== '00000') {
        throw new BadRequestException(
          response.data.message || 'PayRiff sifariş məlumatı alına bilmədi',
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'PayRiff API xətası',
        );
      }
      throw new BadRequestException('PayRiff bağlantı xətası');
    }
  }

  async refund(orderId: string, amount: number): Promise<any> {
    try {
      const response = await this.apiClient.post('/refund', {
        orderId,
        amount,
      });

      if (response.data.code !== '00000') {
        throw new BadRequestException(
          response.data.message || 'PayRiff geri qaytarma uğursuz oldu',
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'PayRiff API xətası',
        );
      }
      throw new BadRequestException('PayRiff bağlantı xətası');
    }
  }

  /**
   * Topup to MPAY wallet
   * Transfers money from PayRiff account to MPAY wallet
   */
  async topupToMPAY(
    amount: number,
    phoneNumber: string,
    description?: string,
  ): Promise<any> {
    try {
      const response = await this.apiClient.post('/topup', {
        amount,
        phoneNumber,
        description: description || 'Müəllim çıxarışı',
      });

      if (response.data.code !== '00000') {
        throw new BadRequestException(
          response.data.message || 'PayRiff topup uğursuz oldu',
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'PayRiff topup xətası',
        );
      }
      throw new BadRequestException('PayRiff bağlantı xətası');
    }
  }

  /**
   * Transfer money to bank account
   * First tries transfer API, if not available, uses topup to MPAY wallet
   */
  async transferToBank(
    amount: number,
    bankAccount: {
      accountNumber: string;
      bankName: string;
      accountHolderName: string;
      iban?: string;
      phoneNumber?: string; // MPAY wallet üçün telefon nömrəsi
    },
    description?: string,
  ): Promise<any> {
    // First, try transfer API
    try {
      const response = await this.apiClient.post('/transfer', {
        amount,
        currency: 'AZN',
        bankAccount: {
          accountNumber: bankAccount.accountNumber,
          bankName: bankAccount.bankName,
          accountHolderName: bankAccount.accountHolderName,
          iban: bankAccount.iban,
        },
        description: description || 'Müəllim çıxarışı',
      });

      if (response.data.code !== '00000') {
        throw new BadRequestException(
          response.data.message || 'PayRiff transfer uğursuz oldu',
        );
      }

      return {
        ...response.data,
        method: 'transfer',
      };
    } catch (error: any) {
      // If transfer endpoint doesn't exist or fails, try topup to MPAY wallet
      if (
        error.response?.status === 404 ||
        error.response?.status === 400 ||
        !error.response
      ) {
        // Use topup if phone number is provided
        if (bankAccount.phoneNumber) {
          try {
            const topupResult = await this.topupToMPAY(
              amount,
              bankAccount.phoneNumber,
              description || 'Müəllim çıxarışı - MPAY wallet',
            );

            return {
              ...topupResult,
              method: 'topup',
              message:
                'Transfer API mövcud olmadığı üçün pul MPAY wallet-ə köçürüldü',
            };
          } catch (topupError: any) {
            throw new BadRequestException(
              `Transfer və topup hər ikisi uğursuz oldu. Transfer: ${error.message}, Topup: ${topupError.message}`,
            );
          }
        } else {
          throw new BadRequestException(
            'Transfer API mövcud deyil və telefon nömrəsi təmin edilməyib. Zəhmət olmasa bank hesabı məlumatlarına telefon nömrəsi əlavə edin (MPAY wallet üçün).',
          );
        }
      }

      // If it's a different error, throw it
      if (error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'PayRiff transfer xətası',
        );
      }
      throw new BadRequestException('PayRiff bağlantı xətası');
    }
  }
}
