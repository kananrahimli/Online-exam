import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireAuth, requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ExamStats {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  totalStudents: number;
  completionRate: number;
}

interface SummaryData {
  examStats: ExamStats[];
  totalExams: number;
  totalStudents: number;
  totalAttempts: number;
}

export default async function AnalyticsServerWrapper() {
  try {
    const session = await requireAuth();
    await requireRole("TEACHER");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    // Fetch summary stats server-side
    const summaryData = await fetchServerAPI<SummaryData>("/analytics/summary").catch(() => ({
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
