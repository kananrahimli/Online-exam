import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus, ExamAttemptStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(studentId: string, createPaymentDto: CreatePaymentDto) {
    const { examId } = createPaymentDto;

    // Check if exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
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

    // Calculate expiry date (exam duration from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + exam.duration);

    // Create exam attempt directly (payment simulation - auto-approved)
    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId,
        studentId,
        expiresAt,
        status: ExamAttemptStatus.IN_PROGRESS,
      },
    });

    // Create payment record (marked as completed for record keeping)
    // Calculate price based on duration (fixed pricing)
    let amount = 3; // default 1 saat
    if (exam.duration === 60) amount = 3;
    else if (exam.duration === 120) amount = 5;
    else if (exam.duration === 180) amount = 10;

    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId,
        attemptId: attempt.id,
        amount,
        status: PaymentStatus.COMPLETED,
        transactionId: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // Ödəniş uğurlu olduqdan sonra balansa əlavə et
    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    return {
      paymentId: payment.id,
      attemptId: attempt.id,
      message: 'Ödəniş uğurla tamamlandı',
    };
  }

  async verifyPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        exam: true,
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

    // If payment is pending, mark as completed
    if (payment.status === PaymentStatus.PENDING) {
      const amount = payment.amount || 0;

      // If this is a balance payment (no examId), process it directly
      if (!payment.examId) {
        // Update payment status to completed
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
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

      // If this is an exam payment, handle exam attempt
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

      // Update payment
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          amount: finalAmount,
          transactionId:
            payment.transactionId ||
            `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          attemptId: attempt.id,
        },
      });

      // Ödəniş uğurlu olduqdan sonra balansa əlavə et
      await this.prisma.user.update({
        where: { id: payment.studentId },
        data: {
          balance: {
            increment: finalAmount,
          },
        },
      });

      return {
        message: 'Ödəniş uğurlu',
        attemptId: attempt.id,
      };
    }

    throw new BadRequestException('Ödəniş tamamlanmayıb');
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

    // Create payment record with PENDING status (examId is null for balance top-ups)
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId: null, // Balans artırma konkret imtahana bağlı deyil
        amount,
        status: PaymentStatus.PENDING,
        transactionId: `BAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // Return payment ID - frontend will verify payment
    return {
      paymentId: payment.id,
      amount,
      message: 'Ödəniş yaradıldı. Zəhmət olmasa ödənişi tamamlayın.',
    };
  }
}
