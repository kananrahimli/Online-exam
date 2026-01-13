"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

interface ResultsClientProps {
  initialAttempts: ExamAttemptWithExam[];
  initialUser: any;
  initialLeaderboards?: Record<string, LeaderboardData>;
}

export default function ResultsClient({
  initialAttempts,
  initialUser,
  initialLeaderboards = {},
}: ResultsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [attempts] = useState<ExamAttemptWithExam[]>(initialAttempts);
  const [leaderboards] =
    useState<Record<string, LeaderboardData>>(initialLeaderboards);
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
    }
    // Debug: log attempts to see what we're receiving
    console.log("ResultsClient - initialAttempts:", initialAttempts);
    console.log("ResultsClient - initialLeaderboards:", initialLeaderboards);
  }, [initialUser, setUser, initialAttempts, initialLeaderboards]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            aria-label="İdarə panelinə qayıt"
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
          >
            <span className="text-xl" aria-hidden="true">
              ←
            </span>
            <span>İdarə panelinə qayıt</span>
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
              onClick={(e) => {
                // Force refresh when navigating to exams page
                router.refresh();
              }}
              aria-label="Mövcud imtahanları görüntülə"
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
              const isExpanded = expandedExams[examId];

              const latestAttempt = examAttempts.sort(
                (a, b) =>
                  new Date(b.submittedAt || 0).getTime() -
                  new Date(a.submittedAt || 0).getTime()
              )[0];

              const percentage =
                latestAttempt.totalScore && latestAttempt.totalScore > 0
                  ? parseFloat(
                      (
                        ((latestAttempt.score || 0) /
                          latestAttempt.totalScore) *
                        100
                      ).toFixed(2)
                    )
                  : 0;

              return (
                <div
                  key={examId}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                >
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
                          <span>
                            <span role="img" aria-label="Kitab">
                              📚
                            </span>{" "}
                            {exam?.subject}
                          </span>
                          <span>
                            <span role="img" aria-label="Statistika">
                              📊
                            </span>{" "}
                            {exam?.level}
                          </span>
                          {latestAttempt.score !== null &&
                            latestAttempt.totalScore !== null && (
                              <>
                                <span>
                                  <span role="img" aria-label="Ulduz">
                                    ⭐
                                  </span>{" "}
                                  Bal: {latestAttempt.score} /{" "}
                                  {latestAttempt.totalScore} (
                                  {percentage.toFixed(2)}%)
                                </span>
                              </>
                            )}
                          {leaderboard && leaderboard.currentUserPosition && (
                            <span className="font-semibold text-indigo-600">
                              <span role="img" aria-label="Statistika">
                                📊
                              </span>{" "}
                              Yeriniz: {leaderboard.currentUserPosition} /{" "}
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

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      {leaderboard && leaderboard.leaderboard.length > 0 ? (
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
                                            <span
                                              role="img"
                                              aria-label={`${
                                                index === 0
                                                  ? "Birinci"
                                                  : index === 1
                                                  ? "İkinci"
                                                  : "Üçüncü"
                                              } yer medalı`}
                                            >
                                              {index === 0
                                                ? "🥇"
                                                : index === 1
                                                ? "🥈"
                                                : "🥉"}
                                            </span>
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
                                        {entry.percentage.toFixed(2)}%
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {entry.prizeAmount > 0 ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-green-600">
                                            +{entry.prizeAmount} AZN
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            <span role="img" aria-label="Pul">
                                              💰
                                            </span>
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
