"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { Exam, ExamStatus } from "@/lib/types";
import Link from "next/link";
import { useAlert } from "@/hooks/useAlert";

export default function TeacherMyExamsPage() {
  const router = useRouter();
  const { user, token, initialize } = useAuthStore();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    initialize();
    if (!token) {
      router.push("/login");
      return;
    }

    fetchExams();
  }, [token, router, initialize, statusFilter]);

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter.trim() !== "") {
        params.append("status", statusFilter);
      }
      const queryString = params.toString();
      const response = await api.get(`/exams/my-exams${queryString ? `?${queryString}` : ""}`);
      setExams(response.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (examId: string) => {
    try {
      await api.post(`/exams/${examId}/publish`);
      fetchExams();
      showAlert({
        message: "İmtahan uğurla yayımlandı!",
        type: "success",
        confirmButtonText: "Tamam",
      });
    } catch (err: any) {
      showAlert({
        message: err.response?.data?.message || "Xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
    }
  };

  const handleDelete = async (examId: string) => {
    const confirmed = await showConfirm({
      message: "İmtahanı silmək istədiyinizə əminsiniz?",
      type: "warning",
      confirmButtonText: "Bəli, sil",
      cancelButtonText: "Ləğv et",
      onConfirm: () => {},
    });

    if (!confirmed) return;

    try {
      await api.delete(`/exams/${examId}`);
      fetchExams();
      showAlert({
        message: "İmtahan uğurla silindi!",
        type: "success",
        confirmButtonText: "Tamam",
      });
    } catch (err: any) {
      showAlert({
        message: err.response?.data?.message || "Xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
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

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 mb-4 font-semibold text-lg transition-colors duration-200 hover:gap-3"
            >
              <span className="text-xl">←</span>
              <span>İdarə panelinə qayıt</span>
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  İmtahanlarım
                </h1>
                <p className="text-gray-600">
                  Yaratdığınız imtahanları idarə edin
                </p>
              </div>
              <Link
                href="/exams/create"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                + Yeni İmtahan
              </Link>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setStatusFilter("")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === ""
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Hamısı
              </button>
              <button
                onClick={() => setStatusFilter(ExamStatus.DRAFT)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === ExamStatus.DRAFT
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Qaralama
              </button>
              <button
                onClick={() => setStatusFilter(ExamStatus.PUBLISHED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === ExamStatus.PUBLISHED
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Yayımlanmış
              </button>
            </div>
          </div>

          {exams.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                Hələ imtahan yaratmamısınız
              </p>
              <Link
                href="/exams/create"
                className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                İlk İmtahanı Yarat
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {exam.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            exam.status === ExamStatus.PUBLISHED
                              ? "bg-green-100 text-green-800"
                              : exam.status === ExamStatus.DRAFT
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {exam.status === ExamStatus.PUBLISHED
                            ? "Yayımlanmış"
                            : exam.status === ExamStatus.DRAFT
                            ? "Qaralama"
                            : "Arxiv"}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">
                        {exam.description || "Təsvir yoxdur"}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>📚 {exam.subject}</span>
                        <span>📊 {exam.level}</span>
                        <span>⏱️ {exam.duration} dəq</span>
                        <span>
                          💰{" "}
                          {exam.price ||
                            (exam.duration === 60
                              ? 3
                              : exam.duration === 120
                              ? 5
                              : exam.duration === 180
                              ? 10
                              : 3)}{" "}
                          AZN
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Link
                      href={`/exams/${exam.id}/edit`}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-all"
                    >
                      Redaktə et
                    </Link>
                    {exam.status === ExamStatus.DRAFT && (
                      <button
                        onClick={() => handlePublish(exam.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                      >
                        Yayımla
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-all"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
