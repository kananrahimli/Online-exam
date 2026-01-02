import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AddBalanceDto } from './dto/add-balance.dto';

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
    return this.paymentService.addBalance(
      user.id,
      addBalanceDto.amount,
      addBalanceDto.examId,
    );
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
}
