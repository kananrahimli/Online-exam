"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PaymentSuccessClientProps {
  paymentId: string;
  initialPayment: any;
  initialError: string | null;
  initialMessage: string | null;
  attemptId?: string | null;
  examId?: string | null;
}

export default function PaymentSuccessClient({
  paymentId,
  initialPayment,
  initialError,
  initialMessage,
  attemptId,
  examId,
}: PaymentSuccessClientProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // If payment has attemptId, redirect to exam after 2 seconds
    if (attemptId && examId) {
      const timer = setTimeout(() => {
        setRedirecting(true);
        router.push(`/exams/${examId}/take?attemptId=${attemptId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [attemptId, examId, router]);

  if (initialError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 py-12 px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 text-center">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Xəta</h1>
          <p className="text-gray-600 mb-6">{initialError}</p>
          <Link
            href="/profile"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Profilə qayıt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-teal-50 py-12 px-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Ödəniş Uğurlu!
        </h1>
        <p className="text-gray-600 mb-6">
          {initialMessage || "Ödənişiniz uğurla tamamlandı."}
        </p>
        {initialPayment && (
          <div className="mb-6 text-left inline-block bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Ödəniş ID:</strong> {initialPayment.id}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Məbləğ:</strong> {initialPayment.amount} AZN
            </p>
            <p className="text-sm text-gray-600">
              <strong>Status:</strong> {initialPayment.status}
            </p>
          </div>
        )}
        {attemptId && (
          <p className="text-sm text-gray-500 mb-6">
            {redirecting
              ? "İmtahana yönləndirilirsiniz..."
              : "İmtahana yönləndirilirsiniz..."}
          </p>
        )}
        <div className="space-y-3">
          {attemptId && examId ? (
            <Link
              href={`/exams/${examId}/take?attemptId=${attemptId}`}
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              İmtahana Başla
            </Link>
          ) : (
            <Link
              href="/profile"
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              Profilə Qayıt
            </Link>
          )}
          <Link
            href="/dashboard"
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    </div>
  );
}
