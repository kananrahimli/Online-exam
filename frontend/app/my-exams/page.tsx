"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { ExamAttempt } from "@/lib/types";
import Link from "next/link";

interface ExamAttemptWithExam extends ExamAttempt {
  exam?: {
    id: string;
    title: string;
    subject: string;
    level: string;
    duration: number;
    teacher?: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function MyExamsPage() {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const [attempts, setAttempts] = useState<ExamAttemptWithExam[]>([]);
  const [loading, setLoading] = useState(true);

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
      setAttempts(response.data);
    } catch (err: any) {
      console.error("Error fetching attempts:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Tamamlanıb";
      case "IN_PROGRESS":
        return "Davam edir";
      case "TIMED_OUT":
        return "Müddət bitib";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "TIMED_OUT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">O</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Online İmtahan
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {user && (
                <div className="text-right">
                  <p className="text-gray-900 font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                İdarə paneli
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            İmtahanlarım 📚
          </h1>
          <p className="text-gray-600 text-lg">
            Verdiyiniz imtahanlar və nəticələri
          </p>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Hələ imtahan verməmisiniz
            </h3>
            <p className="text-gray-600 mb-6">
              İmtahanlar səhifəsinə keçib mövcud imtahanları görüntüləyin
            </p>
            <Link
              href="/exams"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              İmtahanlar görüntülə →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {attempt.exam?.title || "Naməlum imtahan"}
                        </h3>
                        {attempt.exam?.teacher && (
                          <p className="text-sm text-gray-600 mb-2">
                            Müəllim: {attempt.exam.teacher.firstName}{" "}
                            {attempt.exam.teacher.lastName}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                          attempt.status || ""
                        )}`}
                      >
                        {getStatusText(attempt.status || "")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fənn</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {attempt.exam?.subject || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Səviyyə</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {attempt.exam?.level || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Başlanğıc</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(attempt.startedAt).toLocaleDateString(
                            "az-AZ"
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(attempt.startedAt).toLocaleTimeString(
                            "az-AZ",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      {attempt.status === "COMPLETED" && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Bal</p>
                          <p className="text-sm font-semibold text-green-600">
                            {attempt.score || 0} / {attempt.totalScore || 0}
                          </p>
                          {attempt.totalScore && attempt.totalScore > 0 && (
                            <p className="text-xs text-gray-500">
                              {Math.round(
                                ((attempt.score || 0) / attempt.totalScore) *
                                  100
                              )}
                              %
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {attempt.status === "COMPLETED" && (
                      <Link
                        href={`/exam-attempts/${attempt.id}/result`}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-center"
                      >
                        Nəticələrə bax →
                      </Link>
                    )}
                    {attempt.status === "IN_PROGRESS" && (
                      <Link
                        href={`/exams/${attempt.examId}/take?attemptId=${attempt.id}`}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-center"
                      >
                        Davam et →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
