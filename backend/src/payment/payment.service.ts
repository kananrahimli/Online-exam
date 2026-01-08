import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentStatus,
  ExamAttemptStatus,
  WithdrawalStatus,
  UserRole,
} from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY tapılmadı. Stripe funksiyaları işləməyəcək.',
      );
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
      });
    }
  }

  /**
   * Stripe checkout session yaradır
   */
  async createCheckoutSession(
    studentId: string,
    amount: number,
    examId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role !== 'STUDENT') {
      throw new BadRequestException('Yalnız şagirdlər ödəniş edə bilər');
    }

    if (amount <= 0) {
      throw new BadRequestException('Məbləğ müsbət olmalıdır');
    }

    // ✅ YENİ: İmtahan varsa, müəllimi tap
    let teacher = null;
    let exam = null;

    if (examId) {
      exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: { teacher: true },
      });

      if (!exam) {
        throw new NotFoundException('İmtahan tapılmadı');
      }

      teacher = exam.teacher;

      this.logger.log(`İmtahan: ${exam.title}`);
      this.logger.log(`Müəllim: ${teacher.email}`);
      this.logger.log(`Stripe Account: ${teacher.stripeAccountId || 'YOX'}`);
    }

    // Ödəniş qeydini yarat (PENDING status ilə)
    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        examId: examId || null,
        amount,
        status: PaymentStatus.PENDING,
        transactionId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    if (!this.stripe) {
      throw new BadRequestException('Stripe konfiqurasiya edilməyib');
    }

    // Admin-i tap (balans artırma üçün və ya imtahan ödənişi üçün)
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (!admin?.stripeAccountId) {
      throw new BadRequestException(
        'Admin-in Stripe hesabı yoxdur. Zəhmət olmasa admin-in Stripe hesabını yaradın.',
      );
    }

    // Checkout session parametrləri
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'azn',
            product_data: {
              name: examId ? `İmtahan: ${exam?.title}` : 'Balans artırma',
              description: examId
                ? `${exam?.duration} dəqiqəlik imtahan`
                : 'Balans artırma üçün ödəniş',
            },
            unit_amount: Math.round(amount * 100), // AZN-dən qəpikə
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${this.configService.get<string>('FRONTEND_URL')}/payments/success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment.id}`,
      cancel_url: `${this.configService.get<string>('FRONTEND_URL')}/payments/cancel?payment_id=${payment.id}`,
      metadata: {
        paymentId: payment.id,
        studentId,
        examId: examId || '',
        amount: amount.toString(),
      },
      customer_email: user.email,
    };

    // ✅ YENİ: Balans artırma zamanı pul admin-in Stripe account-una köçürülür
    if (!examId) {
      // Balans artırma - pul admin-in account-una köçürülür
      sessionParams.payment_intent_data = {
        on_behalf_of: admin.stripeAccountId,
        transfer_data: {
          destination: admin.stripeAccountId,
        },
        description: 'Balans artırma',
        metadata: {
          adminId: admin.id,
          adminEmail: admin.email,
          type: 'balance_topup',
        },
      };

      this.logger.log(
        `✅ Balans artırma - pul admin-in Stripe account-una köçürülür: ${admin.stripeAccountId}`,
      );
    } else if (teacher?.stripeAccountId) {
      // İmtahan ödənişi - 50/50 bölgü (admin və müəllim)
      const platformFee = Math.round(amount * 100 * 0.5); // 50% admin-ə (qəpiklə)

      sessionParams.payment_intent_data = {
        application_fee_amount: platformFee,
        on_behalf_of: admin.stripeAccountId,
        transfer_data: {
          destination: teacher.stripeAccountId,
        },
        description: `İmtahan ödənişi: ${exam?.title}`,
        metadata: {
          teacherId: teacher.id,
          teacherEmail: teacher.email,
          adminId: admin.id,
          adminEmail: admin.email,
          examId: examId,
        },
      };

      this.logger.log(`✅ 50/50 bölgü aktivləşdirildi`);
      this.logger.log(`   Admin: ${amount * 0.5} AZN`);
      this.logger.log(`   Müəllim: ${amount * 0.5} AZN`);
      this.logger.log(`   Admin Account: ${admin.stripeAccountId}`);
      this.logger.log(`   Müəllim Account: ${teacher.stripeAccountId}`);
    } else {
      // İmtahan ödənişi, amma müəllimin Stripe hesabı yoxdur - pul admin-in account-una köçürülür
      sessionParams.payment_intent_data = {
        on_behalf_of: admin.stripeAccountId,
        transfer_data: {
          destination: admin.stripeAccountId,
        },
        description: `İmtahan ödənişi: ${exam?.title}`,
        metadata: {
          adminId: admin.id,
          adminEmail: admin.email,
          examId: examId,
          teacherId: teacher?.id || '',
          type: 'exam_payment_no_teacher_account',
        },
      };

      this.logger.warn(
        `⚠️ Müəllimin Stripe hesabı yoxdur - pul admin-in account-una köçürülür`,
      );
    }

    // Stripe checkout session yarat
    const session = await this.stripe.checkout.sessions.create(sessionParams);

    // Payment qeydində stripe session ID-ni saxla
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentId: session.id,
      },
    });

    this.logger.log(`✅ Checkout session yaradıldı: ${session.id}`);

    return {
      sessionId: session.id,
      url: session.url,
      paymentId: payment.id,
    };
  }

  /**
   * Balans artırma üçün checkout session
   */
  async addBalance(studentId: string, amount: number) {
    return this.createCheckoutSession(studentId, amount);
  }

  /**
   * Balansdan çıxış və müəllim/admin-ə paylama (İmtahana başlayanda)
   * Yalnız database balansını artırır - Stripe transfer YOXDUR
   * Stripe transfer-lər withdrawal zamanı edilir
   *
   * Əgər hər hansı xəta baş verərsə, bütün dəyişikliklər transaction rollback olunur
   */
  async deductFromBalanceForExam(
    studentId: string,
    examId: string,
    attemptId: string,
  ) {
    // İmtahanı tap (transaction-dan əvvəl)
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        teacher: true,
      },
    });

    if (!exam) {
      this.logger.error(`İmtahan tapılmadı: ${examId}`);
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (!exam.teacher) {
      this.logger.error(`İmtahanın müəllimi tapılmadı: ${examId}`);
      throw new NotFoundException('İmtahanın müəllimi tapılmadı');
    }

    // Qiyməti hesabla
    let amount = 3; // default 1 saat
    if (exam.duration === 60) amount = 3;
    else if (exam.duration === 120) amount = 5;
    else if (exam.duration === 180) amount = 10;

    // Müəllim və admin paylarını hesabla (50/50)
    const teacherAmount = amount * 0.5;
    const adminAmount = amount * 0.5;

    // Admin-i tap (transaction-dan əvvəl)
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    // Şagirdin balansını yoxla (transaction-dan əvvəl)
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        balance: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Şagird tapılmadı');
    }

    if (student.balance < amount) {
      throw new BadRequestException(
        `Balansınız kifayət etmir. İmtahan qiyməti: ${amount} AZN. Balansınız: ${student.balance.toFixed(2)} AZN`,
      );
    }

    this.logger.log(
      `Balansdan çıxış: ${amount} AZN (Müəllim: ${teacherAmount} AZN, Admin: ${adminAmount} AZN)`,
    );

    // Transaction - əgər hər hansı xəta baş verərsə, bütün dəyişikliklər rollback olunur
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Şagirdin balansından çıx
          await tx.user.update({
            where: { id: studentId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });

          // Payment qeydini yarat (COMPLETED status ilə - çünki balansdan çıxıldı)
          const payment = await tx.payment.create({
            data: {
              studentId,
              examId,
              attemptId,
              amount,
              teacherAmount,
              adminAmount,
              teacherId: exam.teacherId,
              status: PaymentStatus.COMPLETED,
              transactionId: `BAL-DED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
          });

          // Müəllim database balansını artır
          await tx.user.update({
            where: { id: exam.teacherId },
            data: {
              teacherBalance: {
                increment: teacherAmount,
              },
            },
          });

          // Admin database balansını artır
          if (admin) {
            await tx.user.update({
              where: { id: admin.id },
              data: {
                adminBalance: {
                  increment: adminAmount,
                },
              },
            });
          }

          this.logger.log(
            `✅ Database balansları artırıldı: Müəllim=${teacherAmount} AZN, Admin=${adminAmount} AZN`,
          );

          return payment;
        },
        {
          maxWait: 5000, // 5 saniyə gözlə
          timeout: 10000, // 10 saniyə timeout
        },
      );
    } catch (error: any) {
      // Transaction-da xəta baş verərsə, bütün dəyişikliklər avtomatik rollback olunur
      this.logger.error(
        `deductFromBalanceForExam xətası (studentId: ${studentId}, examId: ${examId}, attemptId: ${attemptId}): ${error.message}`,
        error.stack,
      );

      // Xəta növünə görə müxtəlif mesajlar
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error; // Artıq düzgün exception, yenidən throw et
      }

      // Database constraint xətaları
      if (
        error.code === 'P2002' || // Unique constraint
        error.code === 'P2003' || // Foreign key constraint
        error.code === 'P2025' // Record not found
      ) {
        throw new BadRequestException(
          `Database xətası: ${error.meta?.target || error.message}`,
        );
      }

      // Balansla bağlı xətalar
      if (
        error.message?.includes('balance') ||
        error.message?.includes('insufficient') ||
        error.message?.includes('decrement')
      ) {
        throw new BadRequestException(
          `Balans kifayət etmir və ya balans yenilənmədi: ${error.message}`,
        );
      }

      // Ümumi xəta
      throw new BadRequestException(
        `Ödəniş zamanı xəta baş verdi: ${error.message || 'Naməlum xəta'}`,
      );
    }
  }

  /**
   * Stripe webhook handler
   */
  async handleStripeWebhook(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.metadata?.paymentId) {
        this.logger.error('Payment ID metadata tapılmadı');
        return;
      }

      const paymentId = session.metadata.paymentId;
      await this.completePayment(paymentId, session.id);
    }
  }

  /**
   * Ödənişi tamamla
   */
  /**
   * Ödənişi tamamla (YENİLƏNMİŞ VERSİYA - Stripe Connect ilə)
   *
   * Bu metodu payment.service.ts faylınızda MÖVCUD completePayment metodunun
   * ÜZƏRİNƏ YAZIN
   */
  async completePayment(paymentId: string, stripeSessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          exam: {
            include: {
              teacher: true,
            },
          },
          student: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Ödəniş tapılmadı');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        this.logger.warn(`Ödəniş ${paymentId} artıq tamamlanıb`);
        return payment;
      }

      const amount = payment.amount;
      const teacherAmount = payment.examId ? amount * 0.5 : null; // 50% müəllimə
      const adminAmount = payment.examId ? amount * 0.5 : null; // 50% adminə

      // Admin-i tap
      const admin = await tx.user.findFirst({
        where: { role: UserRole.ADMIN },
      });

      // Ödəniş statusunu yenilə
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          stripePaymentId: stripeSessionId,
          teacherAmount,
          adminAmount,
          teacherId: payment.exam?.teacherId || null,
        },
      });

      // Şagirdin balansını artır
      await tx.user.update({
        where: { id: payment.studentId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // İmtahan ödənişidirsə - yalnız database balansını artırırıq
      // Stripe transfer-lər withdrawal zamanı edilir
      if (payment.examId && payment.exam && teacherAmount && adminAmount) {
        // Müəllim database balansını artır
        await tx.user.update({
          where: { id: payment.exam.teacherId },
          data: {
            teacherBalance: {
              increment: teacherAmount,
            },
          },
        });

        // Admin database balansını artır
        if (admin) {
          await tx.user.update({
            where: { id: admin.id },
            data: {
              adminBalance: {
                increment: adminAmount,
              },
            },
          });
        }

        this.logger.log(
          `✅ Database balansları artırıldı: Müəllim=${teacherAmount} AZN, Admin=${adminAmount} AZN`,
        );
      }
      // Balans artırma halında yalnız şagird balansı artırılır

      // İmtahan ödənişidirsə, attempt yarat
      if (payment.examId && !payment.attemptId) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + payment.exam!.duration);

        const attempt = await tx.examAttempt.create({
          data: {
            examId: payment.examId,
            studentId: payment.studentId,
            expiresAt,
            status: ExamAttemptStatus.IN_PROGRESS,
          },
        });

        // Attempt ID-ni payment-ə əlavə et
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            attemptId: attempt.id,
          },
        });

        updatedPayment.attemptId = attempt.id;
      }

      return updatedPayment;
    });
  }

  /**
   * Ödənişi təsdiqlə (frontend üçün)
   */
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

    // Stripe session-u yoxla
    if (payment.stripePaymentId && this.stripe) {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(
          payment.stripePaymentId,
        );

        if (session.payment_status === 'paid') {
          await this.completePayment(paymentId, payment.stripePaymentId);
          return {
            message: 'Ödəniş uğurlu',
            payment: await this.prisma.payment.findUnique({
              where: { id: paymentId },
            }),
          };
        }
      } catch (error) {
        this.logger.error('Stripe session yoxlanılarkən xəta:', error);
      }
    }

    throw new BadRequestException('Ödəniş tamamlanmayıb');
  }

  /**
   * Ödənişi ləğv et
   */
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

  /**
   * Müəllim pul çıxarışı
   * Database balansından çıxır və real Stripe transfer edir
   */
  async withdrawTeacher(
    userId: string,
    amount: number,
    bankAccount?: string,
    bankName?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        teacherBalance: true,
        adminBalance: true,
        stripeAccountId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    // ✅ TƏHLÜKƏSİZLİK: Yalnız müəllimlər bu funksiyadan istifadə edə bilər
    if (user.role !== UserRole.TEACHER) {
      this.logger.warn(
        `❌ Təhlükəsizlik: Müəllim olmayan istifadəçi withdrawal cəhdi: userId=${userId}, role=${user.role}`,
      );
      throw new BadRequestException('Yalnız müəllimlər pul çıxara bilər');
    }

    if (amount <= 0) {
      throw new BadRequestException('Məbləğ müsbət olmalıdır');
    }

    // ✅ TƏHLÜKƏSİZLİK: Müəllim yalnız öz teacherBalance-dən çıxara bilər
    if (user.teacherBalance < amount) {
      this.logger.warn(
        `❌ Təhlükəsizlik: Müəllimin kifayət qədər balansı yoxdur: userId=${userId}, teacherBalance=${user.teacherBalance}, amount=${amount}`,
      );
      throw new BadRequestException(
        `Kifayət qədər balans yoxdur. Müəllim balansınız: ${user.teacherBalance.toFixed(2)} AZN`,
      );
    }

    // ✅ TƏHLÜKƏSİZLİK: Müəllim admin balansından çıxara bilməz
    // Bu yoxlama artıq yuxarıda edildi (role !== TEACHER), amma əlavə təhlükəsizlik üçün
    if (user.adminBalance > 0) {
      this.logger.log(
        `ℹ️ Müəllimin admin balansı var, amma yalnız teacherBalance-dən çıxara bilər: adminBalance=${user.adminBalance}`,
      );
    }

    // Stripe hesabı yoxdursa, yalnız database-də withdrawal yarat (pending status)
    if (!user.stripeAccountId) {
      this.logger.warn(
        `Müəllimin Stripe hesabı yoxdur: ${user.email}. Yalnız database withdrawal yaradılır.`,
      );
      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            teacherBalance: {
              decrement: amount,
            },
          },
        });

        const withdrawal = await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.PENDING,
            bankAccount,
            bankName,
          },
        });

        return withdrawal;
      });
    }

    // Stripe hesabı varsa, real transfer et
    try {
      // Stripe account-u yoxla
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);

      const transfersEnabled = account.capabilities?.transfers === 'active';

      if (!transfersEnabled) {
        this.logger.warn(
          `Müəllimin Stripe account-unda transfers aktiv deyil: ${user.email}. Yalnız database withdrawal yaradılır.`,
        );
        return this.prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              teacherBalance: {
                decrement: amount,
              },
            },
          });

          const withdrawal = await tx.withdrawal.create({
            data: {
              userId,
              amount,
              status: WithdrawalStatus.PENDING,
              bankAccount,
              bankName,
            },
          });

          return withdrawal;
        });
      }

      // Admin-in Stripe account-unu tap
      const admin = await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      });

      if (!admin?.stripeAccountId) {
        throw new BadRequestException(
          'Admin-in Stripe hesabı yoxdur. Zəhmət olmasa admin-in Stripe hesabını yaradın.',
        );
      }

      // Real Stripe transfer et - Platform account-dan müəllimin connected account-una
      // QEYD: Stripe-də birbaşa connected account-dan connected account-a transfer mümkün deyil
      // Pul admin-in connected account-unda olur (on_behalf_of ilə), amma transfer platform account-dan edilir
      this.logger.log(
        `Stripe transfer başlanır (Müəllim): ${amount} AZN → ${user.email}`,
      );
      this.logger.log(
        `Platform account → Müəllim account: ${user.stripeAccountId}`,
      );
      this.logger.log(
        `Pul admin-in connected account-unda saxlanılır: ${admin.stripeAccountId}`,
      );

      // Platform account-dan müəllimin connected account-una transfer
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // AZN-dən qəpikə çevir
        currency: 'azn',
        destination: user.stripeAccountId,
        description: `Müəllim çıxarışı - ${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId,
          userEmail: user.email,
          adminId: admin.id,
          adminEmail: admin.email,
          bankAccount: bankAccount || '',
          bankName: bankName || '',
          source: 'admin_balance',
        },
      });

      this.logger.log(
        `✅ Müəllim Stripe transfer uğurlu: ID ${transfer.id} - ${amount} AZN`,
      );

      // Database balansından çıx və withdrawal yarat (COMPLETED status ilə)
      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            teacherBalance: {
              decrement: amount,
            },
          },
        });

        const withdrawal = await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.COMPLETED,
            bankAccount,
            bankName,
            completedAt: new Date(),
          },
        });

        return withdrawal;
      });
    } catch (error: any) {
      this.logger.error('❌ Müəllim Stripe transfer xətası:', error);
      // Transfer uğursuz olarsa, yalnız database withdrawal yarat (pending)
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            teacherBalance: {
              decrement: amount,
            },
          },
        });

        await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.PENDING,
            bankAccount,
            bankName,
            reason: `Stripe transfer uğursuz: ${error.message}`,
          },
        });
      });

      // Error throw et ki, frontend onu tuta bilsin
      throw new BadRequestException(
        `Stripe transfer uğursuz oldu: ${error.message}. Çıxarış sorğusu göndərildi və gözləmədədir.`,
      );
    }
  }

  /**
   * Admin pul çıxarışı
   * Database balansından çıxır və real Stripe transfer edir
   */
  async withdrawAdmin(
    userId: string,
    amount: number,
    bankAccount?: string,
    bankName?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        teacherBalance: true,
        adminBalance: true,
        stripeAccountId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    // ✅ TƏHLÜKƏSİZLİK: Yalnız adminlər bu funksiyadan istifadə edə bilər
    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `❌ Təhlükəsizlik: Admin olmayan istifadəçi admin withdrawal cəhdi: userId=${userId}, role=${user.role}`,
      );
      throw new BadRequestException('Yalnız adminlər pul çıxara bilər');
    }

    if (amount <= 0) {
      throw new BadRequestException('Məbləğ müsbət olmalıdır');
    }

    // ✅ TƏHLÜKƏSİZLİK: Admin yalnız öz adminBalance-dən çıxara bilər
    if (user.adminBalance < amount) {
      this.logger.warn(
        `❌ Təhlükəsizlik: Admin-in kifayət qədər balansı yoxdur: userId=${userId}, adminBalance=${user.adminBalance}, amount=${amount}`,
      );
      throw new BadRequestException(
        `Kifayət qədər balans yoxdur. Admin balansınız: ${user.adminBalance.toFixed(2)} AZN`,
      );
    }

    // ✅ TƏHLÜKƏSİZLİK: Admin müəllim balansından çıxara bilməz
    // Bu yoxlama artıq yuxarıda edildi (role !== ADMIN), amma əlavə təhlükəsizlik üçün
    if (user.teacherBalance > 0) {
      this.logger.log(
        `ℹ️ Admin-in müəllim balansı var, amma yalnız adminBalance-dən çıxara bilər: teacherBalance=${user.teacherBalance}`,
      );
    }

    // Stripe hesabı yoxdursa, yalnız database-də withdrawal yarat (pending status)
    if (!user.stripeAccountId) {
      this.logger.warn(
        `Admin-in Stripe hesabı yoxdur: ${user.email}. Yalnız database withdrawal yaradılır.`,
      );
      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            adminBalance: {
              decrement: amount,
            },
          },
        });

        const withdrawal = await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.PENDING,
            bankAccount,
            bankName,
          },
        });

        return withdrawal;
      });
    }

    // Stripe hesabı varsa, real transfer et
    try {
      // Stripe account-u yoxla
      const account = await this.stripe.accounts.retrieve(user.stripeAccountId);

      const transfersEnabled = account.capabilities?.transfers === 'active';

      if (!transfersEnabled) {
        this.logger.warn(
          `Admin-in Stripe account-unda transfers aktiv deyil: ${user.email}. Yalnız database withdrawal yaradılır.`,
        );
        return this.prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              adminBalance: {
                decrement: amount,
              },
            },
          });

          const withdrawal = await tx.withdrawal.create({
            data: {
              userId,
              amount,
              status: WithdrawalStatus.PENDING,
              bankAccount,
              bankName,
            },
          });

          return withdrawal;
        });
      }

      // Real Stripe transfer et
      this.logger.log(
        `Stripe transfer başlanır (Admin): ${amount} AZN → ${user.email}`,
      );

      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // AZN-dən qəpikə çevir
        currency: 'azn',
        destination: user.stripeAccountId,
        description: `Admin çıxarışı - ${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId,
          userEmail: user.email,
          bankAccount: bankAccount,
          bankName: bankName,
        },
      });

      this.logger.log(
        `✅ Admin Stripe transfer uğurlu: ID ${transfer.id} - ${amount} AZN`,
      );

      // Database balansından çıx və withdrawal yarat (COMPLETED status ilə)
      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            adminBalance: {
              decrement: amount,
            },
          },
        });

        const withdrawal = await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.COMPLETED,
            bankAccount,
            bankName,
            completedAt: new Date(),
          },
        });

        return withdrawal;
      });
    } catch (error: any) {
      this.logger.error('❌ Admin Stripe transfer xətası:', error);
      // Transfer uğursuz olarsa, yalnız database withdrawal yarat (pending)
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            adminBalance: {
              decrement: amount,
            },
          },
        });

        await tx.withdrawal.create({
          data: {
            userId,
            amount,
            status: WithdrawalStatus.PENDING,
            bankAccount,
            bankName,
            reason: `Stripe transfer uğursuz: ${error.message}`,
          },
        });
      });

      // Error throw et ki, frontend onu tuta bilsin
      throw new BadRequestException(
        `Stripe transfer uğursuz oldu: ${error.message}. Çıxarış sorğusu göndərildi və gözləmədədir.`,
      );
    }
  }

  /**
   * Balansları gətir
   */
  async getBalances(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        balance: true,
        teacherBalance: true,
        adminBalance: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    return {
      balance: user.balance,
      teacherBalance: user.teacherBalance,
      adminBalance: user.adminBalance,
      role: user.role,
    };
  }

  /**
   * Withdrawal tarixçəsini gətir
   */
  async getWithdrawals(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bütün pending withdrawal-ları gətir (admin üçün)
   */
  async getAllPendingWithdrawals() {
    return this.prisma.withdrawal.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Withdrawal statusunu yenilə (admin üçün)
   */
  async updateWithdrawalStatus(
    withdrawalId: string,
    status: WithdrawalStatus,
    reason?: string,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Çıxarış tapılmadı');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Yalnız pending çıxarışlar yenilənə bilər');
    }

    // Əgər rədd olunarsa, balansı geri qaytar
    if (status === WithdrawalStatus.REJECTED) {
      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: withdrawal.userId },
        });

        if (!user) {
          throw new NotFoundException('İstifadəçi tapılmadı');
        }

        // Balansı geri qaytar
        if (user.role === UserRole.TEACHER) {
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: {
              teacherBalance: {
                increment: withdrawal.amount,
              },
            },
          });
        } else if (user.role === UserRole.ADMIN) {
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: {
              adminBalance: {
                increment: withdrawal.amount,
              },
            },
          });
        }

        // Withdrawal statusunu yenilə
        return tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status,
            reason,
          },
        });
      });
    }

    // Tamamlandı olarsa
    if (status === WithdrawalStatus.COMPLETED) {
      return this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status,
          completedAt: new Date(),
        },
      });
    }

    return this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status,
        reason,
      },
    });
  }
}
