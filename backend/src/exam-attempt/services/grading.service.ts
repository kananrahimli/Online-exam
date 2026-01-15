// src/exam-attempt/services/grading.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EXAM_CONFIG } from '../../config/prizes.config';

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Normalizes text for comparison (removes extra spaces and punctuation)
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[.,;:!?]/g, '')
      .trim();
  }

  /**
   * Checks if a multiple choice answer is correct
   */
  checkMultipleChoiceAnswer(question: any, answer: any): boolean {
    if (question.type !== 'MULTIPLE_CHOICE') return false;
    if (!answer.optionId || !question.correctAnswer) return false;

    // If correctAnswer is an option ID (new format - cuid ~25 chars)
    if (question.correctAnswer.length > 15) {
      return answer.optionId === question.correctAnswer;
    }

    // If correctAnswer is an index (old format - "0", "1", "2", "3")
    const correctAnswerIndex = parseInt(question.correctAnswer, 10);
    if (
      !isNaN(correctAnswerIndex) &&
      question.options &&
      question.options.length > correctAnswerIndex
    ) {
      const correctOption = question.options[correctAnswerIndex];
      if (correctOption) {
        return answer.optionId === correctOption.id;
      }
    }

    return false;
  }

  /**
   * Grades an open-ended question based on similarity to model answer
   */
  gradeOpenEndedQuestion(
    question: any,
    answer: any,
  ): { isCorrect: boolean; points: number } {
    const studentAnswer = (answer.content || '').trim().toLowerCase();
    const modelAnswer = (question.modelAnswer || '').trim().toLowerCase();

    const normalizedStudent = this.normalizeText(studentAnswer);
    const normalizedModel = this.normalizeText(modelAnswer);

    let isCorrect = false;
    let points = 0;

    // Exact match after normalization
    if (normalizedStudent === normalizedModel) {
      isCorrect = true;
      points = question.points;
      return { isCorrect, points };
    }

    // Check similarity based on matching words
    if (normalizedStudent.length > 0 && normalizedModel.length > 0) {
      const studentWords = normalizedStudent
        .split(' ')
        .filter((w) => w.length > EXAM_CONFIG.minWordLengthForMatching);

      const modelWords = normalizedModel
        .split(' ')
        .filter((w) => w.length > EXAM_CONFIG.minWordLengthForMatching);

      if (studentWords.length > 0 && modelWords.length > 0) {
        const matchingWords = studentWords.filter((word) =>
          modelWords.some(
            (modelWord) => modelWord.includes(word) || word.includes(modelWord),
          ),
        ).length;

        const similarity =
          matchingWords / Math.max(studentWords.length, modelWords.length);

        if (similarity >= EXAM_CONFIG.openEndedSimilarityThreshold) {
          isCorrect = true;
          points = Math.round(question.points * similarity);
        }
      }
    }

    return { isCorrect, points };
  }

  /**
   * Grades a single answer and updates it in database
   */
  async gradeAnswer(
    question: any,
    answer: any,
  ): Promise<{ earnedPoints: number }> {
    let earnedPoints = 0;
    let isCorrect = false;
    let points = 0;

    if (question.type === 'MULTIPLE_CHOICE') {
      isCorrect = this.checkMultipleChoiceAnswer(question, answer);
      points = isCorrect ? question.points : 0;
      earnedPoints = points;
    } else if (question.type === 'OPEN_ENDED') {
      const result = this.gradeOpenEndedQuestion(question, answer);
      isCorrect = result.isCorrect;
      points = result.points;
      earnedPoints = points;
    }

    await this.prisma.answer.update({
      where: { id: answer.id },
      data: {
        isCorrect,
        points,
      },
    });

    return { earnedPoints };
  }

  /**
   * Calculates total score for an attempt
   */
  async calculateAttemptScore(attemptId: string): Promise<{
    totalScore: number;
    earnedScore: number;
  }> {
    const allAnswers = await this.prisma.answer.findMany({
      where: { attemptId },
      include: {
        question: true,
      },
    });

    const totalScore = allAnswers.reduce(
      (sum, ans) => sum + (ans.question.points || 0),
      0,
    );

    const earnedScore = allAnswers.reduce(
      (sum, ans) => sum + (ans.points || 0),
      0,
    );

    return { totalScore, earnedScore };
  }
}
