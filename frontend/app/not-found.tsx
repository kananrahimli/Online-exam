"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-6xl">404</span>
          </div>
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Səhifə Tapılmadı
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          Axtardığınız səhifə mövcud deyil və ya silinib.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            İdarə Panelinə Qayıt
          </Link>

          <Link
            href="/"
            className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl"
          >
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    </div>
  );
}
