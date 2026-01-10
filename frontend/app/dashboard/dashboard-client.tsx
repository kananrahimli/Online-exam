"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import Navigation from "@/components/Navigation";

interface DashboardClientProps {
  initialUser: any;
}

export default function DashboardClient({ initialUser }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [balanceMessage, setBalanceMessage] = useState<string | null>(null);

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation user={initialUser} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {balanceMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium">{balanceMessage}</p>
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

        {initialUser.role === UserRole.STUDENT && (
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
