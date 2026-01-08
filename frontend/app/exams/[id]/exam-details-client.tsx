"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { Exam } from "@/lib/types";
import { useAlert } from "@/hooks/useAlert";
import { ROUTES, API_ENDPOINTS } from "@/lib/constants/routes";

interface ExamDetailsClientProps {
  initialExam: Exam;
  initialBalance: number;
  initialUser: any;
  examId: string;
}

export default function ExamDetailsClient({
  initialExam,
  initialBalance,
  initialUser,
  examId,
}: ExamDetailsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { showConfirm, AlertComponent } = useAlert();
  const [exam] = useState<Exam>(initialExam);
  const [userBalance, setUserBalance] = useState<number>(initialBalance);
  const [startError, setStartError] = useState("");
  const [starting, setStarting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  // Balansı yenilə səhifə fokus aldıqda
  useEffect(() => {
    fetchBalance();
  }, []);

  const handleStartExamClick = async () => {
    if (!exam) return;

    const examPrice = calculatePrice(exam.duration);

    // Xəbərdarlıq popup-u göstər
    setShowConfirmModal(true);
  };

  const handleStartExam = async () => {
    if (!exam) return;

    setShowConfirmModal(false);
    setStartError("");
    setStarting(true);

    try {
      // İmtahana başla - balansdan avtomatik çıxış olacaq (payment session YOXDUR)
      const response = await api.post(
        API_ENDPOINTS.EXAM_ATTEMPTS.START(examId)
      );

      console.log("Start exam response:", response.data);

      // Attempt ID-ni al və imtahan səhifəsinə yönləndir
      if (response.data?.attemptId) {
        router.push(
          `/exams/${examId}/take?attemptId=${response.data.attemptId}`
        );
      } else if (response.data?.attempt?.id) {
        // Fallback: əgər attemptId yoxdursa amma attempt.id varsa
        router.push(
          `/exams/${examId}/take?attemptId=${response.data.attempt.id}`
        );
      } else {
        console.error("Response data:", response.data);
        throw new Error("İmtahan başladıla bilmədi: attemptId tapılmadı");
      }
    } catch (err: any) {
      console.error("Error starting exam:", err);
      console.error("Error response:", err.response?.data);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "İmtahana başlamaq mümkün olmadı";
      setStartError(errorMessage);
      setStarting(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await api.get("/auth/balance");
      setUserBalance(response.data.balance || 0);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const calculatePrice = (duration: number) => {
    if (duration === 60) return 3;
    if (duration === 120) return 5;
    if (duration === 180) return 10;
    return 3;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} saat${mins > 0 ? ` ${mins} dəqiqə` : ""}`;
    }
    return `${mins} dəqiqə`;
  };

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Xəta baş verdi
          </h2>
          <p className="text-gray-600 mb-6">İmtahan tapılmadı</p>
          <Link
            href="/exams"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            İmtahanlar səhifəsinə qayıt
          </Link>
        </div>
      </div>
    );
  }

  const questionCount =
    (exam.questions?.length || 0) +
    (exam.topics?.reduce(
      (sum, topic) => sum + (topic.questions?.length || 0),
      0
    ) || 0);

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link
              href={ROUTES.DASHBOARD}
              aria-label="İdarə panelinə qayıt"
              className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
            >
              <span className="text-xl" aria-hidden="true">
                ←
              </span>
              <span>İdarə panelinə qayıt</span>
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {exam.title}
              </h1>
              {exam.description && (
                <p className="text-gray-600 text-lg mb-6">{exam.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3" role="img" aria-label="Kitab">
                    📚
                  </span>
                  <div>
                    <p className="text-sm text-gray-600">Fənn</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {exam.subject}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <div className="flex items-center mb-2">
                  <span
                    className="text-2xl mr-3"
                    role="img"
                    aria-label="Statistika"
                  >
                    📊
                  </span>
                  <div>
                    <p className="text-sm text-gray-600">Sinif</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {exam.level}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3" role="img" aria-label="Vaxt">
                    ⏱️
                  </span>
                  <div>
                    <p className="text-sm text-gray-600">Müddət</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDuration(exam.duration)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
                <div className="flex items-center mb-2">
                  <span
                    className="text-2xl mr-3"
                    role="img"
                    aria-label="İmtahan"
                  >
                    📝
                  </span>
                  <div>
                    <p className="text-sm text-gray-600">Sual sayı</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {questionCount} sual
                    </p>
                  </div>
                </div>
              </div>

              {exam.teacher && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 md:col-span-2">
                  <div className="flex items-center mb-2">
                    <span
                      className="text-2xl mr-3"
                      role="img"
                      aria-label="Müəllim"
                    >
                      👤
                    </span>
                    <div>
                      <p className="text-sm text-gray-600">Müəllim</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {exam.teacher.firstName} {exam.teacher.lastName}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              {startError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                  <p className="font-medium">{startError}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-600 mb-1">İmtahan qiyməti</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {calculatePrice(exam.duration)} AZN
                  </p>
                </div>
                <button
                  onClick={handleStartExamClick}
                  disabled={starting}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-lg"
                >
                  {starting ? (
                    "Başlanılır..."
                  ) : (
                    <>
                      İmtahana başla <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center sm:text-right mt-4">
                Hazırkı balansınız:{" "}
                <span className="font-semibold">
                  {userBalance.toFixed(2)} AZN
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && exam && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Xəbərdarlıq{" "}
                <span role="img" aria-label="Xəbərdarlıq">
                  ⚠️
                </span>
              </h3>
              <p className="text-gray-700 mb-4">
                İmtahana başladığınız zaman balansınızdan{" "}
                <span className="font-bold text-indigo-600">
                  {calculatePrice(exam.duration)} AZN
                </span>{" "}
                çıxılacaq.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hazırkı balans:</span>
                  <span className="font-semibold text-gray-900">
                    {userBalance.toFixed(2)} AZN
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Çıxılacaq məbləğ:</span>
                  <span className="font-semibold text-red-600">
                    -{calculatePrice(exam.duration)} AZN
                  </span>
                </div>
                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                  <span className="text-gray-600">Qalacaq balans:</span>
                  <span className="font-bold text-green-600">
                    {(userBalance - calculatePrice(exam.duration)).toFixed(2)}{" "}
                    AZN
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                >
                  Ləğv et
                </button>
                <button
                  onClick={handleStartExam}
                  disabled={starting}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? "Başlanılır..." : "Təsdiq et"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
