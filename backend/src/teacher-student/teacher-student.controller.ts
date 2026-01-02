import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeacherStudentService } from './teacher-student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('teacher-student')
@UseGuards(JwtAuthGuard)
export class TeacherStudentController {
  constructor(private readonly teacherStudentService: TeacherStudentService) {}

  @Post(':teacherId/follow')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async followTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any,
  ) {
    return this.teacherStudentService.followTeacher(user.id, teacherId);
  }

  @Delete(':teacherId/unfollow')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async unfollowTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any,
  ) {
    return this.teacherStudentService.unfollowTeacher(user.id, teacherId);
  }

  @Get('my-teachers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async getMyTeachers(@CurrentUser() user: any) {
    return this.teacherStudentService.getMyTeachers(user.id);
  }

  @Get('my-students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getMyStudents(@CurrentUser() user: any) {
    return this.teacherStudentService.getMyStudents(user.id);
  }

  @Get('teachers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async getTeachers(@CurrentUser() user: any) {
    return this.teacherStudentService.getTeachersWithMyTeachers(user.id);
  }
}
