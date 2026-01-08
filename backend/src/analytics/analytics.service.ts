import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

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
                correctAnswer: true,
                readingTextId: true,
                readingText: {
                  select: {
                    id: true,
                    content: true,
                    order: true,
                  },
                },
                options: {
                  select: {
                    id: true,
                    content: true,
                    order: true,
                  },
                  orderBy: {
                    order: 'asc',
                  },
                },
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
    const completedAttemptsCount = attempts.filter(
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

    // Get prize payments for this exam to get actual prize amounts
    const prizePayments = await this.prisma.payment.findMany({
      where: {
        examId,
        transactionId: {
          startsWith: 'PRIZE-',
        },
        status: PaymentStatus.COMPLETED,
      },
      select: {
        studentId: true,
        amount: true,
      },
    });

    // Create a map of studentId -> actual prize amount
    const prizeMap = new Map<string, number>();
    prizePayments.forEach((payment) => {
      prizeMap.set(payment.studentId, payment.amount);
    });

    // Prize amounts: 1st = 10 AZN, 2nd = 7 AZN, 3rd = 3 AZN
    const prizes = [10, 7, 3];

    // Get completed attempts and group by score percentage (similar to getLeaderboard logic)
    const completedAttempts = attempts.filter(
      (a) =>
        a.status === 'COMPLETED' && a.score !== null && a.totalScore !== null,
    );

    // Group attempts by score percentage
    const attemptsByScore = new Map<string, typeof completedAttempts>();

    for (const attempt of completedAttempts) {
      const scorePercentage =
        attempt.score && attempt.totalScore && attempt.totalScore > 0
          ? ((attempt.score || 0) / attempt.totalScore).toFixed(2)
          : '0.00';

      if (!attemptsByScore.has(scorePercentage)) {
        attemptsByScore.set(scorePercentage, []);
      }
      attemptsByScore.get(scorePercentage)!.push(attempt);
    }

    // Calculate positions with prize amounts (considering ties)
    const attemptPositions = new Map<
      string,
      { position: number; prizeAmount: number }
    >();
    let currentPosition = 1;
    const sortedScores = Array.from(attemptsByScore.keys()).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    for (const scorePercentage of sortedScores) {
      const tiedAttempts = attemptsByScore.get(scorePercentage)!;

      // Calculate prize amount for this group
      // For tied students, all should show the same prize amount
      // Logic: If 2 students tie and occupy positions 2 and 3, they split (7+3)/2 = 5 AZN each
      let prizeAmount = 0;
      if (currentPosition <= 3) {
        // Calculate total prize amount for positions occupied by this group
        // Example: if tied students occupy positions 2 and 3, total = 7 + 3 = 10
        let totalPrizeAmount = 0;

        for (
          let i = 0;
          i < tiedAttempts.length && currentPosition + i <= 3;
          i++
        ) {
          const prizeIndex = currentPosition + i - 1;
          if (prizeIndex < prizes.length) {
            totalPrizeAmount += prizes[prizeIndex];
          }
        }

        // Split prize equally among tied students (same logic as awardPrizes)
        // Example: if 2 students tied at positions 2 and 3: (7+3)/2 = 5 AZN each
        prizeAmount = totalPrizeAmount / tiedAttempts.length;
      }

      // Add all tied attempts to positions map with the same prize amount
      // All tied students should show the same prize amount
      for (const attempt of tiedAttempts) {
        attemptPositions.set(attempt.id, {
          position: currentPosition,
          prizeAmount: prizeAmount, // Same prize amount for all tied students
        });
      }

      currentPosition += tiedAttempts.length;
    }

    // Get exam with readingTexts
    const examWithReadingTexts = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        readingTexts: {
          select: {
            id: true,
            content: true,
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return {
      examId,
      examTitle: exam.title,
      totalAttempts,
      completedAttempts: completedAttemptsCount,
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalStudents: uniqueStudents,
      completionRate:
        totalAttempts > 0 ? completedAttemptsCount / totalAttempts : 0,
      exam: {
        readingTexts: examWithReadingTexts?.readingTexts || [],
      },
      attempts: attempts
        .map((attempt) => {
          const positionInfo = attemptPositions.get(attempt.id) || {
            position: 0,
            prizeAmount: 0,
          };
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
            answers: attempt.answers.map((answer) => {
              // Ensure readingText is mapped even if it wasn't included in the relation
              let readingText = answer.question.readingText;
              if (
                !readingText &&
                answer.question.readingTextId &&
                examWithReadingTexts?.readingTexts
              ) {
                readingText =
                  examWithReadingTexts.readingTexts.find(
                    (rt) => rt.id === answer.question.readingTextId,
                  ) || null;
              }

              return {
                id: answer.id,
                questionId: answer.questionId,
                questionType: answer.question.type,
                questionContent: answer.question.content,
                questionPoints: answer.question.points,
                modelAnswer: answer.question.modelAnswer,
                correctAnswer: answer.question.correctAnswer, // Add correct answer
                questionOptions: answer.question.options || [], // Add all options
                readingTextId: answer.question.readingTextId,
                readingText: readingText, // Already mapped
                optionId: answer.optionId,
                content: answer.content,
                isCorrect: answer.isCorrect,
                points: answer.points,
                option: answer.option,
              };
            }),
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

  async getSummary(
    teacherId: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    // Validate sortBy field
    const validSortFields = ['createdAt', 'title'];
    const validSortOrder =
      sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'asc';
    const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Yalnız yayımlanmış imtahanları gətir
    const exams = await this.prisma.exam.findMany({
      where: {
        teacherId,
        publishedAt: { not: null }, // Yalnız yayımlanmış imtahanlar
      },
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
      orderBy: {
        [validSortBy]: validSortOrder,
      },
    });

    const stats = exams
      .map((exam) => {
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

        // Format createdAt in Azerbaijani locale
        let formattedDate: string = '-';
        let formattedTime: string = '';

        if (exam.createdAt) {
          try {
            const date =
              exam.createdAt instanceof Date
                ? exam.createdAt
                : new Date(exam.createdAt);

            if (!isNaN(date.getTime())) {
              // Format date in Azerbaijani locale
              formattedDate = date.toLocaleDateString('az-AZ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              formattedTime = date.toLocaleTimeString('az-AZ', {
                hour: '2-digit',
                minute: '2-digit',
              });
            }
          } catch (e) {
            console.error('Error formatting createdAt:', e, exam.createdAt);
          }
        }

        return {
          examId: exam.id,
          examTitle: exam.title,
          totalAttempts: attempts.length,
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalStudents: new Set(attempts.map((a) => a.studentId)).size,
          completionRate:
            attempts.length > 0
              ? completedAttempts.length / attempts.length
              : 0,
          createdAt: formattedDate,
          createdAtTime: formattedTime,
        };
      })
      .filter((stat) => stat.totalAttempts > 0); // Yalnız cəhd sayı 0-dan böyük olan imtahanlar

    const totalAttempts = stats.reduce((sum, s) => sum + s.totalAttempts, 0);
    const overallAverage =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + s.averageScore, 0) / stats.length
        : 0;

    // Yalnız filtr edilmiş imtahanların tələbələrini say
    const filteredExamIds = new Set(stats.map((s) => s.examId));
    const filteredExams = exams.filter((exam) => filteredExamIds.has(exam.id));

    return {
      totalExams: stats.length, // Filtr edilmiş imtahanların sayı
      totalAttempts,
      overallAverage: parseFloat(overallAverage.toFixed(2)),
      totalStudents: new Set(
        filteredExams.flatMap((exam) => exam.attempts.map((a) => a.studentId)),
      ).size,
      examStats: stats,
    };
  }
}
