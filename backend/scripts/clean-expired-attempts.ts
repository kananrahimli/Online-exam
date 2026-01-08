import { PrismaClient } from '@prisma/client';
import { ExamAttemptStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanExpiredAttempts() {
  try {
    const now = new Date();
    
    // Keçmiş attempt-ləri tap
    const expiredAttempts = await prisma.examAttempt.findMany({
      where: {
        status: ExamAttemptStatus.IN_PROGRESS,
        expiresAt: {
          lt: now, // expiresAt < now
        },
      },
    });

    console.log(`Tapıldı ${expiredAttempts.length} keçmiş attempt`);

    if (expiredAttempts.length > 0) {
      // Keçmiş attempt-ləri TIMED_OUT statusuna keçir
      const result = await prisma.examAttempt.updateMany({
        where: {
          id: {
            in: expiredAttempts.map((a) => a.id),
          },
        },
        data: {
          status: ExamAttemptStatus.TIMED_OUT,
        },
      });

      console.log(`✅ ${result.count} attempt TIMED_OUT statusuna keçirildi`);
    }

    // Bütün attempt-ləri göstər
    const allAttempts = await prisma.examAttempt.findMany({
      where: {
        status: ExamAttemptStatus.IN_PROGRESS,
      },
      select: {
        id: true,
        examId: true,
        studentId: true,
        expiresAt: true,
        startedAt: true,
      },
    });

    console.log(`\nMövcud IN_PROGRESS attempt-lər:`);
    allAttempts.forEach((attempt) => {
      const expired = new Date(attempt.expiresAt) < now;
      console.log(
        `  - ID: ${attempt.id}, ExpiresAt: ${attempt.expiresAt.toISOString()}, Expired: ${expired}`,
      );
    });
  } catch (error) {
    console.error('❌ Xəta:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanExpiredAttempts();


