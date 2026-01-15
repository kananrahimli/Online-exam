// src/exam-attempt/exam-attempt.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAnswersDto } from '../dto/submit-answers.dto';
import { ExamAttemptStatus } from '@prisma/client';
import { ExamQuestionsHelper } from '../helpers/exam-questions.helper';
import { PaymentService } from '../../payment/payment.service';
import { GradingService } from './grading.service';
import { PrizeAwardService, PrizeCheckResult } from './prize-award.service';

@Injectable()
export class ExamAttemptService {
  private readonly logger = new Logger(ExamAttemptService.name);

  constructor(
    private prisma: PrismaService,
    private examQuestionsHelper: ExamQuestionsHelper,
    private paymentService: PaymentService,
    private gradingService: GradingService,
    private prizeAwardService: PrizeAwardService,
  ) {}

  async startExam(examId: string, studentId: string) {
    // Verify exam exists and is published
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { teacher: true },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.status !== 'PUBLISHED') {
      throw new ForbiddenException('İmtahan yayımlanmayıb');
    }

    // Get user and check balance
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, balance: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    // Calculate and verify balance
    const examPrice = this.paymentService.calculateExamPrice(exam.duration);

    if (user.balance < examPrice) {
      throw new BadRequestException(
        `Balansınız kifayət etmir. İmtahan qiyməti: ${examPrice} AZN. Balansınız: ${user.balance.toFixed(2)} AZN`,
      );
    }

