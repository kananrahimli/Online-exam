import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

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

interface LeaderboardEntry {
  position: number;
  studentId: string;
  studentName: string;
  score: number;
  totalScore: number;
  percentage: number;
  submittedAt: string | null;
  isCurrentUser: boolean;
  prizeAmount: number;
}

interface LeaderboardData {
  examId: string;
  examTitle: string;
  leaderboard: LeaderboardEntry[];
  currentUserPosition: number | null;
  totalParticipants: number;
}

// Lazy load ResultsClient for better initial load performance
const ResultsClientLazy = dynamic(() => import("./results-client"), {
  ssr: true,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="h-6 w-96 bg-gray-200 rounded animate-pulse mb-8"></div>
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-8 w-3/4 bg-gray-100 rounded mb-4"></div>
          <div className="h-6 w-1/2 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-8 w-3/4 bg-gray-100 rounded mb-4"></div>
          <div className="h-6 w-1/2 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  ),
});

export default async function ResultsServerWrapper() {
  try {
    await requireRole("STUDENT");
    const user = await getServerUser({
      revalidate: 30,
      tags: ["user-profile", "balance"],
    });

    if (!user) {
      redirect("/login");
    }

    // Fetch attempts server-side with ISR
    const attempts = await fetchServerAPI<ExamAttemptWithExam[]>(
      "/exam-attempts/my-attempts",
      {
        next: {
          revalidate: 60,
          tags: ["exam-attempts", "my-attempts"],
        },
      }
    ).catch((error) => {
      console.error("Error fetching attempts:", error);
      return [];
    });

    // Filter completed attempts
    // Only show results for exams that have been published for at least 10 minutes
    // (i.e., exam is no longer active)
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const completedAttempts = (attempts || []).filter(
      (a: ExamAttemptWithExam) => {
        if (a.status !== "COMPLETED") return false;

        // Check if exam has been published for at least 10 minutes
        if (a.exam?.publishedAt) {
          const publishedAt = new Date(a.exam.publishedAt);
          return publishedAt <= tenMinutesAgo;
        }

        // If no publishedAt, don't show (exam not published yet)
        return false;
      }
    );

    // Get unique exam IDs
    const uniqueExamIds = Array.from(
      new Set(completedAttempts.map((a) => a.examId))
    ) as string[];

    // Fetch all leaderboards in parallel server-side with ISR
    const leaderboardsMap: Record<string, LeaderboardData> = {};
    if (uniqueExamIds.length > 0) {
      const leaderboardPromises = uniqueExamIds.map((examId) =>
        fetchServerAPI<LeaderboardData>(`/exams/${examId}/leaderboard`, {
          next: {
            revalidate: 60,
            tags: ["leaderboards", `leaderboard-${examId}`],
          },
        })
          .then((leaderboard) => ({ examId, leaderboard }))
          .catch((error) => {
            console.error(`Error fetching leaderboard for ${examId}:`, error);
            return { examId, leaderboard: null };
          })
      );

      const leaderboardResults = await Promise.all(leaderboardPromises);
      leaderboardResults.forEach((result) => {
        if (result.leaderboard) {
          leaderboardsMap[result.examId] = result.leaderboard;
        }
      });
    }

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-6 w-96 bg-gray-200 rounded animate-pulse mb-8"></div>
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-8 w-3/4 bg-gray-100 rounded mb-4"></div>
                <div className="h-6 w-1/2 bg-gray-100 rounded"></div>
              </div>
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-8 w-3/4 bg-gray-100 rounded mb-4"></div>
                <div className="h-6 w-1/2 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        }
      >
        <ResultsClientLazy
          initialAttempts={completedAttempts}
          initialUser={user}
          initialLeaderboards={leaderboardsMap}
        />
      </Suspense>
    );
  } catch (error) {
    redirect("/login");
  }
}
