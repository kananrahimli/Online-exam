import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AddBalanceDto } from './dto/add-balance.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.create(user.id, createPaymentDto);
  }

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

  @Post('callback')
  async callback(@Body() body: any, @Query('orderId') orderId?: string) {
    // PayRiff can send orderId in query or body
    const finalOrderId = orderId || body?.orderId;
    if (!finalOrderId) {
      return { message: 'Order ID təmin edilməyib' };
    }
    return this.paymentService.handleCallback(finalOrderId);
  }

  @Get('callback')
  async callbackGet(@Query('orderId') orderId?: string) {
    if (!orderId) {
      return { message: 'Order ID təmin edilməyib' };
    }
    return this.paymentService.handleCallback(orderId);
  }

  @Get('teacher/balance')
  async getTeacherBalance(@CurrentUser() user: any) {
    return this.paymentService.getTeacherBalance(user.id);
  }

  @Post('teacher/withdrawals')
  async createWithdrawal(
    @CurrentUser() user: any,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.paymentService.createWithdrawal(
      user.id,
      createWithdrawalDto.amount,
      createWithdrawalDto.bankAccount,
      createWithdrawalDto.notes,
    );
  }

  @Get('teacher/withdrawals')
  async getWithdrawals(@CurrentUser() user: any) {
    return this.paymentService.getWithdrawals(user.id);
  }

  @Post('admin/withdrawals/:withdrawalId/process')
  async processWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @CurrentUser() user: any,
    @Body() body: { payriffOrderId?: string },
  ) {
    return this.paymentService.processWithdrawal(
      withdrawalId,
      user.id,
      body.payriffOrderId,
    );
  }

  @Post('teacher/bank-account')
  async updateBankAccount(
    @CurrentUser() user: any,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.paymentService.updateBankAccount(user.id, updateBankAccountDto);
  }

  @Get('teacher/bank-account')
  async getBankAccount(@CurrentUser() user: any) {
    return this.paymentService.getBankAccount(user.id);
  }
}
