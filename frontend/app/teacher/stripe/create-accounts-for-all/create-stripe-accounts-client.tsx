"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface CreateStripeAccountsClientProps {
  initialUser: any;
}

export default function CreateStripeAccountsClient({
  initialUser,
}: CreateStripeAccountsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

  const handleCreateAccounts = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await api.post("/teacher/stripe/create-accounts-for-all");
      setResult(response.data);
      setMessage({
        type: "success",
        text: response.data.message || "Stripe account-ları uğurla yaradıldı",
      });
    } catch (err: any) {
      console.error("Error creating Stripe accounts:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <Link
                href={ROUTES.DASHBOARD}
                className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="text-white font-bold text-lg">📝</span>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Stripe Account-ları Yarat
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={ROUTES.DASHBOARD}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bütün Müəllim və Admin-lər üçün Stripe Account Yarat
          </h2>
          <p className="text-gray-600 mb-6">
            Bu əməliyyat bütün müəllim və admin-lər üçün (Stripe account-u olmayanlar)
            avtomatik olaraq Stripe account yaradacaq.
          </p>

          {message && (
            <div
              className={`mb-6 border-l-4 px-4 py-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "bg-red-50 border-red-500 text-red-700"
              }`}
            >
              <p className="font-medium">{message.text}</p>
            </div>
          )}

          {result && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Nəticə:</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>Ümumi: {result.results?.total || 0}</li>
                <li>Uğurlu: {result.results?.success || 0}</li>
                <li>Uğursuz: {result.results?.failed || 0}</li>
              </ul>
              {result.results?.errors && result.results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-700 mb-2">Xətalar:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                    {result.results.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCreateAccounts}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Yaradılır...
              </span>
            ) : (
              "Stripe Account-ları Yarat"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}


