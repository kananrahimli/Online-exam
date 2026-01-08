import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class TeacherService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY tapılmadı');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /**
   * Müəllim və ya Admin üçün Stripe Connected Account yaradır
   */
  async createStripeAccount(teacherId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN') {
      throw new BadRequestException(
        'Yalnız müəllim və ya admin üçün Stripe hesabı yaradıla bilər',
      );
    }

    if (teacher.stripeAccountId) {
      throw new BadRequestException('Stripe hesabı artıq mövcuddur');
    }

    // Stripe Express Account yarat
    let account;
    try {
      account = await this.stripe.accounts.create({
        type: 'express',
        country: 'AZ', // Azərbaycan
        email: teacher.email,
        capabilities: {
          // Azərbaycan üçün yalnız transfers mövcuddur, card_payments yoxdur
          transfers: { requested: true },
        },
        // Azərbaycan üçün cross-border transfer üçün recipient service agreement lazımdır
        tos_acceptance: {
          service_agreement: 'recipient',
        },
      });
    } catch (error: any) {
      // Stripe Connect aktivləşdirilməyibsə
      if (
        error.message?.includes('Connect') ||
        error.code === 'account_invalid'
      ) {
        throw new BadRequestException(
          `Stripe Connect aktivləşdirilməyib. Zəhmət olmasa Stripe Dashboard-da Connect-i aktivləşdirin: https://dashboard.stripe.com/settings/connect. Xəta: ${error.message}`,
        );
      }
      // Azərbaycan üçün card_payments capability problemi
      if (error.message?.includes('card_payments')) {
        throw new BadRequestException(
          `Azərbaycan üçün card_payments capability istifadə edilə bilmir. Yalnız transfers mövcuddur. Xəta: ${error.message}`,
        );
      }
      // Azərbaycan üçün recipient service agreement problemi
      if (
        error.message?.includes('recipient') ||
        error.message?.includes('service agreement')
      ) {
        throw new BadRequestException(
          `Azərbaycan üçün recipient service agreement tələb olunur. Xəta: ${error.message}`,
        );
      }
      throw error;
    }

    // Database-də saxla
    await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        stripeAccountId: account.id,
      },
    });

    return {
      accountId: account.id,
      message: 'Stripe hesabı yaradıldı',
    };
  }

  /**
   * Müəllim və ya Admin üçün onboarding linki yaradır
   */
  async createAccountLink(teacherId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher?.stripeAccountId) {
      throw new BadRequestException('Əvvəlcə Stripe hesabı yaratmalısınız');
    }

    if (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN') {
      throw new BadRequestException(
        'Yalnız müəllim və ya admin üçün Stripe hesabı yaradıla bilər',
      );
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: teacher.stripeAccountId,
      refresh_url: `${this.configService.get('FRONTEND_URL')}/teacher/stripe/reauth`,
      return_url: `${this.configService.get('FRONTEND_URL')}/teacher/stripe/success`,
      type: 'account_onboarding',
    });

    return {
      url: accountLink.url,
      message: 'Onboarding linki yaradıldı',
    };
  }

  /**
   * Stripe account statusunu yoxlayır (Müəllim və ya Admin üçün)
   */
  async checkAccountStatus(teacherId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher?.stripeAccountId) {
      return {
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        message: 'Stripe hesabı yoxdur',
      };
    }

    const account = await this.stripe.accounts.retrieve(
      teacher.stripeAccountId,
    );

    return {
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: teacher.stripeAccountId,
    };
  }

  /**
   * Müəllim və ya Admin-in Stripe balansını yoxlayır
   */
  async getStripeBalance(teacherId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher?.stripeAccountId) {
      throw new BadRequestException('Stripe hesabı yoxdur');
    }

    const balance = await this.stripe.balance.retrieve({
      stripeAccount: teacher.stripeAccountId,
    });

    return {
      available: balance.available,
      pending: balance.pending,
    };
  }

  /**
   * Bütün müəllim və admin-lər üçün avtomatik Stripe account yaradır
   * (Mövcud istifadəçilər üçün)
   */
  async createStripeAccountsForAll() {
    // Müəllim və admin-ləri tap (Stripe account-u olmayanlar)
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['TEACHER', 'ADMIN'],
        },
        stripeAccountId: null,
      },
    });

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      try {
        await this.createStripeAccount(user.id);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${user.email}: ${error.message}`);
      }
    }

    return {
      message: `Stripe account yaradılması tamamlandı`,
      results,
    };
  }
}
