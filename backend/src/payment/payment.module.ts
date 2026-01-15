import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WithdrawalService } from './withdrawal.service';
import { PayriffService } from './payriff.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService, WithdrawalService, PayriffService],
  exports: [PaymentService],
})
export class PaymentModule {}
