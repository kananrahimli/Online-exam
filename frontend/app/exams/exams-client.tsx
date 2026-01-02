"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import { Exam, UserRole } from "@/lib/types";
import Link from "next/link";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ExamsClientProps {
  initialExams: Exam[];
  initialTeachers: Teacher[];
  initialUser: any;
}

export default function ExamsClient({
  initialExams,
  initialTeachers,
  initialUser,
}: ExamsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [teachers] = useState<Teacher[]>(initialTeachers);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  const fetchExams = useCallback(async () => {
    try {
      const response = await api.get("/exams/published");
      let examsData = response.data;

      // Filter by selected teacher
      if (selectedTeacherId) {
        examsData = examsData.filter(
          (exam: Exam) => exam.teacher?.id === selectedTeacherId
        );
      }

      setExams(examsData);
    } catch (err: any) {
      console.error("Error fetching exams:", err);
      if (err.response?.status === 401) {
        return;
      }
      setExams([]);
    }
  }, [selectedTeacherId]);

  useEffect(() => {
    // Refetch exams when teacher filter changes
    if (selectedTeacherId) {
      fetchExams();
    } else {
      // Reset to initial exams when filter is cleared
      setExams(initialExams);
    }
  }, [selectedTeacherId, fetchExams, initialExams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-white font-bold text-lg">📝</span>
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
                  <p className="text-sm text-gray-500 capitalize">
                    {initialUser.role === UserRole.STUDENT ? "Şagird" : "Müəllim"}
                  </p>
                </div>
              )}
              <Link
                href="/profile"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Şəxsi məlumatlar
              </Link>
              <button
                onClick={() => {
                  useAuthStore.getState().logout();
                  // logout() already redirects to /login
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Çıxış
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mövcud İmtahanlar 📚
          </h1>
          <p className="text-gray-600 text-lg">
            Müəllimlərinizin tərtib etdiyi imtahanları görüntüləyin
          </p>
        </div>

        {/* Filter Section */}
        {teachers.length > 0 && (
          <div className="mb-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🔍 Müəllimə görə filter et:
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full md:w-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 shadow-sm transition-all appearance-none bg-no-repeat bg-right pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundSize: "16px 16px",
                backgroundPosition: "right 12px center",
              }}
            >
              <option value="">Hamısı</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* No Teachers Warning */}
        {teachers.length === 0 && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Hələ müəllim izləmirsiniz
                </h3>
                <p className="text-blue-800 mb-3">
                  Müəllimlərin imtahanlarını görmək üçün müəllimləri izləməyə
                  başlayın.
                </p>
                <Link
                  href="/profile"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  Şəxsi məlumatlara get və müəllim əlavə et →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Exams Grid */}
        {exams.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Hələ imtahan yoxdur
              </h3>
              <p className="text-gray-600 mb-6">
                {teachers.length === 0
                  ? "Müəllimləri izləməyə başladıqdan sonra burada imtahanlar görünəcək"
                  : "Seçilmiş müəllimin hələ yayımlanmış imtahanı yoxdur"}
              </p>
              {teachers.length === 0 && (
                <Link
                  href="/profile"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Şəxsi məlumatlar
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="group relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex-1 pr-2">
                      {exam.title}
                    </h3>
                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-sm font-semibold shadow-md whitespace-nowrap">
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

                  <p className="text-gray-600 mb-5 line-clamp-2 min-h-[48px]">
                    {exam.description || "Təsvir yoxdur"}
                  </p>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="mr-2">📚</span>
                      <span className="font-medium">{exam.subject}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="mr-2">⏱️</span>
                      <span className="font-medium">
                        {exam.duration} dəqiqə
                      </span>
                    </div>
                    {exam.teacher && (
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="mr-2">👤</span>
                        <span className="font-medium">
                          {exam.teacher.firstName} {exam.teacher.lastName}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/exams/${exam.id}`}
                    className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl group-hover:scale-[1.02]"
                  >
                    İmtahana bax →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
