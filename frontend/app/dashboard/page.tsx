"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import api from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, setUser, initialize, initialized } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [balanceMessage, setBalanceMessage] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialize only once
    if (!initialized && !initializedRef.current) {
      initializedRef.current = true;
      initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    // Only proceed after initialization
    if (!initialized) return;

    // Check if we have token but no user, try to fetch user
    if (token && !user) {
      api
        .get("/auth/me")
        .then((response) => {
          setUser(response.data);
          setLoading(false);
        })
        .catch(() => {
          router.push("/login");
        });
    } else if (!token) {
      router.push("/login");
    } else {
      setLoading(false);
    }

    // Check if balance was added
    if (searchParams?.get("balanceAdded") === "true") {
      setBalanceMessage("Balansınız uğurla artırıldı! 🎉");
      // Remove query parameter after showing message
      setTimeout(() => {
        router.replace("/dashboard");
        setBalanceMessage(null);
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, searchParams]);

  if (loading || !user) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="text-white font-bold text-lg">📝</span>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Online İmtahan
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-gray-900 font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {user.role === UserRole.STUDENT ? "Şagird" : "Müəllim"}
                </p>
              </div>
              <Link
                href="/profile"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Şəxsi məlumatlar
              </Link>
              <button
                onClick={() => {
                  useAuthStore.getState().logout();
                  router.push("/login");
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
        {balanceMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium">{balanceMessage}</p>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Xoş gəlmisiniz! 👋
          </h2>
          <p className="text-gray-600 text-lg">
            Sadə, intuitiv və sürətli - bütün imtahanlarınız bir yerdə
          </p>
        </div>

        {user.role === UserRole.STUDENT && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/exams"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Mövcud İmtahanlar
                </h3>
                <p className="text-gray-600 mb-4">
                  Bütün mövcud imtahanları görüntüləyin və ödəniş edin
                </p>
                <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et →
                </span>
              </div>
            </Link>

            <Link
              href="/my-exams"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  İmtahanlarım
                </h3>
                <p className="text-gray-600 mb-4">
                  Verdiyiniz imtahanları görüntüləyin
                </p>
                <span className="inline-flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et →
                </span>
              </div>
            </Link>

            <Link
              href="/results"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Nəticələr
                </h3>
                <p className="text-gray-600 mb-4">
                  İmtahan nəticələrinizi görüntüləyin
                </p>
                <span className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et →
                </span>
              </div>
            </Link>

            <Link
              href="/profile"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                  Şəxsi məlumatlar
                </h3>
                <p className="text-gray-600 mb-4">Müəllimlərinizi idarə edin</p>
                <span className="inline-flex items-center text-pink-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Kecid et →
                </span>
              </div>
            </Link>
          </div>
        )}

        {user.role === UserRole.TEACHER && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/exams/create"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">➕</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  Yeni İmtahan
                </h3>
                <p className="text-gray-600 text-sm">Manual imtahan yaradın</p>
              </div>
            </Link>

            <Link
              href="/exams/my-exams"
              className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full -mr-16 -mt-16 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📋</span>
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
