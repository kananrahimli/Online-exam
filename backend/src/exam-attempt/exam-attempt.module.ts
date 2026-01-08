import { Module } from '@nestjs/common';
import { ExamAttemptController } from './exam-attempt.controller';
import { ExamAttemptService } from './exam-attempt.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [ExamAttemptController],
  providers: [ExamAttemptService],
  exports: [ExamAttemptService],
})
export class ExamAttemptModule {}