    // Check for existing attempts
    const existingAttempt = await this.prisma.examAttempt.findFirst({
      where: {
        examId,
        studentId,
        status: {
          in: [ExamAttemptStatus.IN_PROGRESS, ExamAttemptStatus.COMPLETED],
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Prevent re-taking completed exam
    if (
      existingAttempt &&
      existingAttempt.status === ExamAttemptStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Bu imtahanı artıq bitirmisiniz. Nəticələrinizə "İmtahanlarım" səhifəsindən baxa bilərsiniz.',
      );
    }

    let attempt = existingAttempt;

    // Create new attempt if needed
    if (!attempt) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + exam.duration);

      attempt = await this.prisma.examAttempt.create({
        data: {
          examId,
          studentId,
          expiresAt,
          status: ExamAttemptStatus.IN_PROGRESS,
        },
      });

      // Process payment
      await this.paymentService.deductExamPayment(
        studentId,
        examId,
        attempt.id,
        examPrice,
        exam.teacherId,
      );
    }

    // Check if attempt expired
    if (new Date() > attempt.expiresAt) {
      await this.prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: ExamAttemptStatus.TIMED_OUT },
      });
      throw new ForbiddenException('İmtahan müddəti bitib');
    }

    // Get exam with questions
    const examWithQuestions = await this.getExamWithQuestionsForStudent(examId);

    return {
      attempt,
      exam: examWithQuestions,
    };
  }

  async getAttempt(attemptId: string, studentId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            topics: {
              include: {
                questions: {
                  include: {
                    options: true,
                    readingText: true,
                  },
                },
              },
            },
            questions: {
              include: {
                options: true,
                readingText: true,
              },
            },
            readingTexts: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('İmtahan cəhdi tapılmadı');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    // Prepare exam data for student view
    const preparedExam = this.examQuestionsHelper.prepareExamWithQuestions(
      attempt.exam,
    );

    return {
      ...attempt,
      exam: preparedExam,
    };
  }

  async submitAnswer(
    attemptId: string,
    studentId: string,
    submitAnswersDto: SubmitAnswersDto,
  ) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('İmtahan cəhdi tapılmadı');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Bitmiş imtahana cavab əlavə edilə bilməz');
    }

    if (new Date() > attempt.expiresAt) {
      throw new BadRequestException('İmtahan müddəti bitib');
    }

    const { questionId, optionId, content } = submitAnswersDto;

    // Upsert answer
    await this.prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        optionId,
        content,
      },
      create: {
        attemptId,
        questionId,
        optionId,
        content,
      },
    });

    return { message: 'Answer saved' };
  }

  async submitExam(attemptId: string, studentId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            topics: {
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: { order: 'asc' },
                    },
                    readingText: true,
                  },
                },
              },
            },
            questions: {
              include: {
                options: {
                  orderBy: { order: 'asc' },
                },
                readingText: true,
              },
            },
          },
        },
        answers: {
          include: {
            question: true,
            option: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('İmtahan cəhdi tapılmadı');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('İmtahan artıq təqdim olunub');
    }

    // Grade all answers
    let earnedScore = 0;

    // Grade topic questions
    for (const topic of attempt.exam.topics) {
      for (const question of topic.questions) {
        const answer = attempt.answers.find(
          (a) => a.questionId === question.id,
        );
        if (answer) {
          const { earnedPoints } = await this.gradingService.gradeAnswer(
            question,
            answer,
          );
          earnedScore += earnedPoints;
        }
      }
    }

    // Grade regular questions
    for (const question of attempt.exam.questions) {
      const answer = attempt.answers.find((a) => a.questionId === question.id);
      if (answer) {
        const { earnedPoints } = await this.gradingService.gradeAnswer(
          question,
          answer,
        );
        earnedScore += earnedPoints;
      }
    }

    // Calculate total score
    const { totalScore } =
      await this.gradingService.calculateAttemptScore(attemptId);

    // Update attempt status
    const updatedAttempt = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: ExamAttemptStatus.COMPLETED,
        score: earnedScore,
        totalScore,
        submittedAt: new Date(),
      },
    });

    // Check and award prizes if applicable
    await this.prizeAwardService.checkAndAwardPrizesForExam(attempt.examId);

    return updatedAttempt;
  }

  async getResult(attemptId: string, studentId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            topics: {
              include: {
                questions: {
                  include: {
                    options: true,
                    readingText: true,
                  },
                },
              },
            },
            questions: {
              include: {
                options: true,
                readingText: true,
              },
            },
            readingTexts: {
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: {
          include: {
            option: true,
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('İmtahan cəhdi tapılmadı');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    if (attempt.status !== ExamAttemptStatus.COMPLETED) {
      throw new BadRequestException('İmtahan hələ təqdim olunmayıb');
    }

    // Prepare exam with all questions
    const allQuestions = this.examQuestionsHelper.combineAllQuestions(
      attempt.exam,
    );

    if (attempt.exam.readingTexts) {
      this.examQuestionsHelper.mapReadingTexts(
        allQuestions,
        attempt.exam.readingTexts,
      );
    }

    return {
      ...attempt,
      exam: {
        ...attempt.exam,
        allQuestions,
      },
    };
  }

  async getMyAttempts(studentId: string) {
    return this.prisma.examAttempt.findMany({
      where: { studentId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            level: true,
            duration: true,
            publishedAt: true,
            createdAt: true,
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async gradeAnswer(
    attemptId: string,
    answerId: string,
    points: number,
    teacherId: string,
  ) {
    // Get attempt and verify ownership
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        answers: {
          where: { id: answerId },
          include: { question: true },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('İmtahan cəhdi tapılmadı');
    }

    if (attempt.exam.teacherId !== teacherId) {
      throw new ForbiddenException('Giriş icazəsi verilmədi');
    }

    if (attempt.status !== ExamAttemptStatus.COMPLETED) {
      throw new BadRequestException('İmtahan hələ təqdim olunmayıb');
    }

    const answer = attempt.answers[0];
    if (!answer) {
      throw new NotFoundException('Cavab tapılmadı');
    }

    const question = answer.question;
    if (question.type !== 'OPEN_ENDED') {
      throw new BadRequestException(
        'Yalnız açıq sualların balları dəyişdirilə bilər',
      );
    }

    // Validate points
    if (points < 0 || points > question.points) {
      throw new BadRequestException(
        `Bal 0-dan ${question.points}-ə qədər ola bilər`,
      );
    }

    // Update answer
    const isCorrect = points > 0;
    await this.prisma.answer.update({
      where: { id: answerId },
      data: { points, isCorrect },
    });

    // Recalculate total score
    const { totalScore, earnedScore } =
      await this.gradingService.calculateAttemptScore(attemptId);

    // Update attempt
    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        score: earnedScore,
        totalScore,
      },
    });

    // Re-check prizes after manual grading
    const examDetails = await this.prisma.exam.findUnique({
      where: { id: attempt.examId },
      select: { publishedAt: true },
    });

    if (examDetails?.publishedAt) {
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      if (new Date(examDetails.publishedAt) <= tenMinutesAgo) {
        this.logger.log(
          `Manual grading completed for exam ${attempt.examId}. Recalculating prizes.`,
        );
        await this.prizeAwardService.awardPrizesForExam(attempt.examId);
      }
    }

    return {
      answerId,
      points,
      isCorrect,
      totalScore: earnedScore,
    };
  }

  /**
   * Check and award prizes for an exam (called manually or after exam completion)
   */
  async checkAndAwardPrizesForExam(examId: string): Promise<void> {
    return this.prizeAwardService.checkAndAwardPrizesForExam(examId);
  }

  /**
   * Check and award prizes for student (called on login/dashboard)
   */
  async checkAndAwardPrizesForStudent(
    studentId: string,
  ): Promise<PrizeCheckResult> {
    return this.prizeAwardService.checkAndAwardPrizesForStudent(studentId);
  }

  /**
   * Helper method to get exam with questions for student view
   */
  private async getExamWithQuestionsForStudent(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        topics: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        questions: {
          include: {
            options: true,
            readingText: true,
          },
          orderBy: { order: 'asc' },
        },
        readingTexts: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    return this.examQuestionsHelper.prepareExamWithQuestions(exam);
  }
}
