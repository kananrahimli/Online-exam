import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GenerateExamDto } from './dto/generate-exam.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-exam')
  async generateExam(@Body() generateExamDto: GenerateExamDto) {
    return this.aiService.generateExam(generateExamDto);
  }

  @Post('regenerate-question')
  async regenerateQuestion(
    @Body() body: { examId: string; questionId: string; prompt?: string },
  ) {
    return this.aiService.regenerateQuestion(
      body.examId,
      body.questionId,
      body.prompt,
    );
  }
}
