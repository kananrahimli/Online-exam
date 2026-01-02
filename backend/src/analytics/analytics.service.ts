import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getExamStats(examId: string, teacherId: string) {
    // Check if exam belongs to teacher
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.teacherId !== teacherId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    // Get all attempts for this exam
    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                points: true,
                content: true,
                modelAnswer: true,
              },
            },
            option: true,
          },
        },
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

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(
      (a) => a.status === 'COMPLETED',
    ).length;

    const scores = attempts
      .filter((a) => a.score !== null && a.totalScore !== null)
      .map((a) => ((a.score || 0) / (a.totalScore || 1)) * 100);

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    const uniqueStudents = new Set(attempts.map((a) => a.studentId)).size;

    // Prize amounts: 1st = 10 AZN, 2nd = 7 AZN, 3rd = 3 AZN
    const prizes = [10, 7, 3];

    // Sort completed attempts by score to determine positions
    const sortedAttempts = attempts
      .filter((a) => a.status === 'COMPLETED' && a.score !== null && a.totalScore !== null)
      .sort((a, b) => {
        const scoreA = (a.score || 0) / (a.totalScore || 1);
        const scoreB = (b.score || 0) / (b.totalScore || 1);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB; // Earlier submission wins tie
      });

    // Create a map of attempt ID to position and prize
    const attemptPositions = new Map<string, { position: number; prizeAmount: number }>();
    sortedAttempts.forEach((attempt, index) => {
      const position = index + 1;
      const prizeAmount = position <= 3 ? prizes[position - 1] : 0;
      attemptPositions.set(attempt.id, { position, prizeAmount });
    });

    return {
      examId,
      examTitle: exam.title,
      totalAttempts,
      completedAttempts,
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalStudents: uniqueStudents,
      completionRate: totalAttempts > 0 ? completedAttempts / totalAttempts : 0,
      attempts: attempts
        .map((attempt) => {
          const positionInfo = attemptPositions.get(attempt.id) || { position: 0, prizeAmount: 0 };
          return {
            id: attempt.id,
            student: attempt.student,
            score: attempt.score,
            totalScore: attempt.totalScore,
            status: attempt.status,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            percentage:
              attempt.score !== null &&
              attempt.totalScore !== null &&
              attempt.totalScore > 0
                ? ((attempt.score / attempt.totalScore) * 100).toFixed(2)
                : null,
            position: positionInfo.position,
            prizeAmount: positionInfo.prizeAmount,
            answers: attempt.answers.map((answer) => ({
              id: answer.id,
              questionId: answer.questionId,
              questionType: answer.question.type,
              questionContent: answer.question.content,
              questionPoints: answer.question.points,
              modelAnswer: answer.question.modelAnswer,
              optionId: answer.optionId,
              content: answer.content,
              isCorrect: answer.isCorrect,
              points: answer.points,
              option: answer.option,
            })),
          };
        })
        .sort((a, b) => {
          // Sort by score percentage (high to low), then by submittedAt (newest first)
          const scoreA =
            a.score !== null && a.totalScore !== null && a.totalScore > 0
              ? a.score / a.totalScore
              : -1;
          const scoreB =
            b.score !== null && b.totalScore !== null && b.totalScore > 0
              ? b.score / b.totalScore
              : -1;

          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          // If scores are equal, sort by submittedAt (newest first)
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        }),
    };
  }

  async getSummary(teacherId: string) {
    const exams = await this.prisma.exam.findMany({
      where: { teacherId },
      include: {
        attempts: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const stats = exams.map((exam) => {
      const attempts = exam.attempts;
      const completedAttempts = attempts.filter(
        (a) => a.status === 'COMPLETED',
      );

      const scores = completedAttempts
        .filter((a) => a.score !== null && a.totalScore !== null)
        .map((a) => ((a.score || 0) / (a.totalScore || 1)) * 100);

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      return {
        examId: exam.id,
        examTitle: exam.title,
        totalAttempts: attempts.length,
        averageScore: parseFloat(averageScore.toFixed(2)),
        totalStudents: new Set(attempts.map((a) => a.studentId)).size,
        completionRate:
          attempts.length > 0 ? completedAttempts.length / attempts.length : 0,
      };
    });

    const totalAttempts = stats.reduce((sum, s) => sum + s.totalAttempts, 0);
    const overallAverage =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + s.averageScore, 0) / stats.length
        : 0;

    return {
      totalExams: exams.length,
      totalAttempts,
      overallAverage: parseFloat(overallAverage.toFixed(2)),
      totalStudents: new Set(
        exams.flatMap((exam) => exam.attempts.map((a) => a.studentId)),
      ).size,
      examStats: stats,
    };
  }
}
