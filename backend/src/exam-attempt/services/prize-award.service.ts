// src/exam-attempt/services/prize-award.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamAttemptStatus } from '@prisma/client';
import { PRIZE_CONFIG } from '../../config/prizes.config';
import { PaymentService } from '../../payment/payment.service';

export interface PrizeCheckResult {
  checked: number;
  awarded: number;
  prizeAmount: number;
  prizeExams: Array<{
    examId: string;
    examTitle: string;
  }>;
}

@Injectable()
export class PrizeAwardService {
  private readonly logger = new Logger(PrizeAwardService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  /**
   * Checks if enough time has passed since exam publication
   */
  private hasAwardDelayPassed(publishedAt: Date): boolean {
    const delayMinutesAgo = new Date();
    delayMinutesAgo.setMinutes(
      delayMinutesAgo.getMinutes() - PRIZE_CONFIG.awardsDelayMinutes,
    );
    return new Date(publishedAt) <= delayMinutesAgo;
  }

  /**
   * Checks if exam has open-ended questions that need manual grading
   */
  private async hasOpenEndedQuestions(examId: string): Promise<boolean> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        questions: {
          where: { type: 'OPEN_ENDED' },
          select: { id: true },
        },
      },
    });

    return (exam?.questions?.length || 0) > 0;
  }

  /**
   * Validates that all open-ended questions are answered
   */
  private async validateOpenEndedAnswers(
    examId: string,
    attempts: any[],
  ): Promise<boolean> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        questions: {
          where: { type: 'OPEN_ENDED' },
          select: { id: true },
        },
      },
    });

    const openEndedQuestionIds = exam?.questions?.map((q) => q.id) || [];
    if (openEndedQuestionIds.length === 0) return true;

    // Check if all attempts have answers for all open-ended questions
    for (const attempt of attempts) {
      const openEndedAnswers = attempt.answers.filter((ans) =>
        openEndedQuestionIds.includes(ans.question.id),
      );

      if (openEndedAnswers.length < openEndedQuestionIds.length) {
        this.logger.log(
          `Exam ${examId} - Not all open-ended questions answered for attempt ${attempt.id}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Awards prizes to top 3 students for an exam
   */
  async awardPrizesForExam(examId: string): Promise<void> {
    this.logger.log(`Starting prize award process for exam ${examId}`);

    // Check if prizes already awarded (at least 3 prizes exist)
    const existingPrizeCount =
      await this.paymentService.countExamPrizes(examId);

    if (existingPrizeCount >= 3) {
      this.logger.log(
        `Prizes already awarded for exam ${examId} (${existingPrizeCount} prizes found)`,
      );
      return;
    }

    // Check for open-ended questions
    const hasOpenEnded = await this.hasOpenEndedQuestions(examId);

    // Get all completed attempts
    const allAttempts = await this.prisma.examAttempt.findMany({
      where: {
        examId,
        status: ExamAttemptStatus.COMPLETED,
      },
      include: {
        student: true,
        answers: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
    });

    if (allAttempts.length === 0) {
      this.logger.log(`No completed attempts found for exam ${examId}`);
      return;
    }

    // Validate open-ended answers if applicable
    if (hasOpenEnded) {
      const allAnswered = await this.validateOpenEndedAnswers(
        examId,
        allAttempts,
      );
      if (!allAnswered) {
        this.logger.log(
          `Not all open-ended questions answered for exam ${examId}. Skipping prize award.`,
        );
        return;
      }
    }

    // Get existing prizes for batch checking
    const studentIds = allAttempts.map((a) => a.studentId);
    const existingPrizesMap = await this.paymentService.getExistingPrizes(
      studentIds,
      [examId],
    );
    const studentsWithPrizes = existingPrizesMap.get(examId) || new Set();

    // Group attempts by score percentage
    const attemptsByScore = this.groupAttemptsByScore(allAttempts);
    const sortedScores = Array.from(attemptsByScore.keys()).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    // Award prizes
    let currentPosition = 1;

    for (const scorePercentage of sortedScores) {
      if (currentPosition > 3) break;

      const tiedAttempts = attemptsByScore.get(scorePercentage)!;

      // Calculate prize pool for this position group
      const { totalPrize } = this.calculatePrizePool(
        currentPosition,
        tiedAttempts.length,
      );

      const prizePerStudent = totalPrize / tiedAttempts.length;

      // Award prizes to students who haven't received them
      for (const attempt of tiedAttempts) {
        if (!studentsWithPrizes.has(attempt.studentId)) {
          await this.paymentService.awardPrize(
            attempt.studentId,
            examId,
            prizePerStudent,
            currentPosition,
          );
          studentsWithPrizes.add(attempt.studentId);
        }
      }

      currentPosition += tiedAttempts.length;
    }

    this.logger.log(`Prize award completed for exam ${examId}`);
  }

  /**
   * Groups attempts by score percentage for tie handling
   */
  private groupAttemptsByScore(attempts: any[]): Map<string, typeof attempts> {
    const attemptsByScore = new Map<string, typeof attempts>();

    for (const attempt of attempts) {
      const scorePercentage =
        attempt.score && attempt.totalScore && attempt.totalScore > 0
          ? (attempt.score / attempt.totalScore).toFixed(2)
          : '0.00';

      if (!attemptsByScore.has(scorePercentage)) {
        attemptsByScore.set(scorePercentage, []);
      }
      attemptsByScore.get(scorePercentage)!.push(attempt);
    }

    return attemptsByScore;
  }

  /**
   * Calculates total prize pool for a position group (handles ties)
   */
  private calculatePrizePool(
    startPosition: number,
    groupSize: number,
  ): { totalPrize: number; positions: number[] } {
    let totalPrize = 0;
    const positions = [];

    for (let i = 0; i < groupSize && startPosition + i <= 3; i++) {
      const prizeIndex = startPosition + i - 1;
      if (prizeIndex < PRIZE_CONFIG.amounts.length) {
        totalPrize += PRIZE_CONFIG.amounts[prizeIndex];
        positions.push(startPosition + i);
      }
    }

    return { totalPrize, positions };
  }

  /**
   * Checks and awards prizes for a single exam (called after exam submission)
   */
  async checkAndAwardPrizesForExam(examId: string): Promise<void> {
    this.logger.log(`Checking prizes for exam ${examId}`);

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        publishedAt: true,
      },
    });

    if (!exam || !exam.publishedAt) {
      this.logger.log(`Exam ${examId} not found or not published`);
      return;
    }

    if (this.hasAwardDelayPassed(exam.publishedAt)) {
      this.logger.log(
        `Award delay passed for exam ${examId}. Awarding prizes.`,
      );
      await this.awardPrizesForExam(examId);
    } else {
      this.logger.log(`Award delay not passed yet for exam ${examId}`);
    }
  }

  /**
   * Checks and awards prizes for all completed exams of a student
   * Called when student logs in
   */
  async checkAndAwardPrizesForStudent(
    studentId: string,
  ): Promise<PrizeCheckResult> {
    this.logger.log(`Checking prizes for student ${studentId}`);

    try {
      // Get completed attempts
      const completedAttempts = await this.prisma.examAttempt.findMany({
        where: {
          studentId,
          status: ExamAttemptStatus.COMPLETED,
        },
        include: {
          exam: {
            select: {
              id: true,
              publishedAt: true,
              status: true,
              title: true,
            },
          },
        },
      });

      if (completedAttempts.length === 0) {
        return { checked: 0, awarded: 0, prizeAmount: 0, prizeExams: [] };
      }

      const examIds = [
        ...new Set(completedAttempts.map((attempt) => attempt.examId)),
      ];

      // Get existing prizes for this student (batch query)
      const existingPrizesMap = await this.paymentService.getExistingPrizes(
        [studentId],
        examIds,
      );

      let checkedCount = 0;
      let awardedCount = 0;
      const examsBefore = new Set<string>();

      // Collect exams where student already has prizes
      examIds.forEach((examId) => {
        const studentsWithPrizes = existingPrizesMap.get(examId);
        if (studentsWithPrizes?.has(studentId)) {
          examsBefore.add(examId);
        }
      });

      // Check each exam
      for (const examId of examIds) {
        // Skip if student already has prize for this exam
        if (examsBefore.has(examId)) {
          this.logger.log(
            `Student ${studentId} already has prize for exam ${examId}`,
          );
          continue;
        }

        const attempt = completedAttempts.find((a) => a.examId === examId);
        const exam = attempt?.exam;

        if (!exam || !exam.publishedAt) continue;

        // Check if delay has passed
        if (this.hasAwardDelayPassed(exam.publishedAt)) {
          // Check if prizes already awarded for this exam
          const prizeCount = await this.paymentService.countExamPrizes(examId);

          if (prizeCount >= 3) {
            this.logger.log(`Prizes already awarded for exam ${examId}`);
            continue;
          }

          checkedCount++;

          // Double-check this student doesn't have prize (race condition prevention)
          const doubleCheck = await this.prisma.payment.findFirst({
            where: {
              studentId,
              examId,
              transactionId: { startsWith: 'PRIZE-' },
            },
          });

          if (!doubleCheck) {
            this.logger.log(
              `Awarding prizes for exam ${examId} (student ${studentId} eligible)`,
            );
            await this.awardPrizesForExam(examId);
            awardedCount++;
          }
        }
      }

      // Calculate newly awarded prizes
      const allPrizePayments = await this.prisma.payment.findMany({
        where: {
          studentId,
          transactionId: { startsWith: 'PRIZE-' },
        },
        select: {
          examId: true,
          amount: true,
        },
      });

      let totalPrizeAmount = 0;
      const prizeExamsForStudent: Array<{
        examId: string;
        examTitle: string;
      }> = [];

      // Calculate new prizes (compare with examsBefore)
      for (const examId of examIds) {
        const examPayments = allPrizePayments.filter(
          (p) => p.examId === examId,
        );
        const examTotal = examPayments.reduce((sum, p) => sum + p.amount, 0);

        if (examTotal > 0 && !examsBefore.has(examId)) {
          totalPrizeAmount += examTotal;
          const attempt = completedAttempts.find((a) => a.examId === examId);
          if (attempt?.exam) {
            prizeExamsForStudent.push({
              examId,
              examTitle: attempt.exam.title || 'Naməlum imtahan',
            });
          }
        }
      }

      this.logger.log(
        `Student ${studentId} - Checked: ${checkedCount}, Awarded: ${awardedCount}, Prize: ${totalPrizeAmount} AZN`,
      );

      return {
        checked: checkedCount,
        awarded: awardedCount,
        prizeAmount: totalPrizeAmount,
        prizeExams: prizeExamsForStudent,
      };
    } catch (error) {
      this.logger.error(
        `Error checking prizes for student ${studentId}`,
        error.stack,
      );
      throw error;
    }
  }
}
