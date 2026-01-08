import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherStudentService {
  constructor(private prisma: PrismaService) {}

  async followTeacher(studentId: string, teacherId: string) {
    // Check if teacher exists
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Müəllim tapılmadı');
    }

    if (teacher.role !== 'TEACHER') {
      throw new BadRequestException('Bu istifadəçi müəllim deyil');
    }

    // Check if already following
    const existing = await this.prisma.teacherStudent.findUnique({
      where: {
        teacherId_studentId: {
          teacherId,
          studentId,
        },
      },
    });

    if (existing) {
      return { message: 'Artıq bu müəllimi izləyirsiniz', relation: existing };
    }

    const relation = await this.prisma.teacherStudent.create({
      data: {
        teacherId,
        studentId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return relation;
  }

  async unfollowTeacher(studentId: string, teacherId: string) {
    const relation = await this.prisma.teacherStudent.findUnique({
      where: {
        teacherId_studentId: {
          teacherId,
          studentId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException('Bu müəllimi izləmirsiniz');
    }

    await this.prisma.teacherStudent.delete({
      where: {
        teacherId_studentId: {
          teacherId,
          studentId,
        },
      },
    });

    return { message: 'Uğurla izləmə dayandırıldı' };
  }

  async getMyTeachers(studentId: string) {
    const relations = await this.prisma.teacherStudent.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return relations.map((r) => r.teacher);
  }

  async getMyStudents(teacherId: string) {
    const relations = await this.prisma.teacherStudent.findMany({
      where: { teacherId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return relations.map((r) => r.student);
  }

  async getTeachersWithMyTeachers(studentId: string) {
    // Get all teachers
    const allTeachers = await this.prisma.user.findMany({
      where: {
        role: 'TEACHER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Get my teachers (teachers that student follows)
    const myTeachersRelations = await this.prisma.teacherStudent.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const myTeachers = myTeachersRelations.map((r) => r.teacher);

    return {
      allTeachers,
      myTeachers,
    };
  }
}
