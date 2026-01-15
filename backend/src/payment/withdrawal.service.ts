// src/payment/withdrawal.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayriffService } from './payriff.service';
import { PAYMENT_CONFIG } from '../config/prizes.config';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private prisma: PrismaService,
    private payriffService: PayriffService,
  ) {}

  async createWithdrawal(
    teacherId: string,
    amount: number,
    bankAccount?: string,
    notes?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        teacherBalance: true,
        role: true,
        bankAccount: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'TEACHER') {
      throw new BadRequestException('Yalnız müəllimlər çıxarış edə bilər');
    }

    if (amount <= 0) {
      throw new BadRequestException('Məbləğ müsbət olmalıdır');
    }

    if (user.teacherBalance < amount) {
      throw new BadRequestException(
        `Balansınız kifayət etmir. Balansınız: ${user.teacherBalance.toFixed(2)} AZN`,
      );
    }

    // Get bank account info (use provided or saved)
    const bankAccountInfo = bankAccount || user.bankAccount;
    if (!bankAccountInfo) {
      throw new BadRequestException(
        'Bank hesabı məlumatları təmin edilməyib. Zəhmət olmasa bank hesabı məlumatlarınızı əlavə edin.',
      );
    }

    // Parse bank account info
    let parsedBankAccount: {
      accountNumber: string;
      bankName: string;
      accountHolderName: string;
      iban?: string;
      phoneNumber?: string;
    };

    try {
      parsedBankAccount = JSON.parse(bankAccountInfo);
    } catch (error) {
      throw new BadRequestException(
        'Bank hesabı məlumatları düzgün formatda deyil',
      );
    }

    // Validate bank account fields
    if (
      !parsedBankAccount.accountNumber ||
      !parsedBankAccount.bankName ||
      !parsedBankAccount.accountHolderName
    ) {
      throw new BadRequestException(
        'Bank hesabı məlumatları tam deyil. Hesab nömrəsi, bank adı və hesab sahibinin adı tələb olunur.',
      );
    }

    // Create withdrawal record with PROCESSING status (will be updated after PayRiff response)
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        teacherId,
        amount,
        status: PAYMENT_CONFIG.withdrawalStatuses.PROCESSING,
        bankAccount: bankAccountInfo,
        notes: notes || null,
      },
    });

    // Automatically transfer money via PayRiff
    try {
      const transferResult = await this.payriffService.transferToBank(
        amount,
        parsedBankAccount,
        notes || `Müəllim çıxarışı - ${user.firstName} ${user.lastName}`,
      );

      // Update withdrawal with PayRiff order ID if available
      await this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          payriffOrderId: transferResult.payload?.orderId || null,
          status: PAYMENT_CONFIG.withdrawalStatuses.COMPLETED,
          processedAt: new Date(),
        },
      });

      // Deduct from teacher balance
      await this.prisma.user.update({
        where: { id: teacherId },
        data: {
          teacherBalance: {
            decrement: amount,
          },
        },
      });

      const methodMessage =
        transferResult.method === 'topup'
          ? 'Pul MPAY wallet-ə köçürüldü (transfer API mövcud olmadığı üçün topup istifadə olundu).'
          : 'Pul bank hesabınıza köçürüldü.';

      return {
        withdrawalId: withdrawal.id,
        amount,
        message: `Çıxarış uğurla tamamlandı. ${methodMessage}`,
        transferResult: transferResult,
        method: transferResult.method,
      };
    } catch (error: any) {
      // If PayRiff transfer fails, mark withdrawal as FAILED
      await this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: PAYMENT_CONFIG.withdrawalStatuses.FAILED,
        },
      });

      // Return error message
      throw new BadRequestException(
        error.message ||
          'PayRiff transfer uğursuz oldu. Zəhmət olmasa daha sonra yenidən cəhd edin və ya PayRiff support ilə əlaqə saxlayın.',
      );
    }
  }

  async getWithdrawals(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'TEACHER') {
      throw new BadRequestException('Yalnız müəllimlər çıxarışları görə bilər');
    }

    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });

    return withdrawals;
  }

  async processWithdrawal(
    withdrawalId: string,
    adminId: string,
    payriffOrderId?: string,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        teacher: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Çıxarış tapılmadı');
    }

    if (withdrawal.status !== PAYMENT_CONFIG.withdrawalStatuses.PENDING) {
      throw new BadRequestException('Çıxarış artıq emal olunub');
    }

    // Check admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new BadRequestException('Yalnız admin çıxarış edə bilər');
    }

    // Check if teacher has enough balance
    if (withdrawal.teacher.teacherBalance < withdrawal.amount) {
      throw new BadRequestException('Müəllimin balansı kifayət etmir');
    }

    // Update withdrawal status to PROCESSING
    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: PAYMENT_CONFIG.withdrawalStatuses.PROCESSING,
        payriffOrderId: payriffOrderId || null,
      },
    });

    // Deduct from teacher balance
    await this.prisma.user.update({
      where: { id: withdrawal.teacherId },
      data: {
        teacherBalance: {
          decrement: withdrawal.amount,
        },
      },
    });

    // Here you would integrate with PayRiff to transfer money
    // For now, we'll mark it as completed
    // In production, you would:
    // 1. Call PayRiff transfer API
    // 2. Wait for confirmation
    // 3. Update status to COMPLETED

    // For now, mark as completed (in production, wait for PayRiff confirmation)
    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: PAYMENT_CONFIG.withdrawalStatuses.COMPLETED,
        processedAt: new Date(),
      },
    });

    return {
      message: 'Çıxarış uğurla emal olundu',
      withdrawal: withdrawal,
    };
  }

  async updateBankAccount(
    teacherId: string,
    bankAccount: {
      accountNumber: string;
      bankName: string;
      accountHolderName: string;
      iban?: string;
      phoneNumber?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'TEACHER') {
      throw new BadRequestException(
        'Yalnız müəllimlər bank hesabı məlumatları əlavə edə bilər',
      );
    }

    // Save bank account as JSON string
    const bankAccountJson = JSON.stringify(bankAccount);

    await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        bankAccount: bankAccountJson,
      },
    });

    return {
      message: 'Bank hesabı məlumatları uğurla saxlanıldı',
      bankAccount: bankAccount,
    };
  }

  async getBankAccount(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        role: true,
        bankAccount: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'TEACHER') {
      throw new BadRequestException(
        'Yalnız müəllimlər bank hesabı məlumatlarını görə bilər',
      );
    }

    if (!user.bankAccount) {
      return {
        bankAccount: null,
        message: 'Bank hesabı məlumatları əlavə edilməyib',
      };
    }

    try {
      const bankAccount = JSON.parse(user.bankAccount);
      return {
        bankAccount: bankAccount,
      };
    } catch (error) {
      return {
        bankAccount: null,
        message: 'Bank hesabı məlumatları düzgün formatda deyil',
      };
    }
  }
}
