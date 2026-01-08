"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StripeOnboardingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 3 saniyə sonra dashboard-a yönləndir
    const timer = setTimeout(() => {
      router.push("/dashboard?stripeOnboarding=success");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center bg-white rounded-xl shadow-xl p-8 max-w-md mx-4">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Stripe hesabı uğurla yaradıldı!
        </h2>
        <p className="text-gray-600 mb-6">
          Stripe Connect onboarding prosesini tamamladınız. İndi ödənişləri
          qəbul edə bilərsiniz.
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


