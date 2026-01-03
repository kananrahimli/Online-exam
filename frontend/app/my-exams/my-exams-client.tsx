"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";

interface ExamAttemptWithExam {
  id: string;
  examId: string;
  status: string;
  score?: number;
  totalScore?: number;
  startedAt: string;
  submittedAt?: string;
  exam?: {
    id: string;
    title: string;
    subject: string;
    level: string;
    duration: number;
    createdAt?: string;
    teacher?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface MyExamsClientProps {
  initialAttempts: ExamAttemptWithExam[];
  initialUser: any;
}

export default function MyExamsClient({
  initialAttempts,
  initialUser,
}: MyExamsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [attempts] = useState<ExamAttemptWithExam[]>(initialAttempts);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

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
              {initialUser && (
                <div className="text-right">
                  <p className="text-gray-900 font-semibold">
                    {initialUser.firstName} {initialUser.lastName}
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            İmtahanlarım{" "}
            <span role="img" aria-label="Kitab">
              📚
            </span>
          </h1>
          <p className="text-gray-600 text-lg">
            Verdiyiniz imtahanlar və nəticələri
          </p>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">
              <span role="img" aria-label="İmtahan">
                📝
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Hələ imtahan verməmisiniz
            </h3>
            <p className="text-gray-600 mb-6">
              İmtahanlar səhifəsinə keçib mövcud imtahanları görüntüləyin
            </p>
            <Link
              href="/exams"
              aria-label="Mövcud imtahanları görüntülə"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              İmtahanlar görüntülə <span aria-hidden="true">→</span>
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
                        <p className="text-xs text-gray-500 mb-1">Sinif</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {attempt.exam?.level || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Başlanğıc</p>
                        <p
                          className="text-sm font-semibold text-gray-900"
                          suppressHydrationWarning
                        >
                          {attempt.startedAt ? formatDate(attempt.startedAt) : "-"}
                        </p>
                        {attempt.startedAt && (
                          <p
                            className="text-xs text-gray-500"
                            suppressHydrationWarning
                          >
                            {formatTime(attempt.startedAt)}
                          </p>
                        )}
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
                        aria-label={`${
                          attempt.exam?.title || "İmtahan"
                        } nəticələrinə bax`}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-center"
                      >
                        Nəticələrə bax <span aria-hidden="true">→</span>
                      </Link>
                    )}
                    {attempt.status === "IN_PROGRESS" && (
                      <Link
                        href={`/exams/${attempt.examId}/take?attemptId=${attempt.id}`}
                        aria-label={`${
                          attempt.exam?.title || "İmtahan"
                        } davam et`}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl text-center"
                      >
                        Davam et <span aria-hidden="true">→</span>
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
