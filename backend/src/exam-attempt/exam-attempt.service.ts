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
      include: {
        teacher: true,
      },
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
      const payment = await this.prisma.payment.create({
        data: {
          studentId,
          examId,
          attemptId: attempt.id,
          amount: examPrice,
          status: PaymentStatus.COMPLETED,
          transactionId: `BAL-DED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      // Split payment between teacher and admin (50/50)
      await this.splitPayment(payment.id, examPrice, exam.teacherId);
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
            readingText: true,
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

    // Combine all questions (from topics and regular questions) and map readingText
    const allQuestions = [];

    // Add questions from topics
    if (examWithQuestions.topics) {
      examWithQuestions.topics.forEach((topic) => {
        if (topic.questions) {
          allQuestions.push(...topic.questions);
        }
      });
    }

    // Add regular questions
    if (examWithQuestions.questions) {
      allQuestions.push(...examWithQuestions.questions);
    }

    // Map readingTextId to readingText object
    if (
      examWithQuestions.readingTexts &&
      examWithQuestions.readingTexts.length > 0
    ) {
      const readingTextsMap = new Map(
        examWithQuestions.readingTexts.map((rt) => [rt.id, rt]),
      );
      allQuestions.forEach((q: any) => {
        if (q.readingTextId && !q.readingText) {
          q.readingText = readingTextsMap.get(q.readingTextId) || null;
        }
      });
    }

    return {
      attempt,
      exam: {
        ...examWithQuestions,
        allQuestions, // Add combined questions array
      },
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
              orderBy: {
                order: 'asc',
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

    // Remove correct answers from topic questions too
    if (attempt.exam.topics) {
      attempt.exam.topics.forEach((topic) => {
        if (topic.questions) {
          topic.questions.forEach((q) => {
            delete q.correctAnswer;
            delete q.modelAnswer;
          });
        }
      });
    }

    // Combine all questions (from topics and regular questions) and map readingText
    const allQuestions = [];

    // Add questions from topics
    if (attempt.exam.topics) {
      attempt.exam.topics.forEach((topic) => {
        if (topic.questions) {
          allQuestions.push(...topic.questions);
        }
      });
    }

    // Add regular questions
    if (attempt.exam.questions) {
      allQuestions.push(...attempt.exam.questions);
    }

    // Map readingTextId to readingText object
    if (attempt.exam.readingTexts && attempt.exam.readingTexts.length > 0) {
      const readingTextsMap = new Map(
        attempt.exam.readingTexts.map((rt) => [rt.id, rt]),
      );
      allQuestions.forEach((q: any) => {
        if (q.readingTextId && !q.readingText) {
          q.readingText = readingTextsMap.get(q.readingTextId) || null;
        }
      });
    }

    return {
      ...attempt,
      exam: {
        ...attempt.exam,
        allQuestions, // Add combined questions array
      },
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
                      orderBy: {
                        order: 'asc',
                      },
                    },
                    readingText: true,
                  },
                },
              },
            },
            questions: {
              include: {
                options: {
                  orderBy: {
                    order: 'asc',
                  },
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

    // Award prizes to top 3 students (after exam is removed from published list - 1 hour after publish)
    // We'll check when to award prizes - if exam was published 1+ hour ago, award immediately
    // Otherwise, schedule for when exam is removed from published list
    await this.checkAndAwardPrizes(attempt.examId);

    return updatedAttempt;
  }

  async checkAndAwardPrizes(examId: string) {
    console.log(`[PRIZE] checkAndAwardPrizes called for examId: ${examId}`);

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
      console.log(
        `[PRIZE] Exam not found or not published yet for examId: ${examId}`,
      );
      return;
    }

    // Check if 1 hour has passed since publish date (exam is removed from published list)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const publishDate = new Date(exam.publishedAt);
    const shouldAwardPrizes = publishDate <= oneHourAgo;

    console.log(
      `[PRIZE] Exam ${examId} - Published: ${publishDate}, OneHourAgo: ${oneHourAgo}, ShouldAward: ${shouldAwardPrizes}`,
    );

    if (shouldAwardPrizes) {
      // Exam has been removed from published list, award prizes now
      console.log(`[PRIZE] Awarding prizes for examId: ${examId}`);
      await this.awardPrizes(examId);
    } else {
      console.log(
        `[PRIZE] Exam ${examId} is still active, prizes will be awarded later`,
      );
    }
    // If exam is still in published list (< 1 hour), prizes will be awarded later
    // This will be handled when the next submission happens after 1 hour passes
  }

  /**
   * Check and award prizes for all completed exams of a student
   * This is called when student logs in and accesses dashboard
   * Returns the newly awarded prize amount for the student
   */
  async checkAndAwardPrizesForStudent(studentId: string) {
    console.log(
      `[PRIZE] checkAndAwardPrizesForStudent called for studentId: ${studentId}`,
    );

    try {
      // Get list of existing prize payments before awarding (to calculate new prizes)
      const existingPrizePayments = await this.prisma.payment.findMany({
        where: {
          studentId,
          transactionId: {
            startsWith: 'PRIZE-',
          },
        },
        select: {
          id: true,
          examId: true,
          amount: true,
        },
      });

      const existingPrizeMap = new Map<string, number>();
      for (const payment of existingPrizePayments) {
        const currentAmount = existingPrizeMap.get(payment.examId) || 0;
        existingPrizeMap.set(payment.examId, currentAmount + payment.amount);
      }

      // Find all completed attempts for this student
      const completedAttempts = await this.prisma.examAttempt.findMany({
        where: {
          studentId,
          status: 'COMPLETED',
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
        console.log(
          `[PRIZE] No completed attempts found for student ${studentId}`,
        );
        return { checked: 0, awarded: 0, prizeAmount: 0, prizeExams: [] };
      }

      console.log(
        `[PRIZE] Found ${completedAttempts.length} completed attempts for student ${studentId}`,
      );

      // Get unique exam IDs
      const examIds = [
        ...new Set(completedAttempts.map((attempt) => attempt.examId)),
      ];

      let checkedCount = 0;
      let awardedCount = 0;

      // Check and award prizes for each exam
      for (const examId of examIds) {
        const attempt = completedAttempts.find((a) => a.examId === examId);
        const exam = attempt?.exam;

        if (!exam || !exam.publishedAt) {
          continue;
        }

        // Check if 1 hour has passed since publish date
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const publishDate = new Date(exam.publishedAt);

        if (publishDate <= oneHourAgo) {
          checkedCount++;
          // Check if this student already received a prize for this exam
          const existingPrize = await this.prisma.payment.findFirst({
            where: {
              studentId,
              examId,
              transactionId: {
                startsWith: 'PRIZE-',
              },
            },
          });

          if (!existingPrize) {
            // Check if prizes were already awarded globally for this exam
            const globalPrizes = await this.prisma.payment.findFirst({
              where: {
                examId,
                transactionId: {
                  startsWith: 'PRIZE-',
                },
              },
            });

            if (!globalPrizes) {
              // Prizes not awarded yet, check and award them
              console.log(
                `[PRIZE] Checking and awarding prizes for exam ${examId}`,
              );
              await this.awardPrizes(examId);
              awardedCount++;
            }
          }
        }
      }

      // Calculate newly awarded prize amount by checking new prize payments
      const allPrizePayments = await this.prisma.payment.findMany({
        where: {
          studentId,
          transactionId: {
            startsWith: 'PRIZE-',
          },
        },
        select: {
          examId: true,
          amount: true,
        },
      });

      // Calculate total prize amount for exams where this student won
      let totalPrizeAmount = 0;
      const prizeExamsForStudent: Array<{
        examId: string;
        examTitle: string;
      }> = [];

      for (const examId of examIds) {
        const examPayments = allPrizePayments.filter(
          (p) => p.examId === examId,
        );
        const examTotal = examPayments.reduce((sum, p) => sum + p.amount, 0);
        const existingAmount = existingPrizeMap.get(examId) || 0;
        const newlyAwarded = examTotal - existingAmount;

        if (newlyAwarded > 0) {
          totalPrizeAmount += newlyAwarded;
          const attempt = completedAttempts.find((a) => a.examId === examId);
          if (attempt?.exam) {
            prizeExamsForStudent.push({
              examId,
              examTitle: attempt.exam.title || 'Naməlum imtahan',
            });
          }
        }
      }

      console.log(
        `[PRIZE] Student ${studentId} - Checked: ${checkedCount} exams, Awarded: ${awardedCount} exams, Prize Amount: ${totalPrizeAmount} AZN`,
      );

      return {
        checked: checkedCount,
        awarded: awardedCount,
        prizeAmount: totalPrizeAmount,
        prizeExams: prizeExamsForStudent,
      };
    } catch (error) {
      console.error(
        `[PRIZE] Error checking prizes for student ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  private async awardPrizes(examId: string) {
    console.log(`[PRIZE] awardPrizes called for examId: ${examId}`);

    // Get exam details to check for open-ended questions
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    if (!exam) {
      console.log(`[PRIZE] Exam ${examId} not found`);
      return;
    }

    // Check if exam has open-ended questions
    const hasOpenEndedQuestions = exam.questions.some(
      (q) => q.type === 'OPEN_ENDED',
    );

    // Get all completed attempts for this exam, sorted by score (desc) and submission time (asc)
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
      orderBy: [
        { score: 'desc' },
        { submittedAt: 'asc' }, // Earlier submission wins tie
      ],
    });

    console.log(
      `[PRIZE] Found ${allAttempts.length} completed attempts for exam ${examId}`,
    );

    // If exam has open-ended questions, verify that all open-ended answers are graded
    // (i.e., they have been manually graded by teacher, not just auto-graded)
    if (hasOpenEndedQuestions && allAttempts.length > 0) {
      // Get all open-ended question IDs for this exam
      const openEndedQuestionIds = exam.questions
        .filter((q) => q.type === 'OPEN_ENDED')
        .map((q) => q.id);

      // Check if all attempts have answers for all open-ended questions
      for (const attempt of allAttempts) {
        const openEndedAnswers = attempt.answers.filter((ans) =>
          openEndedQuestionIds.includes(ans.question.id),
        );

        // If not all open-ended questions have been answered, results are not ready
        if (openEndedAnswers.length < openEndedQuestionIds.length) {
          console.log(
            `[PRIZE] Exam ${examId} - Not all open-ended questions answered for attempt ${attempt.id}. Results not ready yet.`,
          );
          return;
        }
      }

      // All attempts have answers for all open-ended questions
      // At this point, we assume that all students have completed the exam
      // and provided answers to all open-ended questions.
      // Manual grading can be done by teacher, and when they grade, prizes will be recalculated.
      console.log(
        `[PRIZE] All attempts have answers for all open-ended questions. Proceeding with prize awarding.`,
      );
    }

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
          console.log(
            `[PRIZE] Awarding ${prizePerStudent} AZN to student ${attempt.studentId} (position ${currentPosition})`,
          );

          // Update student balance
          const updatedUser = await this.prisma.user.update({
            where: { id: attempt.studentId },
            data: {
              balance: {
                increment: prizePerStudent,
              },
            },
            select: {
              id: true,
              balance: true,
            },
          });

          console.log(
            `[PRIZE] Student ${attempt.studentId} balance updated to: ${updatedUser.balance} AZN`,
          );

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
        } else {
          console.log(
            `[PRIZE] Student ${attempt.studentId} already received prize for exam ${examId}`,
          );
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
              orderBy: {
                order: 'asc',
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

    // Check and award prizes if exam is no longer active (1 hour passed)
    await this.checkAndAwardPrizes(attempt.examId);

    // Combine all questions (from topics and regular questions) and map readingText
    const allQuestions = [];

    // Add questions from topics
    if (attempt.exam.topics) {
      attempt.exam.topics.forEach((topic) => {
        if (topic.questions) {
          allQuestions.push(...topic.questions);
        }
      });
    }

    // Add regular questions
    if (attempt.exam.questions) {
      allQuestions.push(...attempt.exam.questions);
    }

    // Map readingTextId to readingText object
    if (attempt.exam.readingTexts && attempt.exam.readingTexts.length > 0) {
      const readingTextsMap = new Map(
        attempt.exam.readingTexts.map((rt) => [rt.id, rt]),
      );
      allQuestions.forEach((q: any) => {
        if (q.readingTextId && !q.readingText) {
          q.readingText = readingTextsMap.get(q.readingTextId) || null;
        }
      });
    }

    return {
      ...attempt,
      exam: {
        ...attempt.exam,
        allQuestions, // Add combined questions array
      },
    };
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
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Check and award prizes for exams that are no longer active (7 days passed)
    const uniqueExamIds = [...new Set(attempts.map((a) => a.exam.id))];
    for (const examId of uniqueExamIds) {
      await this.checkAndAwardPrizes(examId);
    }

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

    // After manual grading, check if all results are ready and award prizes
    // This ensures prizes are awarded after teacher finishes grading all open-ended questions
    const examId = attempt.examId;
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const examDetails = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        publishedAt: true,
      },
    });

    // Only award prizes if exam has been published for 1+ hour
    if (examDetails?.publishedAt) {
      const publishDate = new Date(examDetails.publishedAt);
      if (publishDate <= oneHourAgo) {
        console.log(
          `[PRIZE] Manual grading completed for exam ${examId}. Checking if prizes should be awarded.`,
        );
        // Check and award prizes after manual grading
        await this.checkAndAwardPrizes(examId);
      }
    }

    return {
      answerId,
      points,
      isCorrect,
      totalScore: earnedScore,
    };
  }

  private async splitPayment(
    paymentId: string,
    amount: number,
    teacherId: string,
  ) {
    // Split 50/50 between teacher and admin
    const teacherAmount = amount / 2;
    const adminAmount = amount / 2;

    // Get admin user
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    // Create payment splits
    await this.prisma.paymentSplit.createMany({
      data: [
        {
          paymentId,
          teacherId: teacherId,
          amount: teacherAmount,
        },
        {
          paymentId,
          adminId: admin?.id || null,
          amount: adminAmount,
        },
      ],
    });

    // Update teacher balance
    await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        teacherBalance: {
          increment: teacherAmount,
        },
      },
    });
  }
}
