'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-yellow-500 text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Ödəniş Ləğv Edildi
        </h1>
        <p className="text-gray-600 mb-6">
          Ödəniş ləğv edildi və ya uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.
        </p>
        <div className="space-y-3">
          <Link
            href="/profile"
            className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Profilə qayıt
          </Link>
          <button
            onClick={() => router.back()}
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Geri qayıt
          </button>
        </div>
      </div>
    </div>
  );
}

