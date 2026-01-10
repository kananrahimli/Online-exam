import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus, ExamAttemptStatus } from '@prisma/client';
import { PayriffService } from './payriff.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private payriffService: PayriffService,
    private configService: ConfigService,
  ) {}

  async create(studentId: string, createPaymentDto: CreatePaymentDto) {
    const { examId } = createPaymentDto;

    // Check if exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        teacher: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    // Check if already paid
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        studentId,
        examId,
        status: PaymentStatus.COMPLETED,
      },
      include: {
        attempt: true,
      },
    });

    if (existingPayment && existingPayment.attempt) {
      throw new BadRequestException('Bu imtahana artıq çıxışınız var');
    }

    // Calculate price based on duration (fixed pricing)
    let amount = 3; // default 1 saat
    if (exam.duration === 60) amount = 3;
    else if (exam.duration === 120) amount = 5;
    else if (exam.duration === 180) amount = 10;

    // Create payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId,
        amount,
        status: PaymentStatus.PENDING,
        transactionId: `EXAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // Create PayRiff order
    const baseUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    // Callback URL: Backend endpoint (PayRiff bura çağıracaq)
    const callbackUrl = `${baseUrl}/payments/callback?paymentId=${payment.id}`;

    const payriffResponse = await this.payriffService.createOrder({
      amount: amount,
      language: 'AZ',
      currency: 'AZN',
      description: `İmtahan ödənişi - ${exam.title}`,
      callbackUrl: callbackUrl,
      cardSave: false,
      operation: 'PURCHASE',
    });

    // Update payment with PayRiff order ID
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        payriffOrderId: payriffResponse.payload.orderId,
        payriffTransactionId:
          payriffResponse.payload.transactionId?.toString() || null,
      },
    });

    return {
      paymentId: payment.id,
      amount,
      paymentUrl: payriffResponse.payload.paymentUrl,
      orderId: payriffResponse.payload.orderId,
      message: 'Ödəniş yaradıldı. Zəhmət olmasa ödənişi tamamlayın.',
    };
  }

  /**
   * Verify payment status from PayRiff
   * This method is called either:
   * 1. By PayRiff callback with paymentId
   * 2. Manually via GET/POST /verify/{paymentId}
   */
  async verifyPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        exam: {
          include: {
            teacher: true,
          },
        },
        attempt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        message: 'Ödəniş artıq emal olunub',
        attemptId: payment.attemptId,
        payment: payment,
      };
    }

    // If payment is pending, check PayRiff status
    if (payment.status === PaymentStatus.PENDING) {
      if (!payment.payriffOrderId) {
        throw new BadRequestException('PayRiff order ID tapılmadı');
      }

      // Get order info from PayRiff
      const orderInfo = await this.payriffService.getOrderInfo(
        payment.payriffOrderId,
      );

      // Check if payment is successful using PayRiff v3 API
      const paymentStatus = orderInfo.payload.paymentStatus?.toUpperCase();
      const isPaid =
        paymentStatus === 'APPROVED' || // PayRiff v3 uses APPROVED for paid status
        paymentStatus === 'PAID' ||
        paymentStatus === 'COMPLETED';

      if (!isPaid) {
        // Update payment status to failed
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
          },
        });

        throw new BadRequestException('Ödəniş uğursuz oldu');
      }

      // Payment is successful, process it
      const amount = payment.amount || 0;

      // Complete order in PayRiff (rəsmi tamamlama)
      try {
        await this.payriffService.completeOrder(payment.payriffOrderId, amount);
      } catch (error: any) {
        // Complete endpoint-i opsional ola bilər - xəta varsa log edək amma davam edək
        console.warn(
          `PayRiff complete endpoint xətası (orderId: ${payment.payriffOrderId}):`,
          error.message,
        );
        // Davam edirik çünki ödəniş artıq APPROVED-dir
      }

      // If this is a balance payment (no examId), process it directly
      if (!payment.examId) {
        // Update payment status to completed
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
            payriffTransactionId:
              orderInfo.payload.transactions[0]?.uuid || null,
          },
        });

        // Add amount to student balance
        await this.prisma.user.update({
          where: { id: payment.studentId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        return {
          message: 'Ödəniş uğurlu. Balansınız artırıldı.',
          payment: payment,
        };
      }

      // If this is an exam payment, handle exam attempt and split payment
      if (!payment.exam) {
        throw new NotFoundException('İmtahan tapılmadı');
      }

      // Calculate expiry date (exam duration from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + payment.exam.duration);

      // Create exam attempt if not exists
      let attempt = payment.attempt;
      if (!attempt) {
        attempt = await this.prisma.examAttempt.create({
          data: {
            examId: payment.examId,
            studentId: payment.studentId,
            expiresAt,
            status: ExamAttemptStatus.IN_PROGRESS,
          },
        });
      }

      // Calculate price if not set (fixed pricing)
      let finalAmount = payment.amount || 3; // default 1 saat
      if (!payment.amount) {
        if (payment.exam.duration === 60) finalAmount = 3;
        else if (payment.exam.duration === 120) finalAmount = 5;
        else if (payment.exam.duration === 180) finalAmount = 10;
      }

      // Complete order in PayRiff for exam payment (rəsmi tamamlama)
      try {
        await this.payriffService.completeOrder(
          payment.payriffOrderId,
          finalAmount,
        );
      } catch (error: any) {
        // Complete endpoint-i opsional ola bilər - xəta varsa log edək amma davam edək
        console.warn(
          `PayRiff complete endpoint xətası (orderId: ${payment.payriffOrderId}):`,
          error.message,
        );
        // Davam edirik çünki ödəniş artıq APPROVED-dir
      }

      // Update payment
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          amount: finalAmount,
          payriffTransactionId: orderInfo.payload.transactions[0]?.uuid || null,
          attemptId: attempt.id,
        },
      });

      // Split payment between teacher and admin (50/50)
      await this.splitPayment(paymentId, finalAmount, payment.exam.teacherId);

      return {
        message: 'Ödəniş uğurlu',
        attemptId: attempt.id,
      };
    }

    throw new BadRequestException('Ödəniş tamamlanmayıb');
  }

  private async splitPayment(
    paymentId: string,
    amount: number,
    teacherId: string,
  ) {
    // Split 50/50 between teacher and admin
    const teacherAmount = amount / 2;
    const adminAmount = amount / 2;

    // Get admin user
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    // Create payment splits
    await this.prisma.paymentSplit.createMany({
      data: [
        {
          paymentId,
          teacherId: teacherId,
          amount: teacherAmount,
        },
        {
          paymentId,
          adminId: admin?.id || null,
          amount: adminAmount,
        },
      ],
    });

    // Update teacher balance
    await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        teacherBalance: {
          increment: teacherAmount,
        },
      },
    });
  }

  /**
   * Handle PayRiff callback
   * This method verifies payment and returns redirect URL for frontend
   */
  async handleCallback(orderId: string, paymentId?: string) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Find payment by order ID or payment ID
    const payment = await this.prisma.payment.findFirst({
      where: paymentId ? { id: paymentId } : { payriffOrderId: orderId },
      include: {
        exam: {
          include: {
            teacher: true,
          },
        },
        attempt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }

    // Get orderId from payment if not provided
    const finalOrderId = orderId || payment.payriffOrderId;
    if (!finalOrderId) {
      throw new BadRequestException('PayRiff order ID tapılmadı');
    }

    // Get order info from PayRiff
    const orderInfo = await this.payriffService.getOrderInfo(finalOrderId);

    // Check payment status using PayRiff v3 API
    const paymentStatus = orderInfo.payload.paymentStatus?.toUpperCase();
    const isPaid =
      paymentStatus === 'APPROVED' || // PayRiff v3 uses APPROVED for paid status
      paymentStatus === 'PAID' ||
      paymentStatus === 'COMPLETED';

    // If already processed, redirect to success
    if (payment.status === PaymentStatus.COMPLETED) {
      if (!payment.examId) {
        // Balance payment success
        return {
          redirectUrl: `${frontendUrl}/profile?payment=success&paymentId=${payment.id}`,
        };
      } else {
        // Exam payment success
        return {
          redirectUrl: `${frontendUrl}/payments/success/${payment.id}`,
        };
      }
    }

    if (isPaid) {
      const amount = payment.amount || 0;

      // Complete order in PayRiff (rəsmi tamamlama)
      try {
        await this.payriffService.completeOrder(finalOrderId, amount);
      } catch (error: any) {
        // Complete endpoint-i opsional ola bilər - xəta varsa log edək amma davam edək
        console.warn(
          `PayRiff complete endpoint xətası (orderId: ${finalOrderId}):`,
          error.message,
        );
        // Davam edirik çünki ödəniş artıq APPROVED-dir
      }

      // If this is a balance payment
      if (!payment.examId) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            payriffTransactionId:
              orderInfo.payload.transactions?.[0]?.uuid || null,
          },
        });

        await this.prisma.user.update({
          where: { id: payment.studentId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        // Redirect to success page
        return {
          redirectUrl: `${frontendUrl}/profile?payment=success&paymentId=${payment.id}`,
          message: 'Ödəniş uğurlu. Balansınız artırıldı.',
        };
      }

      // If this is an exam payment
      if (payment.exam) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + payment.exam.duration);

        let attempt = payment.attempt;
        if (!attempt) {
          attempt = await this.prisma.examAttempt.create({
            data: {
              examId: payment.examId,
              studentId: payment.studentId,
              expiresAt,
              status: ExamAttemptStatus.IN_PROGRESS,
            },
          });
        }

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            payriffTransactionId:
              orderInfo.payload.transactions?.[0]?.uuid || null,
            attemptId: attempt.id,
          },
        });

        // Split payment
        await this.splitPayment(payment.id, amount, payment.exam.teacherId);

        // Redirect to success page
        return {
          redirectUrl: `${frontendUrl}/payments/success/${payment.id}`,
          message: 'Ödəniş uğurlu',
          attemptId: attempt.id,
        };
      }
    } else {
      // Payment failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      // Redirect to cancel/fail page
      return {
        redirectUrl: `${frontendUrl}/payments/cancel/${payment.id}`,
        message: 'Ödəniş uğursuz oldu',
      };
    }
  }

  async cancelPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    return { message: 'Ödəniş ləğv edildi' };
  }

  async addBalance(studentId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'STUDENT') {
      throw new BadRequestException('Yalnız şagirdlər balans artıra bilər');
    }

    if (amount <= 0) {
      throw new BadRequestException('Məbləğ müsbət olmalıdır');
    }

    // Create payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId: null, // Balans artırma konkret imtahana bağlı deyil
        amount,
        status: PaymentStatus.PENDING,
        transactionId: `BAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // Create PayRiff order
    const baseUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    // Callback URL: Backend endpoint (PayRiff bura çağıracaq)
    const callbackUrl = `${baseUrl}/payments/callback?paymentId=${payment.id}`;

    const payriffResponse = await this.payriffService.createOrder({
      amount: amount,
      language: 'AZ',
      currency: 'AZN',
      description: `Balans artırma - ${amount} AZN`,
      callbackUrl: callbackUrl,
      cardSave: false,
      operation: 'PURCHASE',
    });

    // Update payment with PayRiff order ID
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        payriffOrderId: payriffResponse.payload.orderId,
        payriffTransactionId:
          payriffResponse.payload.transactionId?.toString() || null,
      },
    });

    return {
      paymentId: payment.id,
      amount,
      paymentUrl: payriffResponse.payload.paymentUrl,
      orderId: payriffResponse.payload.orderId,
      message: 'Ödəniş yaradıldı. Zəhmət olmasa ödənişi tamamlayın.',
    };
  }

  async getTeacherBalance(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        teacherBalance: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'TEACHER') {
      throw new BadRequestException('Yalnız müəllimlər balans görə bilər');
    }

    return {
      balance: user.teacherBalance,
    };
  }

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
        status: 'PROCESSING',
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
          status: 'COMPLETED',
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
          status: 'FAILED',
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

    if (withdrawal.status !== 'PENDING') {
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
        status: 'PROCESSING',
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
        status: 'COMPLETED',
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
