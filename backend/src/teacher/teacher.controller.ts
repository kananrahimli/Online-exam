import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  /**
   * Müəllim üçün Stripe hesabı yaradır
   * POST /teacher/stripe/create-account
   */
  @Post('stripe/create-account')
  async createStripeAccount(@CurrentUser() user: any) {
    return this.teacherService.createStripeAccount(user.id);
  }

  /**
   * Stripe onboarding linki alır
   * GET /teacher/stripe/onboarding-link
   */
  @Get('stripe/onboarding-link')
  async getOnboardingLink(@CurrentUser() user: any) {
    return this.teacherService.createAccountLink(user.id);
  }

  /**
   * Stripe hesab statusunu yoxlayır
   * GET /teacher/stripe/status
   */
  @Get('stripe/status')
  async getAccountStatus(@CurrentUser() user: any) {
    return this.teacherService.checkAccountStatus(user.id);
  }

  /**
   * Stripe balansını yoxlayır
   * GET /teacher/stripe/balance
   */
  @Get('stripe/balance')
  async getStripeBalance(@CurrentUser() user: any) {
    return this.teacherService.getStripeBalance(user.id);
  }

  /**
   * Bütün müəllim və admin-lər üçün avtomatik Stripe account yaradır
   * POST /teacher/stripe/create-accounts-for-all
   * (Yalnız admin üçün)
   */
  @Post('stripe/create-accounts-for-all')
  @Roles(UserRole.ADMIN)
  async createStripeAccountsForAll() {
    return this.teacherService.createStripeAccountsForAll();
  }
}
