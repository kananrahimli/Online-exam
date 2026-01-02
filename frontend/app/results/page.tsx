"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";

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
  prizeAmount: number; // Prize amount in AZN (0 if not in top 3)
}

interface LeaderboardData {
  examId: string;
  examTitle: string;
  leaderboard: LeaderboardEntry[];
  currentUserPosition: number | null;
  totalParticipants: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttemptWithExam[]>([]);
  const [leaderboards, setLeaderboards] = useState<
    Record<string, LeaderboardData>
  >({});
  const [loadingLeaderboards, setLoadingLeaderboards] = useState<
    Record<string, boolean>
  >({});
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    initialize();
    if (!token) {
      router.push("/login");
      return;
    }
    fetchAttempts();
  }, [token, router, initialize]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/exam-attempts/my-attempts");
      // Only show completed attempts
      const completedAttempts = (response.data || []).filter(
        (a: ExamAttemptWithExam) => a.status === "COMPLETED"
      );
      setAttempts(completedAttempts);

      // Fetch leaderboards for each unique exam
      const uniqueExamIds = Array.from(
        new Set(completedAttempts.map((a: ExamAttemptWithExam) => a.examId))
      ) as string[];

      uniqueExamIds.forEach((examId) => {
        fetchLeaderboard(examId);
      });
    } catch (err: any) {
      console.error("Error fetching attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (examId: string) => {
    try {
      setLoadingLeaderboards((prev) => ({ ...prev, [examId]: true }));
      const response = await api.get(`/exams/${examId}/leaderboard`);
      setLeaderboards((prev) => ({
        ...prev,
        [examId]: response.data,
      }));
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoadingLeaderboards((prev) => ({ ...prev, [examId]: false }));
    }
  };

  const toggleExam = (examId: string) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  // Group attempts by exam
  const examsMap = new Map<string, ExamAttemptWithExam[]>();
  attempts.forEach((attempt) => {
    if (!examsMap.has(attempt.examId)) {
      examsMap.set(attempt.examId, []);
    }
    examsMap.get(attempt.examId)!.push(attempt);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← İdarə panelinə qayıt
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Nəticələr</h1>
          <p className="text-gray-600">
            İmtahan nəticələrinizi və liderlər cədvəlini görüntüləyin
          </p>
        </div>

        {examsMap.size === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">Hələ nəticə yoxdur</p>
            <Link
              href="/exams"
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              İmtahanlar görüntülə
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(examsMap.entries()).map(([examId, examAttempts]) => {
              const exam = examAttempts[0]?.exam;
              const leaderboard = leaderboards[examId];
              const isLoading = loadingLeaderboards[examId];
              const isExpanded = expandedExams[examId];

              // Get the latest attempt for this exam
              const latestAttempt = examAttempts.sort(
                (a, b) =>
                  new Date(b.submittedAt || 0).getTime() -
                  new Date(a.submittedAt || 0).getTime()
              )[0];

              const percentage =
                latestAttempt.totalScore && latestAttempt.totalScore > 0
                  ? Math.round(
                      ((latestAttempt.score || 0) / latestAttempt.totalScore) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={examId}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  {/* Exam Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExam(examId)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                          {exam?.title || "Naməlum imtahan"}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📚 {exam?.subject}</span>
                          <span>📊 {exam?.level}</span>
                          {latestAttempt.score !== null &&
                            latestAttempt.totalScore !== null && (
                              <>
                                <span>
                                  ⭐ Bal: {latestAttempt.score} /{" "}
                                  {latestAttempt.totalScore} ({percentage}%)
                                </span>
                              </>
                            )}
                          {leaderboard && leaderboard.currentUserPosition && (
                            <span className="font-semibold text-indigo-600">
                              📊 Yeriniz: {leaderboard.currentUserPosition} /{" "}
                              {leaderboard.totalParticipants}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {examAttempts.length} cəhd
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? "transform rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      {isLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                          <p className="mt-2 text-gray-600">Yüklənir...</p>
                        </div>
                      ) : leaderboard && leaderboard.leaderboard.length > 0 ? (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Liderlər Cədvəli ({leaderboard.totalParticipants}{" "}
                            iştirakçı)
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Yer
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Şagird
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bal
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Faiz
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mükafat
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {leaderboard.leaderboard.map((entry, index) => (
                                  <tr
                                    key={entry.studentId}
                                    className={`${
                                      entry.isCurrentUser
                                        ? "bg-indigo-50 border-l-4 border-indigo-500"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {index < 3 ? (
                                          <span className="text-2xl">
                                            {index === 0
                                              ? "🥇"
                                              : index === 1
                                              ? "🥈"
                                              : "🥉"}
                                          </span>
                                        ) : (
                                          <span className="text-sm font-medium text-gray-900">
                                            {entry.position}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {entry.studentName}
                                        {entry.isCurrentUser && (
                                          <span className="ml-2 text-xs text-indigo-600 font-semibold">
                                            (Siz)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {entry.score} / {entry.totalScore}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {entry.percentage}%
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {entry.prizeAmount > 0 ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-green-600">
                                            +{entry.prizeAmount} AZN
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            💰
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-400">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Hələ liderlər cədvəli yoxdur
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
