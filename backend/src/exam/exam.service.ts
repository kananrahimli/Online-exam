import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamStatus, ExamAttemptStatus, PaymentStatus } from '@prisma/client';
import { ExamAttemptService } from '../exam-attempt/exam-attempt.service';

@Injectable()
export class ExamService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ExamAttemptService))
    private examAttemptService: ExamAttemptService,
  ) {}

  async create(teacherId: string, createExamDto: CreateExamDto) {
    const { topics, questions, readingTexts, ...examData } = createExamDto;

    // First create exam
    const exam = await this.prisma.exam.create({
      data: {
        ...examData,
        teacherId,
        status: ExamStatus.DRAFT,
      },
    });

    // Create reading texts first (so we can link questions to them)
    const createdReadingTexts: { id: string; order: number }[] = [];
    const tempIdToRealIdMap = new Map<string, string>(); // Map temp IDs to real IDs
    if (readingTexts && readingTexts.length > 0) {
      for (const [index, text] of readingTexts.entries()) {
        const createdText = await this.prisma.readingText.create({
          data: {
            examId: exam.id,
            content: text.content,
            order: index,
          },
        });
        createdReadingTexts.push({ id: createdText.id, order: index });
        // Map temp ID (like "temp_0") or order to real ID
        tempIdToRealIdMap.set(`temp_${index}`, createdText.id);
        tempIdToRealIdMap.set(index.toString(), createdText.id);
      }
    }

    // Then create topics with questions if provided
    if (topics && topics.length > 0) {
      for (const [topicIndex, topic] of topics.entries()) {
        const createdTopic = await this.prisma.examTopic.create({
          data: {
            examId: exam.id,
            name: topic.name,
            subject: topic.subject || examData.subject, // Use topic subject or fallback to exam subject
            order: topicIndex,
            points: 1, // All questions are 1 point
          },
        });

        // Create questions for this topic
        if (topic.questions && topic.questions.length > 0) {
          for (const [qIndex, q] of topic.questions.entries()) {
            // Find reading text ID if readingTextId is provided
            let readingTextId = q.readingTextId || undefined;
            if (readingTextId) {
              // Map temp ID to real ID if needed
              const realId = tempIdToRealIdMap.get(readingTextId);
              if (realId) {
                readingTextId = realId;
              } else {
                // If not in map, check if it's already a real ID
                const textExists = createdReadingTexts.find(
                  (rt) => rt.id === readingTextId,
                );
                if (!textExists) {
                  readingTextId = undefined;
                }
              }
            }

            // Create question with options first to get option IDs
            const createdQuestion = await this.prisma.question.create({
              data: {
                examId: exam.id,
                topicId: createdTopic.id,
                type: q.type,
                content: q.content,
                order: qIndex,
                points: 1, // All questions are 1 point
                modelAnswer: q.modelAnswer,
                readingTextId: readingTextId,
                options: q.options
                  ? {
                      create: q.options.map((opt, oIndex) => ({
                        content: opt.content,
                        order: oIndex,
                      })),
                    }
                  : undefined,
              },
              include: {
                options: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            });

            // Convert correctAnswer from index to option ID
            if (
              q.correctAnswer !== undefined &&
              q.correctAnswer !== null &&
              createdQuestion.options &&
              createdQuestion.options.length > 0
            ) {
              const correctAnswerIndex = parseInt(q.correctAnswer, 10);
              if (
                !isNaN(correctAnswerIndex) &&
                correctAnswerIndex >= 0 &&
                correctAnswerIndex < createdQuestion.options.length
              ) {
                const correctOption =
                  createdQuestion.options[correctAnswerIndex];
                await this.prisma.question.update({
                  where: { id: createdQuestion.id },
                  data: { correctAnswer: correctOption.id },
                });
              }
            }
          }
        }
      }
    }

    // Create questions without topics
    if (questions && questions.length > 0) {
      for (const [index, q] of questions.entries()) {
        // Find reading text ID if readingTextId is provided
        let readingTextId = q.readingTextId || undefined;
        if (readingTextId) {
          // Map temp ID to real ID if needed
          const realId = tempIdToRealIdMap.get(readingTextId);
          if (realId) {
            readingTextId = realId;
          } else {
            // If not in map, check if it's already a real ID
            const textExists = createdReadingTexts.find(
              (rt) => rt.id === readingTextId,
            );
            if (!textExists) {
              readingTextId = undefined;
            }
          }
        }

        // Create question with options first to get option IDs
        const createdQuestion = await this.prisma.question.create({
          data: {
            examId: exam.id,
            type: q.type,
            content: q.content,
            order: index,
            points: 1, // All questions are 1 point
            modelAnswer: q.modelAnswer,
            readingTextId: readingTextId,
            options: q.options
              ? {
                  create: q.options.map((opt, oIndex) => ({
                    content: opt.content,
                    order: oIndex,
                  })),
                }
              : undefined,
          },
          include: {
            options: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        });

        // Convert correctAnswer from index to option ID
        if (
          q.correctAnswer !== undefined &&
          q.correctAnswer !== null &&
          createdQuestion.options &&
          createdQuestion.options.length > 0
        ) {
          const correctAnswerIndex = parseInt(q.correctAnswer, 10);
          if (
            !isNaN(correctAnswerIndex) &&
            correctAnswerIndex >= 0 &&
            correctAnswerIndex < createdQuestion.options.length
          ) {
            const correctOption = createdQuestion.options[correctAnswerIndex];
            await this.prisma.question.update({
              where: { id: createdQuestion.id },
              data: { correctAnswer: correctOption.id },
            });
          }
        }
      }
    }

    // Return exam with all relations
    const examWithRelations = await this.prisma.exam.findUnique({
      where: { id: exam.id },
      include: {
        topics: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        readingTexts: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return examWithRelations;
  }

  async findAll(status?: string, teacherId?: string) {
    const where: any = {};

    if (status && status.trim() !== '') {
      where.status = status as ExamStatus;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        topics: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Calculate price based on duration (fixed pricing)
  private calculatePrice(duration: number): number {
    // Fixed pricing: 1 saat (60 dəq) = 3 AZN, 2 saat (120 dəq) = 5 AZN, 3 saat (180 dəq) = 10 AZN
    if (duration === 60) return 3;
    if (duration === 120) return 5;
    if (duration === 180) return 10;
    // Default fallback
    return 3;
  }

  async getSubjects() {
    // Get unique subjects from all exams and topics
    const examSubjects = await this.prisma.exam.findMany({
      select: { subject: true },
      distinct: ['subject'],
    });

    const topicSubjects = await this.prisma.examTopic.findMany({
      select: { subject: true },
      distinct: ['subject'],
    });

    // Combine and get unique subjects
    const allSubjects = [
      ...examSubjects.map((e) => e.subject),
      ...topicSubjects.map((t) => t.subject),
    ];

    const uniqueSubjects = Array.from(new Set(allSubjects))
      .filter(Boolean)
      .sort();

    return uniqueSubjects;
  }

  async findPublished(studentId?: string) {
    // Only show exams published less than 10 minutes ago
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const where: any = {
      status: ExamStatus.PUBLISHED,
      publishedAt: {
        gte: tenMinutesAgo, // Only show exams published in the last 10 minutes
      },
    };

    // If studentId provided, only show exams from teachers they follow
    if (studentId) {
      const teacherRelations = await this.prisma.teacherStudent.findMany({
        where: { studentId },
        select: { teacherId: true },
      });

      const teacherIds = teacherRelations.map((r) => r.teacherId);

      if (teacherIds.length === 0) {
        return []; // No teachers followed
      }

      where.teacherId = { in: teacherIds };
    }

    const exams = await this.prisma.exam.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        topics: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If studentId provided, filter out exams that student has already completed
    let filteredExams = exams;
    if (studentId) {
      // Get all exam IDs that student has completed
      const completedAttempts = await this.prisma.examAttempt.findMany({
        where: {
          studentId,
          status: ExamAttemptStatus.COMPLETED,
        },
        select: {
          examId: true,
        },
      });

      const completedExamIds = new Set(
        completedAttempts.map((attempt) => attempt.examId),
      );

      // Filter out exams that student has already completed
      filteredExams = exams.filter((exam) => !completedExamIds.has(exam.id));
    }

    // Add calculated price to each exam
    return filteredExams.map((exam) => ({
      ...exam,
      price: this.calculatePrice(exam.duration),
    }));
  }

  async findOne(id: string, user: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        topics: {
          include: {
            questions: {
              include: {
                options: true,
                readingText: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        questions: {
          include: {
            options: true,
            readingText: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        readingTexts: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    // Prize yoxlanması yalnız login olmuş şagird üçün aparılacaq (checkAndAwardPrizesForStudent funksiyasından)
    // Burada prize yoxlanması aparılmır

    // Hide correct answers if user is a student
    if (user.role === 'STUDENT') {
      exam.questions.forEach((q) => {
        delete q.correctAnswer;
        delete q.modelAnswer;
      });
    }

    // Combine all questions (from topics and regular questions) and map readingText
    const allQuestions = [];

    // Add questions from topics
    if (exam.topics) {
      exam.topics.forEach((topic) => {
        if (topic.questions) {
          allQuestions.push(...topic.questions);
        }
      });
    }

    // Add regular questions
    if (exam.questions) {
      allQuestions.push(...exam.questions);
    }

    // Map readingTextId to readingText object
    if (exam.readingTexts && exam.readingTexts.length > 0) {
      const readingTextsMap = new Map(
        exam.readingTexts.map((rt) => [rt.id, rt]),
      );
      allQuestions.forEach((q: any) => {
        if (q.readingTextId && !q.readingText) {
          q.readingText = readingTextsMap.get(q.readingTextId) || null;
        }
      });
    }

    // Add calculated price
    return {
      ...exam,
      price: this.calculatePrice(exam.duration),
      allQuestions, // Add combined questions array
    };
  }

  async update(id: string, teacherId: string, updateExamDto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.teacherId !== teacherId) {
      throw new ForbiddenException('Bu imtahanın sahibi deyilsiniz');
    }

    const { topics, questions, readingTexts, ...examData } = updateExamDto;

    // Increment version if exam is published
    const data: any = { ...examData };
    if (exam.status === ExamStatus.PUBLISHED) {
      data.version = exam.version + 1;
      data.status = ExamStatus.DRAFT; // Reset to draft when updating published exam
    }

    // Update exam basic info
    await this.prisma.exam.update({
      where: { id },
      data,
    });

    // Delete and recreate reading texts first (so we can link questions to them)
    const createdReadingTexts: { id: string; order: number }[] = [];
    const tempIdToRealIdMap = new Map<string, string>(); // Map temp IDs to real IDs
    if (readingTexts !== undefined) {
      await this.prisma.readingText.deleteMany({
        where: { examId: id },
      });

      if (readingTexts.length > 0) {
        for (const [index, text] of readingTexts.entries()) {
          const createdText = await this.prisma.readingText.create({
            data: {
              examId: id,
              content: text.content,
              order: index,
            },
          });
          createdReadingTexts.push({ id: createdText.id, order: index });
          // Map temp ID (like "temp_0") or order to real ID
          tempIdToRealIdMap.set(`temp_${index}`, createdText.id);
          tempIdToRealIdMap.set(index.toString(), createdText.id);
        }
      }
    } else {
      // If readingTexts is not being updated, get existing ones
      const existingTexts = await this.prisma.readingText.findMany({
        where: { examId: id },
        orderBy: { order: 'asc' },
      });
      createdReadingTexts.push(
        ...existingTexts.map((t) => ({ id: t.id, order: t.order })),
      );
    }

    // Delete existing questions and options if questions are being updated
    if (questions !== undefined) {
      // Get all questions for this exam
      const existingQuestions = await this.prisma.question.findMany({
        where: { examId: id },
        include: { options: true },
      });

      // Delete all options
      for (const q of existingQuestions) {
        await this.prisma.option.deleteMany({
          where: { questionId: q.id },
        });
      }

      // Delete all questions
      await this.prisma.question.deleteMany({
        where: { examId: id },
      });

      // Create new questions
      if (questions.length > 0) {
        for (const [index, q] of questions.entries()) {
          // Find reading text ID if readingTextId is provided
          let readingTextId = q.readingTextId || undefined;
          if (readingTextId) {
            // Map temp ID to real ID if needed
            const realId = tempIdToRealIdMap.get(readingTextId);
            if (realId) {
              readingTextId = realId;
            } else {
              // If not in map, check if it's already a real ID
              const textExists = createdReadingTexts.find(
                (rt) => rt.id === readingTextId,
              );
              if (!textExists) {
                readingTextId = undefined;
              }
            }
          }

          // Create question with options first to get option IDs
          const createdQuestion = await this.prisma.question.create({
            data: {
              examId: id,
              type: q.type,
              content: q.content,
              order: index,
              points: 1, // All questions are 1 point
              modelAnswer: q.modelAnswer,
              readingTextId: readingTextId,
              options: q.options
                ? {
                    create: q.options.map((opt, oIndex) => ({
                      content: opt.content,
                      order: oIndex,
                    })),
                  }
                : undefined,
            },
            include: {
              options: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
          });

          // Convert correctAnswer from index to option ID
          if (
            q.correctAnswer !== undefined &&
            q.correctAnswer !== null &&
            createdQuestion.options &&
            createdQuestion.options.length > 0
          ) {
            const correctAnswerIndex = parseInt(q.correctAnswer, 10);
            if (
              !isNaN(correctAnswerIndex) &&
              correctAnswerIndex >= 0 &&
              correctAnswerIndex < createdQuestion.options.length
            ) {
              const correctOption = createdQuestion.options[correctAnswerIndex];
              await this.prisma.question.update({
                where: { id: createdQuestion.id },
                data: { correctAnswer: correctOption.id },
              });
            }
          }
        }
      }
    }

    // Delete and recreate topics if topics are being updated
    if (topics !== undefined) {
      // Delete existing topics (cascade will delete questions)
      await this.prisma.examTopic.deleteMany({
        where: { examId: id },
      });

      // Get exam to access subject
      const exam = await this.prisma.exam.findUnique({
        where: { id },
        select: { subject: true },
      });

      // Create new topics with questions
      if (topics.length > 0) {
        for (const [topicIndex, topic] of topics.entries()) {
          const createdTopic = await this.prisma.examTopic.create({
            data: {
              examId: id,
              name: topic.name,
              subject:
                topic.subject ||
                exam?.subject ||
                updateExamDto.subject ||
                'Riyaziyyat', // Use topic subject or fallback
              order: topicIndex,
              points: 1, // All questions are 1 point
            },
          });

          // Create questions for this topic
          if (topic.questions && topic.questions.length > 0) {
            for (const [qIndex, q] of topic.questions.entries()) {
              // All questions are 1 point
              const questionPoints = 1;

              // Find reading text ID if readingTextId is provided
              let readingTextId = q.readingTextId || undefined;
              if (readingTextId) {
                // If readingTextId is provided, validate it exists
                const textExists = createdReadingTexts.find(
                  (rt) => rt.id === readingTextId,
                );
                if (!textExists) {
                  readingTextId = undefined;
                }
              }

              // Create question with options first to get option IDs
              const createdQuestion = await this.prisma.question.create({
                data: {
                  examId: id,
                  topicId: createdTopic.id,
                  type: q.type,
                  content: q.content,
                  order: qIndex,
                  points: questionPoints,
                  modelAnswer: q.modelAnswer,
                  readingTextId: readingTextId,
                  options: q.options
                    ? {
                        create: q.options.map((opt, oIndex) => ({
                          content: opt.content,
                          order: oIndex,
                        })),
                      }
                    : undefined,
                },
                include: {
                  options: {
                    orderBy: {
                      order: 'asc',
                    },
                  },
                },
              });

              // Convert correctAnswer from index to option ID
              if (
                q.correctAnswer !== undefined &&
                q.correctAnswer !== null &&
                createdQuestion.options &&
                createdQuestion.options.length > 0
              ) {
                const correctAnswerIndex = parseInt(q.correctAnswer, 10);
                if (
                  !isNaN(correctAnswerIndex) &&
                  correctAnswerIndex >= 0 &&
                  correctAnswerIndex < createdQuestion.options.length
                ) {
                  const correctOption =
                    createdQuestion.options[correctAnswerIndex];
                  await this.prisma.question.update({
                    where: { id: createdQuestion.id },
                    data: { correctAnswer: correctOption.id },
                  });
                }
              }
            }
          }
        }
      }
    }

    // Return exam with all relations
    const examWithRelations = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        readingTexts: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return examWithRelations;
  }

  async remove(id: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.teacherId !== teacherId) {
      throw new ForbiddenException('Bu imtahanın sahibi deyilsiniz');
    }

    return this.prisma.exam.delete({
      where: { id },
    });
  }

  async publish(id: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    if (exam.teacherId !== teacherId) {
      throw new ForbiddenException('Bu imtahanın sahibi deyilsiniz');
    }

    if (exam.questions.length === 0) {
      throw new ForbiddenException(
        'Sualı olmayan imtahanı dərc edə bilməzsiniz',
      );
    }

    return this.prisma.exam.update({
      where: { id },
      data: {
        status: ExamStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async getLeaderboard(examId: string, studentId: string) {
    // Verify exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('İmtahan tapılmadı');
    }

    // Get all completed attempts for this exam, ordered by score (high to low)
    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        examId,
        status: ExamAttemptStatus.COMPLETED,
      },
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
      orderBy: [
        {
          score: 'desc',
        },
        {
          submittedAt: 'asc', // If same score, earlier submission ranks higher
        },
      ],
    });

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

    // Group attempts by score percentage (similar to awardPrizes logic)
    const attemptsByScore = new Map<string, typeof attempts>();

    for (const attempt of attempts) {
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
    const leaderboard: any[] = [];
    let currentPosition = 1;
    const sortedScores = Array.from(attemptsByScore.keys()).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    for (const scorePercentage of sortedScores) {
      const tiedAttempts = attemptsByScore.get(scorePercentage)!;

      // Calculate prize amount for this group
      let prizeAmount = 0;
      if (currentPosition <= 3) {
        // Check if any student in this group received a prize
        for (const attempt of tiedAttempts) {
          const actualPrize = prizeMap.get(attempt.studentId);
          if (actualPrize) {
            prizeAmount = actualPrize; // Use actual prize amount from payment
            break;
          }
        }

        // If no actual prize found but in top 3, calculate theoretical amount
        // (this shouldn't happen, but handle it just in case)
        if (
          prizeAmount === 0 &&
          tiedAttempts.length === 1 &&
          currentPosition <= 3
        ) {
          prizeAmount = prizes[currentPosition - 1];
        }
      }

      // Add all tied attempts to leaderboard
      for (const attempt of tiedAttempts) {
        const position = currentPosition;
        // scorePercentage is 0.01-1.00, multiply by 100 to get percentage (1-100)
        const percentage = parseFloat(scorePercentage) * 100;

        // Use actual prize amount if available, otherwise use calculated amount
        const actualPrize = prizeMap.get(attempt.studentId) || prizeAmount;

        leaderboard.push({
          position,
          studentId: attempt.studentId,
          studentName: `${attempt.student.firstName} ${attempt.student.lastName}`,
          score: attempt.score || 0,
          totalScore: attempt.totalScore || 0,
          percentage: parseFloat(percentage.toFixed(2)),
          submittedAt: attempt.submittedAt,
          isCurrentUser: attempt.studentId === studentId,
          prizeAmount: actualPrize, // Actual prize amount (factored for ties)
        });
      }

      currentPosition += tiedAttempts.length;
    }

    // Find current user's position
    const currentUserPosition =
      leaderboard.findIndex((item) => item.isCurrentUser) + 1;

    return {
      examId,
      examTitle: exam.title,
      leaderboard,
      currentUserPosition: currentUserPosition > 0 ? currentUserPosition : null,
      totalParticipants: leaderboard.length,
    };
  }
}
