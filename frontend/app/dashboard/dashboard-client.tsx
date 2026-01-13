"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import api from "@/lib/api";

interface DashboardClientProps {
  initialUser: any;
}

export default function DashboardClient({ initialUser }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, user } = useAuthStore();
  const [balanceMessage, setBalanceMessage] = useState<string | null>(null);
  const [prizeInfo, setPrizeInfo] = useState<{
    amount: number;
    exams: Array<{ examId: string; examTitle: string }>;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState(initialUser);

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
      setCurrentUser(initialUser);
    }
  }, [initialUser, setUser]);

  useEffect(() => {
    // Check and award prizes for student when they log in to dashboard
    const checkPrizes = async () => {
      if (initialUser?.role === UserRole.STUDENT) {
        try {
          const response = await api.post("/exam-attempts/check-prizes");
          console.log("Mükafatlar yoxlanıldı", response.data);

          // If student won a prize, show celebration
          if (response.data?.prizeAmount > 0) {
            setPrizeInfo({
              amount: response.data.prizeAmount,
              exams: response.data.prizeExams || [],
            });

            // Fetch updated user data from API to get the latest balance
            try {
              const userResponse = await api.get("/auth/me");
              const updatedUser = userResponse.data;
              setUser(updatedUser);
              setCurrentUser(updatedUser);

              // Force revalidation of balance cache by calling router.refresh()
              // This ensures all components using user data will get the updated balance
              router.refresh();
            } catch (userError) {
              console.error("User məlumatını yeniləyərkən xəta:", userError);
              // Fallback: manually update balance
              if (initialUser) {
                const updatedUser = {
                  ...initialUser,
                  balance:
                    (initialUser.balance || 0) + response.data.prizeAmount,
                };
                setUser(updatedUser);
                setCurrentUser(updatedUser);
              }
            }
          }
        } catch (error) {
          console.error("Mükafatları yoxlarkən xəta:", error);
          // Silently fail - don't show error to user
        }
      }
    };

    checkPrizes();
  }, [initialUser, setUser, router]);

  useEffect(() => {
    // Check if balance was added
    if (searchParams?.get("balanceAdded") === "true") {
      setBalanceMessage("Balansınız uğurla artırıldı! 🎉");
      setTimeout(() => {
        router.replace("/dashboard");
        setBalanceMessage(null);
      }, 5000);
    }
  }, [searchParams, router]);

  // Use currentUser (which is updated after prize) or fallback to store user or initialUser
  const displayUser = currentUser || user || initialUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation user={displayUser} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {balanceMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium">{balanceMessage}</p>
          </div>
        )}

        {/* Prize Celebration Modal */}
        {prizeInfo && prizeInfo.amount > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden animate-scaleIn">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full -mr-20 -mt-20 opacity-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full -ml-16 -mb-16 opacity-20"></div>

              {/* Close button */}
              <button
                onClick={() => setPrizeInfo(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="relative z-10 text-center">
                {/* Trophy icon */}
                <div className="mb-6 flex justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <span className="text-5xl" role="img" aria-label="Kubok">
                      🏆
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Təbriklər! 🎉
                </h2>

                {/* Prize amount */}
                <div className="mb-6">
                  <p className="text-gray-600 text-lg mb-2">
                    Siz mükafat qazandınız:
                  </p>
                  <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-xl shadow-lg">
                    <span className="text-4xl font-bold">
                      +{prizeInfo.amount.toFixed(2)} AZN
                    </span>
                  </div>
                </div>

                {/* Exam info */}
                {prizeInfo.exams.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      Qazandığınız imtahanlar:
                    </p>
                    <div className="space-y-1">
                      {prizeInfo.exams.map((exam, index) => (
                        <p
                          key={exam.examId}
                          className="text-sm text-blue-800 font-medium"
                        >
                          {index + 1}. {exam.examTitle}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <p className="text-gray-700 mb-6">
                  Mükafatınız balansınıza əlavə edildi. Davam edin və daha çox
                  qazanın!
                </p>

                {/* Button */}
                <button
                  onClick={() => setPrizeInfo(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Əla! Davam edək
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Xoş gəlmisiniz!{" "}
            <span role="img" aria-label="Əl salama">
              👋
            </span>
          </h2>
          <p className="text-gray-600 text-lg">
            Sadə, intuitiv və sürətli - bütün imtahanlarınız bir yerdə
          </p>
        </div>

        {displayUser?.role === UserRole.STUDENT && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/exams"
              aria-label="Mövcud imtahanlara keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="Kitab">
                    📚
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Mövcud İmtahanlar
                </h3>
                <p className="text-gray-600 mb-4">
                  Bütün mövcud imtahanları görüntüləyin və ödəniş edin
                </p>
                <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link
              href="/my-exams"
              aria-label="İmtahanlarıma keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="İmtahan">
                    📝
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  İmtahanlarım
                </h3>
                <p className="text-gray-600 mb-4">
                  Verdiyiniz imtahanları görüntüləyin
                </p>
                <span className="inline-flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link
              href="/results"
              aria-label="Nəticələrə keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="Statistika">
                    📊
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Nəticələr
                </h3>
                <p className="text-gray-600 mb-4">
                  İmtahan nəticələrinizi görüntüləyin
                </p>
                <span className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link
              href="/profile"
              aria-label="Şəxsi məlumatlara keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="İstifadəçi">
                    👤
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                  Şəxsi məlumatlar
                </h3>
                <p className="text-gray-600 mb-4">Müəllimlərinizi idarə edin</p>
                <span className="inline-flex items-center text-pink-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </div>
        )}

        {initialUser.role === UserRole.TEACHER && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/exams/create"
              aria-label="Yeni imtahan yarat"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="Əlavə et">
                    ➕
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  Yeni İmtahan
                </h3>
                <p className="text-gray-600 text-sm">Manual imtahan yaradın</p>
              </div>
            </Link>

            <Link
              href="/exams/my-exams"
              aria-label="İmtahanlarım səhifəsinə keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl" role="img" aria-label="Siyahı">
                    📋
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  İmtahanlarım
                </h3>
                <p className="text-gray-600 text-sm">
                  Yaratdığınız imtahanları idarə edin
                </p>
              </div>
            </Link>

            <Link
              href="/exams/ai-generate"
              aria-label="AI ilə imtahan yarat"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  AI ilə Yarat
                </h3>
                <p className="text-gray-600 text-sm">
                  3 klikdə imtahan yaradın
                </p>
              </div>
            </Link>

            <Link
              href="/analytics"
              aria-label="Statistika səhifəsinə keç"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Statistika
                </h3>
                <p className="text-gray-600 text-sm">
                  Detallı statistikaları görün
                </p>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
