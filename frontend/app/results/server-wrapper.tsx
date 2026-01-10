import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResultsClient from "./results-client";

interface ExamAttemptWithExam {
  id: string;
  examId: string;
  status: string;
  score?: number;
  totalScore?: number;
  submittedAt?: string;
  exam?: {
    id: string;
    title: string;
    subject: string;
    level: string;
    publishedAt?: string;
  };
}

export default async function ResultsServerWrapper() {
  try {
    await requireRole("STUDENT");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    // Fetch attempts server-side
    const attempts = await fetchServerAPI<ExamAttemptWithExam[]>(
      "/exam-attempts/my-attempts"
    ).catch(() => []);

    // Calculate 1 hour ago date
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Only show completed attempts for exams that have expired (published 1+ hour ago)
    // This ensures results are visible after the exam is removed from published list
    const completedAttempts = (attempts || []).filter(
      (a: ExamAttemptWithExam) => {
        if (a.status !== "COMPLETED") return false;
        if (!a.exam?.publishedAt) return false;
        const publishedDate = new Date(a.exam.publishedAt);
        return publishedDate <= oneHourAgo;
      }
    );

    return (
      <ResultsClient initialAttempts={completedAttempts} initialUser={user} />
    );
  } catch (error) {
    redirect("/login");
  }
}
