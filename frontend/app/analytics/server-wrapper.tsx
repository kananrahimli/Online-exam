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
      "/analytics/summary?sortBy=createdAt&sortOrder=desc"
    ).catch(() => ({
      examStats: [],
      totalExams: 0,
      totalStudents: 0,
      totalAttempts: 0,
    }));

    return (
      <AnalyticsClient
        initialStats={summaryData.examStats || []}
        initialSummaryData={summaryData}
        initialUser={user}
      />
    );
  } catch (error) {
    redirect("/login");
  }
}
