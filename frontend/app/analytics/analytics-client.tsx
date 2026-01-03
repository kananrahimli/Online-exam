"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { useAlert } from "@/hooks/useAlert";
import { QuestionType } from "@/lib/types";

interface ExamStats {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  totalStudents: number;
  completionRate: number;
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

interface AnalyticsClientProps {
  initialStats: ExamStats[];
  initialSummaryData: SummaryData;
  initialUser: any;
}

export default function AnalyticsClient({
  initialStats,
  initialSummaryData,
  initialUser,
}: AnalyticsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { showAlert, AlertComponent } = useAlert();
  const [stats] = useState<ExamStats[]>(initialStats);
  const [summaryData] = useState<SummaryData>(initialSummaryData);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examDetail, setExamDetail] = useState<ExamDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedStudentAttempt, setSelectedStudentAttempt] = useState<
    any | null
  >(null);
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  const fetchExamDetail = async (examId: string) => {
    setLoadingDetail(true);
    try {
      const response = await api.get(`/analytics/exam/${examId}`);
      setExamDetail(response.data);
      setSelectedExamId(examId);
    } catch (err: any) {
      console.error("Error fetching exam detail:", err);
      showAlert({
        message:
          err.response?.data?.message || "Detallar yüklənərkən xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleGradeAnswer = async (
    attemptId: string,
    answerId: string,
    points: number
  ) => {
    try {
      await api.put(`/exam-attempts/${attemptId}/answers/${answerId}/grade`, {
        points,
      });
      showAlert({
        message: "Bal uğurla yeniləndi!",
        type: "success",
        confirmButtonText: "Tamam",
      });
      // Refresh exam detail
      if (selectedExamId) {
        const response = await api.get(`/analytics/exam/${selectedExamId}`);
        setExamDetail(response.data);
        // Update selected student attempt if modal is open
        if (selectedStudentAttempt) {
          const updatedAttempt = response.data.attempts.find(
            (a: any) => a.id === selectedStudentAttempt.id
          );
          if (updatedAttempt) {
            setSelectedStudentAttempt(updatedAttempt);
          }
        }
      }
    } catch (err: any) {
      showAlert({
        message:
          err.response?.data?.message || "Bal yenilənərkən xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
    }
  };

  const closeDetail = () => {
    setSelectedExamId(null);
    setExamDetail(null);
    setGradingAnswers({});
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Statistika</h1>
          <p className="text-gray-600">İmtahan statistikalarını görüntüləyin</p>
        </div>

        {stats.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              Hələ statistika yoxdur. İmtahan yaradıb yayımlayın.
            </p>
            <Link
              href="/exams/create"
              aria-label="Yeni imtahan yarat"
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              İmtahan Yarat
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ümumi İmtahan</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span
                      className="text-2xl"
                      role="img"
                      aria-label="Statistika"
                    >
                      📊
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Ümumi Cəhd</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.reduce((sum, s) => sum + s.totalAttempts, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl" role="img" aria-label="İmtahan">
                      📝
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Orta Bal</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.length > 0
                        ? (
                            stats.reduce((sum, s) => sum + s.averageScore, 0) /
                            stats.length
                          ).toFixed(1)
                        : "0"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl" role="img" aria-label="Ulduz">
                      ⭐
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Şagird Sayı</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {summaryData?.totalStudents || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span
                      className="text-2xl"
                      role="img"
                      aria-label="İstifadəçilər"
                    >
                      👥
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Statistics Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  İmtahan Statistikaları
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İmtahan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cəhd Sayı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orta Bal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamamlanma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Əməliyyat
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.map((stat) => (
                      <tr key={stat.examId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {stat.examTitle}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {stat.totalAttempts}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {stat.averageScore > 0
                              ? `${stat.averageScore.toFixed(1)}%`
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {stat.completionRate > 0
                              ? `${(stat.completionRate * 100).toFixed(1)}%`
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => fetchExamDetail(stat.examId)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Detallı gör
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Exam Detail Modal */}
        {examDetail && selectedExamId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {examDetail.examTitle}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {examDetail.totalAttempts} cəhd • Orta bal:{" "}
                    {examDetail.averageScore.toFixed(1)}%
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {examDetail.attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedStudentAttempt(attempt)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {attempt.student.firstName}{" "}
                                {attempt.student.lastName}
                              </h3>
                              {attempt.position > 0 &&
                                attempt.position <= 3 && (
                                  <span className="text-2xl">
                                    <span
                                      role="img"
                                      aria-label={`${
                                        attempt.position === 1
                                          ? "Birinci"
                                          : attempt.position === 2
                                          ? "İkinci"
                                          : "Üçüncü"
                                      } yer medalı`}
                                    >
                                      {attempt.position === 1
                                        ? "🥇"
                                        : attempt.position === 2
                                        ? "🥈"
                                        : "🥉"}
                                    </span>
                                  </span>
                                )}
                              {attempt.position > 0 && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  #{attempt.position}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {attempt.student.email}
                            </p>
                            {attempt.prizeAmount > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-sm font-semibold text-green-600">
                                  +{attempt.prizeAmount.toFixed(2)} AZN mükafat
                                </span>
                                <span
                                  className="text-xs"
                                  role="img"
                                  aria-label="Pul"
                                >
                                  💰
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {attempt.score !== null &&
                              attempt.totalScore !== null
                                ? `${attempt.score}/${attempt.totalScore}`
                                : "-"}
                            </div>
                            {attempt.percentage && (
                              <div className="text-sm text-gray-600">
                                {attempt.percentage}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {examDetail.attempts.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        Hələ heç bir cəhd yoxdur
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student Detail Modal */}
        {selectedStudentAttempt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedStudentAttempt.student.firstName}{" "}
                    {selectedStudentAttempt.student.lastName}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedStudentAttempt.student.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentAttempt(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      Bal:{" "}
                      {selectedStudentAttempt.score !== null &&
                      selectedStudentAttempt.totalScore !== null
                        ? `${selectedStudentAttempt.score}/${selectedStudentAttempt.totalScore}`
                        : "-"}
                    </div>
                    {selectedStudentAttempt.percentage && (
                      <div className="text-sm text-gray-600">
                        {selectedStudentAttempt.percentage}%
                      </div>
                    )}
                  </div>
                  {selectedStudentAttempt.position > 0 && (
                    <div className="flex items-center gap-2">
                      {selectedStudentAttempt.position <= 3 && (
                        <span className="text-3xl">
                          {selectedStudentAttempt.position === 1
                            ? "🥇"
                            : selectedStudentAttempt.position === 2
                            ? "🥈"
                            : "🥉"}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                        #{selectedStudentAttempt.position}
                      </span>
                    </div>
                  )}
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  {selectedStudentAttempt.answers?.map(
                    (answer: any, answerIndex: number) => {
                      const readingText = answer.readingText || null;

                      return (
                        <div key={answer.id} className="space-y-2">
                          <div
                            className={`rounded-lg p-4 border-2 ${
                              answer.isCorrect
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-gray-700">
                                    Sual {answerIndex + 1}
                                  </span>
                                  {answer.readingText && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      📖 Mətn əsaslı
                                    </span>
                                  )}
                                  <span
                                    className={`text-xs font-medium px-2 py-1 rounded ${
                                      answer.isCorrect
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {answer.isCorrect ? "✓ Düzgün" : "✗ Səhv"}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {answer.questionContent}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  Maksimum bal: {answer.questionPoints}
                                </p>

                                {answer.questionType ===
                                QuestionType.OPEN_ENDED ? (
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1">
                                        Şagirdin cavabı:
                                      </p>
                                      <p className="text-sm text-gray-800 bg-white p-2 rounded border">
                                        {answer.content || "Cavab yoxdur"}
                                      </p>
                                    </div>
                                    {answer.modelAnswer && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-700 mb-1">
                                          Nümunə cavab:
                                        </p>
                                        <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                                          {answer.modelAnswer}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {answer.questionOptions &&
                                      answer.questionOptions.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-700 mb-2">
                                            Bütün variantlar:
                                          </p>
                                          <div className="space-y-2">
                                            {answer.questionOptions.map(
                                              (opt: any, optIndex: number) => {
                                                const isSelected =
                                                  answer.optionId === opt.id;
                                                let isCorrect = false;
                                                if (answer.correctAnswer) {
                                                  if (
                                                    answer.correctAnswer
                                                      .length > 15
                                                  ) {
                                                    isCorrect =
                                                      answer.correctAnswer ===
                                                      opt.id;
                                                  } else {
                                                    const correctIndex =
                                                      parseInt(
                                                        answer.correctAnswer,
                                                        10
                                                      );
                                                    if (
                                                      !isNaN(correctIndex) &&
                                                      correctIndex === optIndex
                                                    ) {
                                                      isCorrect = true;
                                                    }
                                                  }
                                                }

                                                return (
                                                  <div
                                                    key={opt.id}
                                                    className={`p-3 rounded-lg border-2 ${
                                                      isSelected && isCorrect
                                                        ? "bg-green-100 border-green-500"
                                                        : isSelected &&
                                                          !isCorrect
                                                        ? "bg-red-100 border-red-500"
                                                        : isCorrect &&
                                                          !isSelected
                                                        ? "bg-blue-50 border-blue-300"
                                                        : "bg-gray-50 border-gray-200"
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-semibold text-gray-900">
                                                        {String.fromCharCode(
                                                          65 + optIndex
                                                        )}
                                                        .
                                                      </span>
                                                      <span className="flex-1 text-gray-900">
                                                        {opt.content}
                                                      </span>
                                                      {isSelected && (
                                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                                                          Seçilmiş
                                                        </span>
                                                      )}
                                                      {isCorrect && (
                                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                                                          ✓ Düzgün cavab
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>

                              {answer.questionType ===
                                QuestionType.OPEN_ENDED && (
                                <div className="mt-3 flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={answer.questionPoints}
                                    value={
                                      gradingAnswers[answer.id] ??
                                      answer.points ??
                                      0
                                    }
                                    onChange={(e) =>
                                      setGradingAnswers({
                                        ...gradingAnswers,
                                        [answer.id]:
                                          parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                  />
                                  <span className="text-sm text-gray-600">
                                    / {answer.questionPoints}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleGradeAnswer(
                                        selectedStudentAttempt.id,
                                        answer.id,
                                        gradingAnswers[answer.id] ??
                                          answer.points ??
                                          0
                                      )
                                    }
                                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-all"
                                  >
                                    Yadda saxla
                                  </button>
                                </div>
                              )}

                              <div className="mt-2 text-xs text-gray-500">
                                Alınan bal: {answer.points ?? 0} /{" "}
                                {answer.questionPoints}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {selectedStudentAttempt.submittedAt && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    Təqdim olunub:{" "}
                    {new Date(
                      selectedStudentAttempt.submittedAt
                    ).toLocaleString("az-AZ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <AlertComponent />
    </div>
  );
}
