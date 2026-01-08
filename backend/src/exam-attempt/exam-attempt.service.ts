import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ExamAttemptStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ExamAttemptService {
  private readonly logger = new Logger(ExamAttemptService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async startExam(examId: string, studentId: string) {
    this.logger.log(
      `[START_EXAM] Başlanır: examId=${examId}, studentId=${studentId}`,
    );

    try {
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

      // ƏVVƏLCƏ mövcud attempt-i yoxla - əgər varsa və completed/expired deyilsə, birbaşa qaytar
      const existingAttempt = await this.prisma.examAttempt.findFirst({
        where: {
          examId,
          studentId,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      // Əgər attempt varsa və completed deyilsə
      if (existingAttempt) {
        // Completed attempts-ə icazə vermə
        if (existingAttempt.status === ExamAttemptStatus.COMPLETED) {
          throw new ForbiddenException(
            'Bu imtahanı artıq bitirmisiniz. Nəticələrinizə "İmtahanlarım" səhifəsindən baxa bilərsiniz.',
          );
        }

        // Attempt expired deyilsə, birbaşa imtahan səhifəsinə yönləndir
        const checkNow = new Date();
        const expiresAtDate = new Date(existingAttempt.expiresAt);

        if (checkNow <= expiresAtDate) {
          // Attempt hələ də aktivdir - ödənişsiz birbaşa imtahan səhifəsinə yönləndir
          this.logger.log(
            `Mövcud attempt istifadə olunur: attemptId=${existingAttempt.id}, ödəniş lazım deyil`,
          );

          // Exam questions-ı yüklə (attempt üçün)
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

          if (!examWithQuestions) {
            throw new NotFoundException('İmtahan tapılmadı');
          }

          // Remove correct answers
          if (examWithQuestions.questions) {
            examWithQuestions.questions.forEach((q) => {
              delete q.correctAnswer;
              delete q.modelAnswer;
            });
          }

          if (examWithQuestions.topics) {
            examWithQuestions.topics.forEach((topic) => {
              if (topic.questions) {
                topic.questions.forEach((q) => {
                  delete q.correctAnswer;
                  delete q.modelAnswer;
                });
              }
            });
          }

          // Combine all questions
          const allQuestions = [];
          if (examWithQuestions.topics) {
            examWithQuestions.topics.forEach((topic) => {
              if (topic.questions) {
                allQuestions.push(...topic.questions);
              }
            });
          }
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
            attemptId: existingAttempt.id,
            attempt: existingAttempt,
            exam: {
              ...examWithQuestions,
              allQuestions,
            },
          };
        } else {
          // Attempt expired - timed out olaraq işarələ
          this.logger.log(
            `Mövcud attempt keçmişdir, timed out olaraq işarələnir: attemptId=${existingAttempt.id}`,
          );
          await this.prisma.examAttempt.update({
            where: { id: existingAttempt.id },
            data: { status: ExamAttemptStatus.TIMED_OUT },
          });
          // Yeni attempt yaradılacaq (aşağıda)
        }
      }

      // Get user to check balance (yalnız yeni attempt üçün)
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

      // Check if user has enough balance (yalnız yeni attempt üçün)
      if (user.balance < examPrice) {
        throw new BadRequestException(
          `Balansınız kifayət etmir. İmtahan qiyməti: ${examPrice} AZN. Balansınız: ${user.balance.toFixed(2)} AZN`,
        );
      }

      // ƏVVƏLCƏ exam questions-ı yüklə və yoxla (xəta baş verərsə, balansdan çıxış olunmasın)
      // Bu yoxlama balansdan çıxmazdan ƏVVƏL edilməlidir
      // Tam formatda yükləyək ki, yenidən yükləməyə ehtiyac qalmasın
      const examWithQuestionsCheck = await this.prisma.exam.findUnique({
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

      if (!examWithQuestionsCheck) {
        throw new NotFoundException('İmtahan tapılmadı');
      }

      // İmtahanın sualları yoxdursa xəta at (balansdan çıxmazdan əvvəl)
      const hasQuestions =
        (examWithQuestionsCheck.questions &&
          examWithQuestionsCheck.questions.length > 0) ||
        (examWithQuestionsCheck.topics &&
          examWithQuestionsCheck.topics.some(
            (topic) => topic.questions && topic.questions.length > 0,
          ));

      if (!hasQuestions) {
        throw new BadRequestException(
          'İmtahanda sual yoxdur. İmtahanı başlada bilməzsiniz.',
        );
      }

      // Questions-ları birləşdir və yoxla (balansdan çıxmazdan əvvəl)
      const allQuestionsCheck = [];
      if (examWithQuestionsCheck.topics) {
        examWithQuestionsCheck.topics.forEach((topic) => {
          if (topic.questions) {
            allQuestionsCheck.push(...topic.questions);
          }
        });
      }
      if (examWithQuestionsCheck.questions) {
        allQuestionsCheck.push(...examWithQuestionsCheck.questions);
      }

      if (allQuestionsCheck.length === 0) {
        throw new BadRequestException(
          'İmtahanda sual yoxdur. İmtahanı başlada bilməzsiniz.',
        );
      }

      // ReadingText mapping-i də yoxla (balansdan çıxmazdan əvvəl)
      if (
        examWithQuestionsCheck.readingTexts &&
        examWithQuestionsCheck.readingTexts.length > 0
      ) {
        const readingTextsMap = new Map(
          examWithQuestionsCheck.readingTexts.map((rt) => [rt.id, rt]),
        );
        allQuestionsCheck.forEach((q: any) => {
          if (q.readingTextId && !q.readingText) {
            q.readingText = readingTextsMap.get(q.readingTextId) || null;
          }
        });
      }

      // Əgər attempt artıq yoxlanıldı və return edildiyisə, bura çatmamalıdır
      // Amma əgər attempt expired olubsa və yeni attempt lazımdırsa, aşağıda yaradılacaq

      // Yeni attempt yaratmaq lazımdırsa (existing attempt expired olubsa və ya yoxdursa)
      // Check if payment already exists (Stripe payment ilə gələn attempt)
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          examId,
          studentId,
          status: PaymentStatus.COMPLETED,
        },
        include: {
          attempt: true,
        },
      });

      const hasExistingPayment = !!existingPayment;

      // If payment exists with attempt and it's expired, mark as timed out
      if (existingPayment && existingPayment.attempt) {
        const paymentAttempt = existingPayment.attempt;
        if (paymentAttempt.status !== ExamAttemptStatus.COMPLETED) {
          const paymentCheckNow = new Date();
          const expiresAtDate = new Date(paymentAttempt.expiresAt);

          if (paymentCheckNow > expiresAtDate) {
            // Payment ilə gələn attempt expired - timed out olaraq işarələ
            this.logger.warn(
              `Payment ilə gələn attempt keçmişdir: attemptId=${paymentAttempt.id}, expiresAt=${expiresAtDate.toISOString()}`,
            );
            await this.prisma.examAttempt.update({
              where: { id: paymentAttempt.id },
              data: { status: ExamAttemptStatus.TIMED_OUT },
            });
            // Yeni attempt yaratılacaq
          }
        }
      }

      // Yeni attempt yarat (existing attempt expired olubsa və ya yoxdursa)
      // Bütün yoxlamalar artıq edildi (examWithQuestionsCheck yüklənib və yoxlanılıb)
      // İndi attempt yaradıla bilər
      // Calculate expiry date
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMinutes(expiresAt.getMinutes() + exam.duration);

      this.logger.log(
        `Yeni attempt yaradılır: examId=${examId}, studentId=${studentId}, duration=${exam.duration} dəqiqə, expiresAt=${expiresAt.toISOString()}`,
      );

      // Create attempt first
      let attempt = await this.prisma.examAttempt.create({
        data: {
          examId,
          studentId,
          expiresAt,
          status: ExamAttemptStatus.IN_PROGRESS,
        },
      });

      // Balansdan çıxış və müəllim/admin-ə paylama (yalnız payment yoxdursa)
      // Bütün yoxlamalar artıq edildi, burada xəta baş verərsə attempt silinəcək
      if (!hasExistingPayment) {
        try {
          await this.paymentService.deductFromBalanceForExam(
            studentId,
            examId,
            attempt.id,
          );
        } catch (err) {
          // Ödəniş baş tutmadısa attempt-i sil ki, student (examId, studentId) unique constraint ilə kilidlənməsin
          await this.prisma.examAttempt
            .delete({ where: { id: attempt.id } })
            .catch(() => undefined);
          throw err;
        }
      } else {
        this.logger.log(
          `Payment artıq var, balansdan çıxma lazım deyil: paymentId=${existingPayment?.id}`,
        );
      }

      // Attempt-i database-dən yenidən yüklə
      attempt = await this.prisma.examAttempt.findUnique({
        where: { id: attempt.id },
      });

      if (!attempt) {
        throw new NotFoundException('İmtahan cəhdi yaradıla bilmədi');
      }

      // Check if expired (attempt-i yenidən yükləyək)
      const currentAttempt = await this.prisma.examAttempt.findUnique({
        where: { id: attempt.id },
      });

      if (!currentAttempt) {
        throw new NotFoundException('İmtahan cəhdi tapılmadı');
      }

      // Tarixləri yoxla
      const currentNow = new Date();
      const expiresAtDate = new Date(currentAttempt.expiresAt);

      this.logger.log(
        `Attempt yoxlanılır: attemptId=${currentAttempt.id}, examId=${examId}, studentId=${studentId}`,
      );
      this.logger.log(`  - now: ${currentNow.toISOString()}`);
      this.logger.log(`  - expiresAt: ${expiresAtDate.toISOString()}`);
      this.logger.log(`  - exam.duration: ${exam.duration} dəqiqə`);
      this.logger.log(`  - expired: ${currentNow > expiresAtDate}`);

      if (currentNow > expiresAtDate) {
        this.logger.warn(
          `⚠️ Attempt keçmişdir! attemptId=${currentAttempt.id}, expiresAt=${expiresAtDate.toISOString()}, now=${currentNow.toISOString()}`,
        );
        await this.prisma.examAttempt.update({
          where: { id: currentAttempt.id },
          data: { status: ExamAttemptStatus.TIMED_OUT },
        });
        throw new ForbiddenException(
          `İmtahan müddəti bitib. Müddət: ${exam.duration} dəqiqə. Bitmə tarixi: ${expiresAtDate.toLocaleString('az-AZ')}`,
        );
      }

      // currentAttempt-i istifadə et
      attempt = currentAttempt;

      // Get exam with questions (without answers for student)
      // examWithQuestionsCheck artıq yüklənib və yoxlanılıb, istifadə edək
      const examWithQuestions = examWithQuestionsCheck;

      if (!examWithQuestions) {
        this.logger.error(
          `examWithQuestions undefined: examId=${examId}, studentId=${studentId}`,
        );
        throw new NotFoundException('İmtahan tapılmadı');
      }

      if (!attempt || !attempt.id) {
        this.logger.error(
          `attempt undefined: examId=${examId}, studentId=${studentId}`,
        );
        throw new NotFoundException('İmtahan cəhdi tapılmadı');
      }

      // Remove correct answers (examWithQuestionsCheck-dən istifadə edəndə də lazımdır)
      if (examWithQuestions.questions) {
        examWithQuestions.questions.forEach((q) => {
          delete q.correctAnswer;
          delete q.modelAnswer;
        });
      }

      if (examWithQuestions.topics) {
        examWithQuestions.topics.forEach((topic) => {
          if (topic.questions) {
            topic.questions.forEach((q) => {
              delete q.correctAnswer;
              delete q.modelAnswer;
            });
          }
        });
      }

      // Combine all questions (from topics and regular questions) and map readingText
      // Əgər examWithQuestionsCheck istifadə olunubsa, allQuestionsCheck artıq yaradılıb
      // Amma yenidən yaradaq ki, düzgün format olsun
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

      // Map readingTextId to readingText object (artıq examWithQuestionsCheck-də edildi, amma yenidən edək)
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

      this.logger.log(
        `✅ Attempt uğurla yaradıldı: attemptId=${attempt.id}, examId=${examId}, studentId=${studentId}, questionsCount=${allQuestions.length}`,
      );

      return {
        attemptId: attempt.id,
        attempt,
        exam: {
          ...examWithQuestions,
          allQuestions, // Add combined questions array
        },
      };
    } catch (error: any) {
      this.logger.error(
        `[START_EXAM_ERROR] examId=${examId}, studentId=${studentId}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
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

    // Award prizes to top 3 students (after exam is removed from published list - 3 days after publish)
    // We'll check when to award prizes - if exam was published 3+ days ago, award immediately
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

    // Check if 3 days have passed since publish date (exam is removed from published list)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const publishDate = new Date(exam.publishedAt);
    const shouldAwardPrizes = publishDate <= threeDaysAgo;

    console.log(
      `[PRIZE] Exam ${examId} - Published: ${publishDate}, ThreeDaysAgo: ${threeDaysAgo}, ShouldAward: ${shouldAwardPrizes}`,
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
    // If exam is still in published list (< 3 days), prizes will be awarded later
    // This will be handled when the next submission happens after 3 days pass
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

    // Check and award prizes if exam is no longer active (3 days passed)
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
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const examDetails = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        publishedAt: true,
      },
    });

    // Only award prizes if exam has been published for 3+ days
    if (examDetails?.publishedAt) {
      const publishDate = new Date(examDetails.publishedAt);
      if (publishDate <= threeDaysAgo) {
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
}
