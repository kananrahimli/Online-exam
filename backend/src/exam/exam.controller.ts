import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@CurrentUser() user: any, @Body() createExamDto: CreateExamDto) {
    return this.examService.create(user.id, createExamDto);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.examService.findAll(status, teacherId);
  }

  @Get('published')
  async findPublished(@CurrentUser() user: any) {
    // If user is student, only show exams from their teachers
    const studentId = user.role === 'STUDENT' ? user.id : undefined;
    return this.examService.findPublished(studentId);
  }

  @Get('subjects')
  async getSubjects() {
    return this.examService.getSubjects();
  }

  @Get('my-exams')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getMyExams(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.examService.findAll(status, user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examService.findOne(id, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examService.update(id, user.id, updateExamDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examService.remove(id, user.id);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examService.publish(id, user.id);
  }

  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examService.getLeaderboard(id, user.id);
  }
}
