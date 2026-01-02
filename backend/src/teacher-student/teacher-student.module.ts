import { Module } from '@nestjs/common';
import { TeacherStudentController } from './teacher-student.controller';
import { TeacherStudentService } from './teacher-student.service';

@Module({
  controllers: [TeacherStudentController],
  providers: [TeacherStudentService],
  exports: [TeacherStudentService],
})
export class TeacherStudentModule {}
