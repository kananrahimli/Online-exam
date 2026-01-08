"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface Withdrawal {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  reason?: string;
  bankAccount?: string;
  bankName?: string;
  createdAt: string;
  completedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface PendingWithdrawalsClientProps {
  initialUser: any;
}

export default function PendingWithdrawalsClient({
  initialUser,
}: PendingWithdrawalsClientProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
    fetchPendingWithdrawals();
  }, [initialUser, setUser]);

  const fetchPendingWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payments/withdrawals/pending");
      setWithdrawals(response.data || []);
    } catch (err: any) {
      console.error("Error fetching pending withdrawals:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    withdrawalId: string,
    status: "COMPLETED" | "REJECTED"
  ) => {
    try {
      setUpdating(withdrawalId);
      setMessage(null);

      const reason =
        status === "REJECTED" ? rejectReason[withdrawalId] : undefined;

      await api.post(`/payments/withdrawals/${withdrawalId}/status`, {
        status,
        reason,
      });

      setMessage({
        type: "success",
        text: `Çıxarış ${status === "COMPLETED" ? "təsdiqləndi" : "rədd edildi"}`,
      });

      // Yenilə
      await fetchPendingWithdrawals();
      setRejectReason({});
    } catch (err: any) {
      console.error("Error updating withdrawal status:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setUpdating(null);
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
                Gözləyən Çıxarışlar
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {message && (
          <div
            className={`mb-4 border-l-4 px-4 py-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border-green-500 text-green-700"
                : "bg-red-50 border-red-500 text-red-700"
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Yüklənir...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              Gözləyən çıxarış sorğusu yoxdur
            </p>
            <Link
              href={ROUTES.DASHBOARD}
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Dashboard-a qayıt
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {withdrawal.user.firstName} {withdrawal.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{withdrawal.user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(withdrawal.createdAt).toLocaleString("az-AZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">
                      {withdrawal.amount.toFixed(2)} AZN
                    </div>
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold mt-2">
                      Gözləyir
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Bank:</span>
                    <span className="ml-2 font-semibold">
                      {withdrawal.bankName || "Təyin edilməyib"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hesab:</span>
                    <span className="ml-2 font-semibold">
                      {withdrawal.bankAccount || "Təyin edilməyib"}
                    </span>
                  </div>
                </div>

                {withdrawal.status === "PENDING" && (
                  <div className="border-t pt-4 mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rədd səbəbi (yalnız rədd edəndə):
                      </label>
                      <textarea
                        value={rejectReason[withdrawal.id] || ""}
                        onChange={(e) =>
                          setRejectReason({
                            ...rejectReason,
                            [withdrawal.id]: e.target.value,
                          })
                        }
                        placeholder="Rədd səbəbini yazın..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() =>
                          handleUpdateStatus(withdrawal.id, "COMPLETED")
                        }
                        disabled={updating === withdrawal.id}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating === withdrawal.id ? "Yenilənir..." : "Təsdiqlə"}
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(withdrawal.id, "REJECTED")
                        }
                        disabled={updating === withdrawal.id}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating === withdrawal.id ? "Yenilənir..." : "Rədd Et"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


