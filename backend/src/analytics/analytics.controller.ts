import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('exam/:examId')
  async getExamStats(
    @CurrentUser() user: any,
    @Param('examId') examId: string,
  ) {
    return this.analyticsService.getExamStats(examId, user.id);
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: any) {
    return this.analyticsService.getSummary(user.id);
  }
}
