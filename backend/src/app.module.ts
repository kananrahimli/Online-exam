import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExamModule } from './exam/exam.module';
import { PaymentModule } from './payment/payment.module';
import { AiModule } from './ai/ai.module';
import { ExamAttemptModule } from './exam-attempt/exam-attempt.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TeacherStudentModule } from './teacher-student/teacher-student.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ExamModule,
    PaymentModule,
    AiModule,
    ExamAttemptModule,
    AnalyticsModule,
    TeacherStudentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
