/*
  Warnings:

  - A unique constraint covering the columns `[studentId,examId,transactionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "payments_examId_transactionId_idx" ON "payments"("examId", "transactionId");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_studentId_examId_transactionId_key" ON "payments"("studentId", "examId", "transactionId");
