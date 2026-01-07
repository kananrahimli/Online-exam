"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { Exam, ExamStatus } from "@/lib/types";
import Link from "next/link";
import { useAlert } from "@/hooks/useAlert";
import { deleteExamAction, publishExamAction } from "@/lib/actions/exams";

interface TeacherMyExamsClientProps {
  initialExams: Exam[];
  initialUser: any;
}

export default function TeacherMyExamsClient({
  initialExams,
  initialUser,
}: TeacherMyExamsClientProps) {
  const { setUser } = useAuthStore();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  useEffect(() => {
    // Refetch when filter changes
    fetchExams();
  }, [statusFilter]);

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter.trim() !== "") {
        params.append("status", statusFilter);
      }
      const queryString = params.toString();
      const response = await api.get(
        `/exams/my-exams${queryString ? `?${queryString}` : ""}`
      );
      setExams(response.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const handlePublish = async (examId: string) => {
    setPublishingId(examId);
    try {
      await publishExamAction(examId);
      fetchExams();
      showAlert({
        message: "İmtahan uğurla yayımlandı!",
        type: "success",
        confirmButtonText: "Tamam",
      });
    } catch (err: any) {
      showAlert({
        message: err?.message || "Xəta baş verdi",
        type: "error",
        confirmButtonText: "Tamam",
      });
    } finally {
      setPublishingId(null);
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

    setDeletingId(examId);
    try {
      await deleteExamAction(examId);
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
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AlertComponent />
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
                aria-label="Yeni imtahan yarat"
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
                aria-label="İlk imtahanı yarat"
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
                        <span>
                          <span role="img" aria-label="Kitab">
                            📚
                          </span>{" "}
                          {exam.subject}
                        </span>
                        <span>
                          <span role="img" aria-label="Statistika">
                            📊
                          </span>{" "}
                          {exam.level}
                        </span>
                        <span>
                          <span role="img" aria-label="Vaxt">
                            ⏱️
                          </span>{" "}
                          {exam.duration} dəq
                        </span>
                        <span>
                          <span role="img" aria-label="Pul">
                            💰
                          </span>{" "}
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
                      aria-label={`${exam.title} imtahanını redaktə et`}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-all"
                    >
                      Redaktə et
                    </Link>
                    {exam.status === ExamStatus.DRAFT && (
                      <button
                        onClick={() => handlePublish(exam.id)}
                        disabled={
                          publishingId === exam.id || deletingId === exam.id
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {publishingId === exam.id ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Yayımlanır...
                          </>
                        ) : (
                          "Yayımla"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(exam.id)}
                      disabled={
                        publishingId === exam.id || deletingId === exam.id
                      }
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deletingId === exam.id ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-red-700"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Silinir...
                        </>
                      ) : (
                        "Sil"
                      )}
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
