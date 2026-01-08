import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddBalanceDto } from './dto/add-balance.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private configService: ConfigService,
  ) {}

  @Post('add-balance')
  async addBalance(
    @CurrentUser() user: any,
    @Body() addBalanceDto: AddBalanceDto,
  ) {
    return this.paymentService.addBalance(user.id, addBalanceDto.amount);
  }

  @Post('verify/:paymentId')
  async verify(@Param('paymentId') paymentId: string) {
    return this.paymentService.verifyPayment(paymentId);
  }

  @Get('success/:paymentId')
  async success(@Param('paymentId') paymentId: string) {
    return this.paymentService.verifyPayment(paymentId);
  }

  @Get('cancel/:paymentId')
  async cancel(@Param('paymentId') paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }

  @Get('balances')
  async getBalances(@CurrentUser() user: any) {
    return this.paymentService.getBalances(user.id);
  }

  @Post('withdraw/teacher')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async withdrawTeacher(
    @CurrentUser() user: any,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.paymentService.withdrawTeacher(
      user.id,
      withdrawDto.amount,
      withdrawDto.bankAccount,
      withdrawDto.bankName,
    );
  }

  @Post('withdraw/admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async withdrawAdmin(
    @CurrentUser() user: any,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.paymentService.withdrawAdmin(
      user.id,
      withdrawDto.amount,
      withdrawDto.bankAccount,
      withdrawDto.bankName,
    );
  }

  @Get('withdrawals')
  async getWithdrawals(@CurrentUser() user: any) {
    return this.paymentService.getWithdrawals(user.id);
  }

  @Get('withdrawals/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllPendingWithdrawals() {
    return this.paymentService.getAllPendingWithdrawals();
  }

  @Post('withdrawals/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateWithdrawalStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateWithdrawalStatusDto,
  ) {
    return this.paymentService.updateWithdrawalStatus(
      id,
      updateDto.status,
      updateDto.reason,
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripeSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!stripeSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET tapılmadı');
    }

    const stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2025-12-15.clover',
      },
    );

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeSecret,
      );

      await this.paymentService.handleStripeWebhook(event);

      return { received: true };
    } catch (err) {
      console.error('Webhook xətası:', err);
      throw err;
    }
  }
}
