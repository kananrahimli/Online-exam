import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus, ExamAttemptStatus } from '@prisma/client';
import { PayriffService } from './payriff.service';
import { PRIZE_CONFIG, PAYMENT_CONFIG } from '../config/prizes.config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

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

    // Calculate price based on duration
    const amount = this.calculateExamPrice(exam.duration);

    // Create payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId,
        amount,
        status: PaymentStatus.PENDING,
        transactionId: `${PAYMENT_CONFIG.transactionIdPrefixes.EXAM}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      const isPaid = this.isPayriffPaymentSuccessful(orderInfo);

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
      await this.completePayriffOrderSafely(payment.payriffOrderId, amount);

      // Process payment in transaction
      return await this.prisma.$transaction(async (tx) => {
        // If this is a balance payment (no examId), process it directly
        if (!payment.examId) {
          return await this.processBalancePayment(
            tx,
            payment,
            paymentId,
            orderInfo,
            amount,
          );
        }

        // If this is an exam payment, handle exam attempt and split payment
        if (!payment.exam) {
          throw new NotFoundException('İmtahan tapılmadı');
        }

        return await this.processExamPayment(
          tx,
          payment,
          paymentId,
          orderInfo,
          payment.attempt,
        );
      });
    }

    throw new BadRequestException('Ödəniş tamamlanmayıb');
  }

  /**
   * Wrapper for splitPaymentForExam that handles transaction
   * Used when called outside of existing transaction
   */
  private async splitPaymentForExamWrapper(
    paymentId: string,
    amount: number,
    teacherId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.splitPaymentForExam(tx, paymentId, amount, teacherId);
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
    const isPaid = this.isPayriffPaymentSuccessful(orderInfo);

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
      await this.completePayriffOrderSafely(finalOrderId, amount);

      // Process payment in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // If this is a balance payment
        if (!payment.examId) {
          const processResult = await this.processBalancePayment(
            tx,
            payment,
            payment.id,
            orderInfo,
            amount,
          );
          return {
            ...processResult,
            redirectUrl: `${frontendUrl}/profile?payment=success&paymentId=${payment.id}`,
          };
        }

        // If this is an exam payment
        if (payment.exam) {
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + payment.exam.duration);

          let attempt = payment.attempt;
          if (!attempt) {
            attempt = await tx.examAttempt.create({
              data: {
                examId: payment.examId,
                studentId: payment.studentId,
                expiresAt,
                status: ExamAttemptStatus.IN_PROGRESS,
              },
            });
          }

          const finalAmount =
            payment.amount || this.calculateExamPrice(payment.exam.duration);

          await this.completePayriffOrderSafely(finalOrderId, finalAmount);

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.COMPLETED,
              payriffTransactionId:
                orderInfo.payload.transactions?.[0]?.uuid || null,
              attemptId: attempt.id,
              amount: finalAmount,
            },
          });

          // Split payment
          await this.splitPaymentForExam(
            tx,
            payment.id,
            finalAmount,
            payment.exam.teacherId,
          );

          return {
            redirectUrl: `${frontendUrl}/payments/success/${payment.id}`,
            message: 'Ödəniş uğurlu',
            attemptId: attempt.id,
          };
        }

        return null;
      });

      if (result) {
        return result;
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
        transactionId: `${PAYMENT_CONFIG.transactionIdPrefixes.BALANCE}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  /**
   * Calculates exam price based on duration
   */
  calculateExamPrice(duration: number): number {
    return PRIZE_CONFIG.examPrices[duration] || PRIZE_CONFIG.defaultExamPrice;
  }

  /**
   * Deducts exam price from student balance and creates payment record
   */
  async deductExamPayment(
    studentId: string,
    examId: string,
    attemptId: string,
    examPrice: number,
    teacherId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Deduct from balance
      await tx.user.update({
        where: { id: studentId },
        data: {
          balance: {
            decrement: examPrice,
          },
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          studentId,
          examId,
          attemptId,
          amount: examPrice,
          status: PaymentStatus.COMPLETED,
          transactionId: `${PAYMENT_CONFIG.transactionIdPrefixes.BALANCE_DEDUCTION}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      // Split payment between teacher and admin
      await this.splitPaymentForExam(tx, payment.id, examPrice, teacherId);
    });

    this.logger.log(
      `Deducted ${examPrice} AZN from student ${studentId} for exam ${examId}`,
    );
  }

  /**
   * Awards prize to student
   */
  async awardPrize(
    studentId: string,
    examId: string,
    amount: number,
    position: number,
  ): Promise<void> {
    // Generate unique transaction ID
    const transactionId = `${PAYMENT_CONFIG.transactionIdPrefixes.PRIZE}${position}-${examId}-${studentId.substring(0, 8)}-${Date.now()}`;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Update student balance
        await tx.user.update({
          where: { id: studentId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        // Create payment record for prize
        await tx.payment.create({
          data: {
            studentId,
            examId,
            amount,
            status: PaymentStatus.COMPLETED,
            transactionId,
          },
        });
      });

      this.logger.log(
        `Awarded ${amount} AZN prize (position ${position}) to student ${studentId} for exam ${examId}`,
      );
    } catch (error: any) {
      // Handle duplicate key errors
      if (error.code === 'P2002') {
        // P2002 is Prisma's unique constraint violation error
        const target = error.meta?.target;

        if (target?.includes('transactionId')) {
          this.logger.warn(
            `Transaction ID conflict for student ${studentId}, exam ${examId}. Retrying...`,
          );
          // Could retry with new transactionId if needed
          return;
        }

        if (target?.includes('unique_prize_payment')) {
          this.logger.warn(
            `Prize already awarded to student ${studentId} for exam ${examId}`,
          );
          return;
        }
      }

      // Re-throw other errors
      this.logger.error(
        `Failed to award prize to student ${studentId} for exam ${examId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Checks if PayRiff payment is successful
   */
  private isPayriffPaymentSuccessful(orderInfo: any): boolean {
    const paymentStatus = orderInfo.payload.paymentStatus?.toUpperCase();
    return (
      paymentStatus === PAYMENT_CONFIG.payriffStatuses.APPROVED ||
      paymentStatus === PAYMENT_CONFIG.payriffStatuses.PAID ||
      paymentStatus === PAYMENT_CONFIG.payriffStatuses.COMPLETED
    );
  }

  /**
   * Safely completes PayRiff order with error handling
   * Complete endpoint is optional - log error but continue
   */
  private async completePayriffOrderSafely(
    orderId: string,
    amount: number,
  ): Promise<void> {
    try {
      await this.payriffService.completeOrder(orderId, amount);
    } catch (error: any) {
      // Complete endpoint-i opsional ola bilər - xəta varsa log edək amma davam edək
      this.logger.warn(
        `PayRiff complete endpoint xətası (orderId: ${orderId}): ${error.message}`,
      );
      // Davam edirik çünki ödəniş artıq APPROVED-dir
    }
  }

  /**
   * Processes balance payment (no examId)
   */
  private async processBalancePayment(
    tx: any,
    payment: any,
    paymentId: string,
    orderInfo: any,
    amount: number,
  ) {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        payriffTransactionId: orderInfo.payload.transactions[0]?.uuid || null,
      },
    });

    await tx.user.update({
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

  /**
   * Processes exam payment with attempt creation and split
   */
  private async processExamPayment(
    tx: any,
    payment: any,
    paymentId: string,
    orderInfo: any,
    existingAttempt: any,
  ) {
    // Calculate expiry date (exam duration from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + payment.exam.duration);

    // Create exam attempt if not exists
    let attempt = existingAttempt;
    if (!attempt) {
      attempt = await tx.examAttempt.create({
        data: {
          examId: payment.examId,
          studentId: payment.studentId,
          expiresAt,
          status: ExamAttemptStatus.IN_PROGRESS,
        },
      });
    }

    // Calculate price if not set
    const finalAmount =
      payment.amount || this.calculateExamPrice(payment.exam.duration);

    // Complete order in PayRiff
    await this.completePayriffOrderSafely(payment.payriffOrderId, finalAmount);

    // Update payment
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        amount: finalAmount,
        payriffTransactionId: orderInfo.payload.transactions[0]?.uuid || null,
        attemptId: attempt.id,
      },
    });

    // Split payment between teacher and admin
    await this.splitPaymentForExam(
      tx,
      paymentId,
      finalAmount,
      payment.exam.teacherId,
    );

    return {
      message: 'Ödəniş uğurlu',
      attemptId: attempt.id,
    };
  }

  /**
   * Splits payment between teacher and admin for exam payments (uses PRIZE_CONFIG)
   */
  private async splitPaymentForExam(
    tx: any,
    paymentId: string,
    amount: number,
    teacherId: string,
  ): Promise<void> {
    const teacherAmount = amount * (PRIZE_CONFIG.teacherSplitPercentage / 100);
    const adminAmount = amount * (PRIZE_CONFIG.adminSplitPercentage / 100);

    // Get admin user
    const admin = await tx.user.findFirst({
      where: { role: 'ADMIN' },
    });

    // Create payment splits
    await tx.paymentSplit.createMany({
      data: [
        {
          paymentId,
          teacherId,
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
    await tx.user.update({
      where: { id: teacherId },
      data: {
        teacherBalance: {
          increment: teacherAmount,
        },
      },
    });
  }

  /**
   * Gets existing prize payments for students and exams
   */
  async getExistingPrizes(
    studentIds: string[],
    examIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const existingPrizes = await this.prisma.payment.findMany({
      where: {
        studentId: { in: studentIds },
        examId: { in: examIds },
        transactionId: {
          startsWith: PAYMENT_CONFIG.transactionIdPrefixes.PRIZE,
        },
      },
      select: {
        studentId: true,
        examId: true,
      },
    });

    // Create map: examId -> Set of studentIds who received prizes
    const prizeMap = new Map<string, Set<string>>();

    existingPrizes.forEach((prize) => {
      if (!prizeMap.has(prize.examId)) {
        prizeMap.set(prize.examId, new Set());
      }
      prizeMap.get(prize.examId)!.add(prize.studentId);
    });

    return prizeMap;
  }

  /**
   * Counts prize payments for an exam
   */
  async countExamPrizes(examId: string): Promise<number> {
    return this.prisma.payment.count({
      where: {
        examId,
        transactionId: {
          startsWith: PAYMENT_CONFIG.transactionIdPrefixes.PRIZE,
        },
      },
    });
  }
}
