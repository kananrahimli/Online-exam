import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ExamAttemptStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ExamAttemptService {
  constructor(private prisma: PrismaService) {}

  async startExam(examId: string, studentId: string) {
    // Check if exam exists and is published
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.status !== 'PUBLISHED') {
      throw new ForbiddenException('İmtahan yayımlanmayıb');
    }

    // Get user to check balance
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        balance: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    // Calculate exam price
    let examPrice = 3; // default 1 saat
    if (exam.duration === 60) examPrice = 3;
    else if (exam.duration === 120) examPrice = 5;
    else if (exam.duration === 180) examPrice = 10;

    // Check if user has enough balance
    if (user.balance < examPrice) {
      throw new BadRequestException(
        `Balansınız kifayət etmir. İmtahan qiyməti: ${examPrice} AZN. Balansınız: ${user.balance.toFixed(2)} AZN`,
      );
    }

    // Check if attempt already exists (completed or in progress)
    const existingAttempt = await this.prisma.examAttempt.findFirst({
      where: {
        examId,
        studentId,
        status: {
          in: [ExamAttemptStatus.IN_PROGRESS, ExamAttemptStatus.COMPLETED],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // If student already completed the exam, prevent starting again
    if (
      existingAttempt &&
      existingAttempt.status === ExamAttemptStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        'Bu imtahanı artıq bitirmisiniz. Nəticələrinizə "İmtahanlarım" səhifəsindən baxa bilərsiniz.',
      );
    }

    // If there's an in-progress attempt, use it
    let attempt = existingAttempt;

    // If no attempt exists, create a new one
    if (!attempt) {
      // Calculate expiry date
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

      // Deduct from balance
      await this.prisma.user.update({
        where: { id: studentId },
        data: {
          balance: {
            decrement: examPrice,
          },
        },
      });

      // Create payment record
      await this.prisma.payment.create({
        data: {
          studentId,
          examId,
          attemptId: attempt.id,
          amount: examPrice,
          status: PaymentStatus.COMPLETED,
          transactionId: `BAL-DED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    }

    // Check if expired
    if (new Date() > attempt.expiresAt) {
      await this.prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: ExamAttemptStatus.TIMED_OUT },
      });
      throw new ForbiddenException('İmtahan müddəti bitib');
    }

    // Get exam with questions (without answers for student)
    const examWithQuestions = await this.prisma.exam.findUnique({
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
          },
          orderBy: { order: 'asc' },
        },
        readingTexts: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Remove correct answers
    examWithQuestions.questions.forEach((q) => {
      delete q.correctAnswer;
      delete q.modelAnswer;
    });

    examWithQuestions.topics.forEach((topic) => {
      topic.questions.forEach((q) => {
        delete q.correctAnswer;
        delete q.modelAnswer;
      });
    });

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
                  },
                },
              },
            },
            questions: {
              include: {
                options: true,
              },
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

    // Remove correct answers
    attempt.exam.questions.forEach((q) => {
      delete q.correctAnswer;
      delete q.modelAnswer;
    });

    return attempt;
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
            questions: {
              include: {
                options: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
            topics: {
              include: {
                questions: {
                  include: {
                    options: {
                      orderBy: {
                        order: 'asc',
                      },
                    },
                  },
                },
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

    // Calculate score
    let totalScore = 0;
    let earnedScore = 0;

    // Helper function to check if answer is correct
    const checkAnswerCorrect = (question: any, answer: any): boolean => {
      if (question.type !== 'MULTIPLE_CHOICE') return false;
      if (!answer.optionId || !question.correctAnswer) return false;

      // If correctAnswer is already an option ID (new format - cuid is ~25 chars), compare directly
      if (question.correctAnswer.length > 15) {
        // Option IDs are usually long strings (cuid format ~25 characters)
        return answer.optionId === question.correctAnswer;
      }

      // If correctAnswer is an index (old format - "0", "1", "2", "3"), convert to option ID
      const correctAnswerIndex = parseInt(question.correctAnswer, 10);
      if (
        !isNaN(correctAnswerIndex) &&
        question.options &&
        question.options.length > correctAnswerIndex
      ) {
        // Options are already sorted by order, so we can use array index
        const correctOption = question.options[correctAnswerIndex];
        if (correctOption) {
          return answer.optionId === correctOption.id;
        }
      }

      return false;
    };

    // Process topic questions
    for (const topic of attempt.exam.topics) {
      for (const question of topic.questions) {
        totalScore += question.points;

        const answer = attempt.answers.find(
          (a) => a.questionId === question.id,
        );
        if (answer) {
          if (question.type === 'MULTIPLE_CHOICE') {
            const isCorrect = checkAnswerCorrect(question, answer);
            if (isCorrect) {
              earnedScore += question.points;
            }
            await this.prisma.answer.update({
              where: { id: answer.id },
              data: {
                isCorrect,
                points: isCorrect ? question.points : 0,
              },
            });
          } else if (question.type === 'OPEN_ENDED') {
            // Open-ended questions - compare with model answer using fuzzy matching
            const studentAnswer = (answer.content || '').trim().toLowerCase();
            const modelAnswer = (question.modelAnswer || '')
              .trim()
              .toLowerCase();

            // Normalize both answers (remove extra spaces, punctuation normalization)
            const normalize = (text: string) => {
              return text
                .replace(/\s+/g, ' ') // Multiple spaces to single space
                .replace(/[.,;:!?]/g, '') // Remove punctuation
                .trim();
            };

            const normalizedStudent = normalize(studentAnswer);
            const normalizedModel = normalize(modelAnswer);

            // Simple similarity check: if normalized answers are similar (80% match or exact match of keywords)
            let isCorrect = false;
            let points = 0;

            if (normalizedStudent === normalizedModel) {
              // Exact match after normalization
              isCorrect = true;
              points = question.points;
              earnedScore += question.points;
            } else if (
              normalizedStudent.length > 0 &&
              normalizedModel.length > 0
            ) {
              // Check if student answer contains key words from model answer (at least 60% similarity)
              const studentWords = normalizedStudent
                .split(' ')
                .filter((w) => w.length > 2);
              const modelWords = normalizedModel
                .split(' ')
                .filter((w) => w.length > 2);

              if (studentWords.length > 0 && modelWords.length > 0) {
                const matchingWords = studentWords.filter((word) =>
                  modelWords.some(
                    (modelWord) =>
                      modelWord.includes(word) || word.includes(modelWord),
                  ),
                ).length;

                const similarity =
                  matchingWords /
                  Math.max(studentWords.length, modelWords.length);

                if (similarity >= 0.6) {
                  isCorrect = true;
                  points = Math.round(question.points * similarity);
                  earnedScore += points;
                }
              }
            }

            await this.prisma.answer.update({
              where: { id: answer.id },
              data: {
                isCorrect,
                points,
              },
            });
          }
        }
      }
    }

    // Process regular questions
    for (const question of attempt.exam.questions) {
      totalScore += question.points;

      const answer = attempt.answers.find((a) => a.questionId === question.id);
      if (answer) {
        if (question.type === 'MULTIPLE_CHOICE') {
          const isCorrect = checkAnswerCorrect(question, answer);
          if (isCorrect) {
            earnedScore += question.points;
          }
          await this.prisma.answer.update({
            where: { id: answer.id },
            data: {
              isCorrect,
              points: isCorrect ? question.points : 0,
            },
          });
        } else if (question.type === 'OPEN_ENDED') {
          // Open-ended questions - compare with model answer using fuzzy matching
          const studentAnswer = (answer.content || '').trim().toLowerCase();
          const modelAnswer = (question.modelAnswer || '').trim().toLowerCase();

          // Normalize both answers (remove extra spaces, punctuation normalization)
          const normalize = (text: string) => {
            return text
              .replace(/\s+/g, ' ') // Multiple spaces to single space
              .replace(/[.,;:!?]/g, '') // Remove punctuation
              .trim();
          };

          const normalizedStudent = normalize(studentAnswer);
          const normalizedModel = normalize(modelAnswer);

          // Simple similarity check: if normalized answers are similar (80% match or exact match of keywords)
          let isCorrect = false;
          let points = 0;

          if (normalizedStudent === normalizedModel) {
            // Exact match after normalization
            isCorrect = true;
            points = question.points;
            earnedScore += question.points;
          } else if (
            normalizedStudent.length > 0 &&
            normalizedModel.length > 0
          ) {
            // Check if student answer contains key words from model answer (at least 60% similarity)
            const studentWords = normalizedStudent
              .split(' ')
              .filter((w) => w.length > 2);
            const modelWords = normalizedModel
              .split(' ')
              .filter((w) => w.length > 2);

            if (studentWords.length > 0 && modelWords.length > 0) {
              const matchingWords = studentWords.filter((word) =>
                modelWords.some(
                  (modelWord) =>
                    modelWord.includes(word) || word.includes(modelWord),
                ),
              ).length;

              const similarity =
                matchingWords /
                Math.max(studentWords.length, modelWords.length);

              if (similarity >= 0.6) {
                isCorrect = true;
                points = Math.round(question.points * similarity);
                earnedScore += points;
              }
            }
          }

          await this.prisma.answer.update({
            where: { id: answer.id },
            data: {
              isCorrect,
              points,
            },
          });
        }
      }
    }

    // Update attempt
    const updatedAttempt = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: ExamAttemptStatus.COMPLETED,
        score: earnedScore,
        totalScore,
        submittedAt: new Date(),
      },
    });

    // Award prizes to top 3 students (after exam is removed from published list - 7 days after publish)
    // We'll check when to award prizes - if exam was published 7+ days ago, award immediately
    // Otherwise, schedule for when exam is removed from published list
    await this.checkAndAwardPrizes(attempt.examId);

    return updatedAttempt;
  }

  private async checkAndAwardPrizes(examId: string) {
    // Check if exam exists and get publish date
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        publishedAt: true,
      },
    });

    if (!exam || !exam.publishedAt) {
      // Exam not published yet, don't award prizes
      return;
    }

    // Check if 7 days have passed since publish date (exam is removed from published list)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const publishDate = new Date(exam.publishedAt);
    const shouldAwardPrizes = publishDate <= sevenDaysAgo;

    if (shouldAwardPrizes) {
      // Exam has been removed from published list, award prizes now
      await this.awardPrizes(examId);
    }
    // If exam is still in published list (< 7 days), prizes will be awarded later
    // This will be handled when the next submission happens after 7 days pass
  }

  private async awardPrizes(examId: string) {
    // Get all completed attempts for this exam, sorted by score (desc) and submission time (asc)
    const allAttempts = await this.prisma.examAttempt.findMany({
      where: {
        examId,
        status: ExamAttemptStatus.COMPLETED,
      },
      include: {
        student: true,
      },
      orderBy: [
        { score: 'desc' },
        { submittedAt: 'asc' }, // Earlier submission wins tie
      ],
    });

    // Prize amounts: 1st = 10 AZN, 2nd = 7 AZN, 3rd = 3 AZN
    const prizes = [10, 7, 3];

    // Group attempts by score (percentage)
    const attemptsByScore = new Map<string, typeof allAttempts>();

    for (const attempt of allAttempts) {
      // Calculate score percentage for grouping
      const scorePercentage =
        attempt.score && attempt.totalScore && attempt.totalScore > 0
          ? (attempt.score / attempt.totalScore).toFixed(2)
          : '0.00';

      if (!attemptsByScore.has(scorePercentage)) {
        attemptsByScore.set(scorePercentage, []);
      }
      attemptsByScore.get(scorePercentage)!.push(attempt);
    }

    // Award prizes to top 3 positions (considering ties)
    let currentPosition = 1;
    const sortedScores = Array.from(attemptsByScore.keys()).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    for (const scorePercentage of sortedScores) {
      if (currentPosition > 3) break;

      const tiedAttempts = attemptsByScore.get(scorePercentage)!;

      // Calculate total prize amount for this position range
      let totalPrizeAmount = 0;
      const positionsInGroup = [];

      for (
        let i = 0;
        i < tiedAttempts.length && currentPosition + i <= 3;
        i++
      ) {
        const prizeIndex = currentPosition + i - 1;
        if (prizeIndex < prizes.length) {
          totalPrizeAmount += prizes[prizeIndex];
          positionsInGroup.push(currentPosition + i);
        }
      }

      // Split prize equally among tied students
      const prizePerStudent = totalPrizeAmount / tiedAttempts.length;

      // Award prizes to all tied students
      for (const attempt of tiedAttempts) {
        // Check if this student already received a prize for this exam
        const existingPrize = await this.prisma.payment.findFirst({
          where: {
            studentId: attempt.studentId,
            examId,
            transactionId: {
              startsWith: 'PRIZE-',
            },
          },
        });

        // Only award if not already awarded
        if (!existingPrize) {
          // Update student balance
          await this.prisma.user.update({
            where: { id: attempt.studentId },
            data: {
              balance: {
                increment: prizePerStudent,
              },
            },
          });

          // Create payment record for prize
          await this.prisma.payment.create({
            data: {
              studentId: attempt.studentId,
              examId,
              amount: prizePerStudent,
              status: PaymentStatus.COMPLETED,
              transactionId: `PRIZE-${currentPosition}-${examId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
          });
        }
      }

      // Move to next position after this group
      currentPosition += tiedAttempts.length;
    }
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
                  },
                },
              },
            },
            questions: {
              include: {
                options: true,
              },
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

    return attempt;
  }

  async getMyAttempts(studentId: string) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        studentId,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            subject: true,
            level: true,
            duration: true,
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
      orderBy: {
        startedAt: 'desc',
      },
    });

    return attempts;
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
          include: {
            question: true,
          },
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

    // Update answer points
    const isCorrect = points > 0;
    await this.prisma.answer.update({
      where: { id: answerId },
      data: {
        points,
        isCorrect,
      },
    });

    // Recalculate total score
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

    // Update attempt score
    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        score: earnedScore,
        totalScore,
      },
    });

    return {
      answerId,
      points,
      isCorrect,
      totalScore: earnedScore,
    };
  }
}
