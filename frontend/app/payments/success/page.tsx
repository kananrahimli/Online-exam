"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams?.get("payment_id");
      const sessionId = searchParams?.get("session_id");

      if (!paymentId) {
        setError("Ödəniş ID tapılmadı");
        setLoading(false);
        return;
      }

      try {
        // Ödənişi təsdiqlə
        const response = await api.post(`/payments/verify/${paymentId}`);

        if (response.data && response.data.message) {
          setSuccess(true);
          // Bir neçə saniyə sonra dashboard-a yönləndir
          setTimeout(() => {
            router.push("/dashboard?paymentSuccess=true");
          }, 3000);
        } else {
          setError("Ödəniş təsdiqlənmədi");
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        setError(
          err.response?.data?.message || "Ödəniş təsdiqlənmədi"
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ödəniş təsdiqlənir...
          </h2>
          <p className="text-gray-600">Zəhmət olmasa gözləyin</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ödəniş xətası
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            İdarə panelinə qayıt
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ödəniş uğurlu!
          </h2>
          <p className="text-gray-600 mb-6">
            Ödənişiniz uğurla tamamlandı. Balansınız yeniləndi.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Sizi 3 saniyə ərzində idarə panelinə yönləndiririk...
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            İdarə panelinə qayıt
          </Link>
        </div>
      </div>
    );
  }

  return null;
}


