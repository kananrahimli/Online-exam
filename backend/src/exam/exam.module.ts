import { Module, forwardRef } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamAttemptModule } from '../exam-attempt/exam-attempt.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ExamAttemptModule)],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
