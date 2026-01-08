"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";

export default function StripeReauthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getOnboardingLink = async () => {
      try {
        const response = await api.get("/teacher/stripe/onboarding-link");
        setOnboardingUrl(response.data.url);
      } catch (err: any) {
        console.error("Error getting onboarding link:", err);
        setError(
          err.response?.data?.message ||
            "Onboarding linki alına bilmədi. Zəhmət olmasa yenidən cəhd edin."
        );
      } finally {
        setLoading(false);
      }
    };

    getOnboardingLink();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Onboarding linki hazırlanır...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Xəta</h2>
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

  if (onboardingUrl) {
    // Avtomatik yönləndir
    window.location.href = onboardingUrl;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Stripe onboarding səhifəsinə yönləndirilirsiniz...
          </p>
        </div>
      </div>
    );
  }

  return null;
}


