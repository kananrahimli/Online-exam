/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "exam_topics" ALTER COLUMN "subject" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "examId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "readingTextId" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "resetToken" SET DATA TYPE TEXT,
ALTER COLUMN "resetTokenExpires" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_readingTextId_fkey" FOREIGN KEY ("readingTextId") REFERENCES "reading_texts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
