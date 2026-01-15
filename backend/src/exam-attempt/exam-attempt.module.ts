// src/exam-attempt/exam-attempt.module.ts

import { Module } from '@nestjs/common';
import { ExamAttemptService } from './services/exam-attempt.service';
import { ExamAttemptController } from './exam-attempt.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { ExamQuestionsHelper } from './helpers/exam-questions.helper';
import { GradingService } from './services/grading.service';
import { PrizeAwardService } from './services/prize-award.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [ExamAttemptController],
  providers: [
    ExamAttemptService,
    ExamQuestionsHelper,
    GradingService,
    PrizeAwardService,
  ],
  exports: [ExamAttemptService],
})
export class ExamAttemptModule {}
