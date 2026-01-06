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

    // Calculate 3 days ago date
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Only show completed attempts for exams that have expired (published 3+ days ago)
    const completedAttempts = (attempts || []).filter(
      (a: ExamAttemptWithExam) => {
        if (a.status !== "COMPLETED") return false;
        if (!a.exam?.publishedAt) return false;
        const publishedDate = new Date(a.exam.publishedAt);
        return publishedDate <= threeDaysAgo;
      }
    );

    return (
      <ResultsClient initialAttempts={completedAttempts} initialUser={user} />
    );
  } catch (error) {
    redirect("/login");
  }
}
