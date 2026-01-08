"use client";

import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ödəniş ləğv edildi
        </h2>
        <p className="text-gray-600 mb-6">
          Ödəniş prosesi ləğv edildi. Balansınız dəyişməyib.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/profile"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Profilə qayıt
          </Link>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
          >
            İdarə paneli
          </Link>
        </div>
      </div>
    </div>
  );
}


