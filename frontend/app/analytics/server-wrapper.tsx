import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";

interface ExamStats {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  totalStudents: number;
  completionRate: number;
  createdAt: string;
  createdAtTime?: string;
}

interface ExamDetail {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  totalStudents: number;
  completionRate: number;
  exam?: {
    readingTexts?: Array<{
      id: string;
      content: string;
      order: number;
    }>;
  };
  attempts: Array<{
    id: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    score: number | null;
    totalScore: number | null;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    percentage: string | null;
    position: number;
    prizeAmount: number;
    answers?: Array<{
      id: string;
      questionId: string;
      questionType: string;
      questionContent: string;
      questionPoints: number;
      modelAnswer: string | null;
      readingTextId?: string | null;
      readingText: {
        id: string;
        content: string;
        order: number;
      } | null;
      correctAnswer?: string | null;
      questionOptions?: Array<{
        id: string;
        content: string;
        order: number;
      }>;
      optionId: string | null;
      content: string | null;
      isCorrect: boolean;
      points: number;
      option: {
        id: string;
        content: string;
      } | null;
    }>;
  }>;
}

interface SummaryData {
  examStats: ExamStats[];
  totalExams: number;
  totalStudents: number;
  totalAttempts: number;
}

export default async function AnalyticsServerWrapper() {
  try {
    await requireRole("TEACHER");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    // Fetch summary stats server-side with sorting by createdAt (newest to oldest)
    const summaryData = await fetchServerAPI<SummaryData>(
      "/analytics/summary?sortBy=createdAt&sortOrder=desc",
      { next: { revalidate: 60, tags: ["exams"] } }
    ).catch(() => ({
      examStats: [],
      totalExams: 0,
      totalStudents: 0,
      totalAttempts: 0,
    }));

    // Fetch all exam details in parallel server-side
    const examDetailsMap: Record<string, ExamDetail> = {};
    if (summaryData.examStats && summaryData.examStats.length > 0) {
      const examDetailPromises = summaryData.examStats.map((stat) =>
        fetchServerAPI<ExamDetail>(`/analytics/exam/${stat.examId}`, {
          next: {
            revalidate: 60,
            tags: ["exams", `exam-${stat.examId}`],
          },
        })
          .then((detail) => ({ examId: stat.examId, detail }))
          .catch((error) => {
            console.error(
              `Error fetching exam detail for ${stat.examId}:`,
              error
            );
            return { examId: stat.examId, detail: null };
          })
      );

      const examDetailsResults = await Promise.all(examDetailPromises);
      examDetailsResults.forEach((result) => {
        if (result.detail) {
          examDetailsMap[result.examId] = result.detail;
        }
      });
    }

    return (
      <AnalyticsClient
        initialStats={summaryData.examStats || []}
        initialSummaryData={summaryData}
        initialUser={user}
        initialExamDetailsMap={examDetailsMap}
      />
    );
  } catch (error) {
    redirect("/login");
  }
}
