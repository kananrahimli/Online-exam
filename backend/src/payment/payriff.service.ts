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
  installment?: {
    type?: string;
    period?: number;
  };
}

export interface CreateOrderResponse {
  code: string;
  message?: string;
  payload: {
    orderId: string;
    paymentUrl: string;
    transactionId?: number;
  };
}

export interface OrderInformationResponse {
  code: string;
  message?: string;
  payload: {
    orderId: string;
    amount: number;
    currency?: string;
    currencyType?: string;
    paymentStatus: string;
    description?: string;
    createdDate?: string;
    transactions?: Array<{
      uuid?: string;
      status?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}

@Injectable()
export class PayriffService {
  private readonly apiClient: AxiosInstance;
  private readonly merchantSecretKey: string;
  private readonly baseUrl: string;
  private readonly SUCCESS_CODE = '00000';
  private readonly PAID_STATUS = 'APPROVED';

  constructor(private configService: ConfigService) {
    this.merchantSecretKey =
      this.configService.get<string>('PAYRIFF_SECRET_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('PAYRIFF_BASE_URL') ||
      'https://api.payriff.com/api/v3';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.merchantSecretKey,
      },
    });
  }

  /**
   * Create order in PayRiff (v3 API)
   * POST /orders
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      if (!this.merchantSecretKey) {
        throw new BadRequestException(
          'PayRiff secret key təyin edilməyib. Zəhmət olmasa .env faylında PAYRIFF_SECRET_KEY dəyişənini təyin edin.',
        );
      }

      // Prepare body according to v3 API
      const body: any = {
        amount: request.amount,
        callbackUrl: request.callbackUrl,
        description: request.description,
        currency: request.currency,
        language: request.language,
        cardSave: request.cardSave || false,
        operation: request.operation || 'PURCHASE',
      };

      if (request.installment) {
        body.installment = request.installment;
      }

      const response = await this.apiClient.post<{
        code: string;
        message?: string;
        payload: {
          orderId: string;
          paymentUrl: string;
          transactionId?: number;
        };
      }>('orders', body);

      if (response.data.code !== this.SUCCESS_CODE) {
        throw new BadRequestException(
          response.data.message || 'PayRiff ödəniş yaradıla bilmədi',
        );
      }

      return {
        code: response.data.code,
        message: response.data.message,
        payload: response.data.payload,
      };
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

  /**
   * Get order information from PayRiff (v3 API)
   * GET /orders/{orderId}
   */
  async getOrderInfo(orderId: string): Promise<OrderInformationResponse> {
    try {
      if (!this.merchantSecretKey) {
        throw new BadRequestException('PayRiff secret key təyin edilməyib');
      }

      const response = await this.apiClient.get<{
        code: string;
        message?: string;
        payload: any;
      }>(`orders/${orderId}`);

      if (response.data.code !== this.SUCCESS_CODE) {
        throw new BadRequestException(
          response.data.message || 'PayRiff sifariş məlumatı alına bilmədi',
        );
      }

      return {
        code: response.data.code,
        message: response.data.message,
        payload: response.data.payload,
      };
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
   * Get order status from PayRiff
   */
  async getOrderStatus(orderId: string): Promise<string> {
    try {
      const orderInfo = await this.getOrderInfo(orderId);
      return orderInfo.payload.paymentStatus;
    } catch (error: any) {
      throw new BadRequestException(
        `PayRiff order status alına bilmədi: ${error.message}`,
      );
    }
  }

  /**
   * Check if order is paid
   */
  async isOrderPaid(orderId: string): Promise<boolean> {
    try {
      const status = await this.getOrderStatus(orderId);
      return status === this.PAID_STATUS;
    } catch (error: any) {
      throw new BadRequestException(
        `PayRiff order status yoxlanıla bilmədi: ${error.message}`,
      );
    }
  }

  /**
   * Complete order (v3 API)
   * POST /complete
   * Rəsmi olaraq ödənişi tamamlayır
   */
  async completeOrder(orderId: string, amount: number): Promise<boolean> {
    try {
      if (!this.merchantSecretKey) {
        throw new BadRequestException('PayRiff secret key təyin edilməyib');
      }

      const response = await this.apiClient.post<{
        code: string;
        message?: string;
        payload?: {
          orderId?: string;
          paymentUrl?: string;
          sessionId?: string;
        };
      }>('complete', {
        amount: amount,
        orderId: orderId,
      });

      if (response.data.code !== this.SUCCESS_CODE) {
        throw new BadRequestException(
          response.data.message || 'PayRiff complete uğursuz oldu',
        );
      }

      return true;
    } catch (error: any) {
      if (error.response) {
        const errorMessage =
          error.response.data?.message || 'PayRiff complete xətası';
        const errorCode = error.response.data?.code;

        // Complete endpoint-i opsional ola bilər - əgər xəta varsa, log edək amma throw etməyək
        console.warn(
          `PayRiff complete endpoint xətası: ${errorMessage} (Code: ${errorCode || 'N/A'})`,
        );

        // Əgər order artıq completeddirsə və ya başqa bir səbəb varsa, xəta atmayaq
        if (
          errorMessage.includes('already') ||
          errorMessage.includes('completed') ||
          errorCode === '14010' ||
          errorCode === '14013'
        ) {
          return true; // Artıq tamamlanıb deməkdir
        }

        throw new BadRequestException(
          `PayRiff complete xətası: ${errorMessage} (Code: ${errorCode || 'N/A'})`,
        );
      }

      throw new BadRequestException('PayRiff bağlantı xətası');
    }
  }

  /**
   * Refund order (v3 API)
   * POST /refund
   */
  async refund(orderId: string, amount: number): Promise<boolean> {
    try {
      if (!this.merchantSecretKey) {
        throw new BadRequestException('PayRiff secret key təyin edilməyib');
      }

      const response = await this.apiClient.post<{
        code: string;
        message?: string;
      }>('refund', {
        refundAmount: amount,
        orderId: orderId,
      });

      return response.data.code === this.SUCCESS_CODE;
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
