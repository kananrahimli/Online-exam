import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AddBalanceDto } from './dto/add-balance.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.create(user.id, createPaymentDto);
  }

  @Post('add-balance')
  @UseGuards(JwtAuthGuard)
  async addBalance(
    @CurrentUser() user: any,
    @Body() addBalanceDto: AddBalanceDto,
  ) {
    return this.paymentService.addBalance(user.id, addBalanceDto.amount);
  }

  @Post('verify/:paymentId')
  @UseGuards(JwtAuthGuard)
  async verify(@Param('paymentId') paymentId: string) {
    return this.paymentService.verifyPayment(paymentId);
  }

  @Get('success/:paymentId')
  async success(@Param('paymentId') paymentId: string) {
    // Verify payment when user lands on success page
    return this.paymentService.verifyPayment(paymentId);
  }

  @Get('cancel/:paymentId')
  async cancel(@Param('paymentId') paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }

  @Post('callback')
  async callback(
    @Body() body: any,
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
  ) {
    // PayRiff can send orderId or paymentId in query or body
    const finalOrderId = orderId || body?.orderId || body?.uuid;
    const finalPaymentId = paymentId || body?.paymentId;

    if (!finalOrderId && !finalPaymentId) {
      return { message: 'Order ID və ya Payment ID təmin edilməyib' };
    }

    // Handle callback with orderId or paymentId
    const result = await this.paymentService.handleCallback(
      finalOrderId || '',
      finalPaymentId,
    );

    // Return redirect URL for PayRiff to redirect user
    return result;
  }

  @Get('callback')
  async callbackGet(
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
    @Res() res?: Response,
  ) {
    if (!orderId && !paymentId) {
      if (res) {
        return res.status(400).json({
          message: 'Order ID və ya Payment ID təmin edilməyib',
        });
      }
      return { message: 'Order ID və ya Payment ID təmin edilməyib' };
    }

    try {
      // Handle callback and get redirect URL
      const result = await this.paymentService.handleCallback(
        orderId || '',
        paymentId,
      );

      // If redirect URL is provided, redirect user to frontend
      if (result.redirectUrl && res) {
        return res.redirect(302, result.redirectUrl);
      }

      return result;
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (res) {
        return res.redirect(
          302,
          `${frontendUrl}/profile?payment=error&message=${encodeURIComponent(error.message || 'Ödəniş zamanı xəta baş verdi')}`,
        );
      }
      throw error;
    }
  }

  @Get('teacher/balance')
  @UseGuards(JwtAuthGuard)
  async getTeacherBalance(@CurrentUser() user: any) {
    return this.paymentService.getTeacherBalance(user.id);
  }

  @Post('teacher/withdrawals')
  @UseGuards(JwtAuthGuard)
  async createWithdrawal(
    @CurrentUser() user: any,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.createWithdrawal(
      user.id,
      createWithdrawalDto.amount,
      createWithdrawalDto.bankAccount,
      createWithdrawalDto.notes,
    );
  }

  @Get('teacher/withdrawals')
  @UseGuards(JwtAuthGuard)
  async getWithdrawals(@CurrentUser() user: any) {
    return this.withdrawalService.getWithdrawals(user.id);
  }

  @Post('admin/withdrawals/:withdrawalId/process')
  @UseGuards(JwtAuthGuard)
  async processWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @CurrentUser() user: any,
    @Body() body: { payriffOrderId?: string },
  ) {
    return this.withdrawalService.processWithdrawal(
      withdrawalId,
      user.id,
      body.payriffOrderId,
    );
  }

  @Post('teacher/bank-account')
  @UseGuards(JwtAuthGuard)
  async updateBankAccount(
    @CurrentUser() user: any,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.withdrawalService.updateBankAccount(
      user.id,
      updateBankAccountDto,
    );
  }

  @Get('teacher/bank-account')
  @UseGuards(JwtAuthGuard)
  async getBankAccount(@CurrentUser() user: any) {
    return this.withdrawalService.getBankAccount(user.id);
  }
}
