import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ExamAttemptService } from './exam-attempt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { GradeAnswerDto } from './dto/grade-answer.dto';
import { UserRole } from '@prisma/client';

@Controller('exam-attempts')
@UseGuards(JwtAuthGuard)
export class ExamAttemptController {
  constructor(private readonly examAttemptService: ExamAttemptService) {}

  @Post(':examId/start')
  async startExam(@Param('examId') examId: string, @CurrentUser() user: any) {
    return this.examAttemptService.startExam(examId, user.id);
  }

  @Get('my-attempts')
  async getMyAttempts(@CurrentUser() user: any) {
    return this.examAttemptService.getMyAttempts(user.id);
  }

  @Get(':attemptId')
  async getAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
  ) {
    return this.examAttemptService.getAttempt(attemptId, user.id);
  }

  @Put(':attemptId/answers')
  async submitAnswer(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
    @Body() submitAnswersDto: SubmitAnswersDto,
  ) {
    return this.examAttemptService.submitAnswer(
      attemptId,
      user.id,
      submitAnswersDto,
    );
  }

  @Post(':attemptId/submit')
  async submitExam(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
  ) {
    return this.examAttemptService.submitExam(attemptId, user.id);
  }

  @Get(':attemptId/result')
  async getResult(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
  ) {
    return this.examAttemptService.getResult(attemptId, user.id);
  }

  @Put(':attemptId/answers/:answerId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async gradeAnswer(
    @Param('attemptId') attemptId: string,
    @Param('answerId') answerId: string,
    @Body() gradeAnswerDto: GradeAnswerDto,
    @CurrentUser() user: any,
  ) {
    return this.examAttemptService.gradeAnswer(
      attemptId,
      answerId,
      gradeAnswerDto.points,
      user.id,
    );
  }

  @Post('test/award-prizes/:examId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async testAwardPrizes(@Param('examId') examId: string) {
    // Test endpoint to manually trigger prize awarding
    await this.examAttemptService.checkAndAwardPrizes(examId);
    return { message: 'Mükafatlar yoxlanıldı və təqdim olundu (əgər şərtlər yerinə yetirilsə)' };
  }
}
