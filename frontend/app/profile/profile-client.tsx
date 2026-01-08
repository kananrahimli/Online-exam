"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import TeacherMultiSelect from "@/components/TeacherMultiSelect";
import { UserRole } from "@/lib/types";
import { useAlert } from "@/hooks/useAlert";
import { saveTeachers } from "@/lib/actions/teachers";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ProfileClientProps {
  initialUser: any;
  initialAllTeachers: Teacher[];
  initialMyTeachers: Teacher[];
}

export default function ProfileClient({
  initialUser,
  initialAllTeachers,
  initialMyTeachers,
}: ProfileClientProps) {
  const router = useRouter();
  const { setUser, user } = useAuthStore();
  const { showConfirm, AlertComponent } = useAlert();
  const [myTeachers, setMyTeachers] = useState<Teacher[]>(initialMyTeachers);
  const [allTeachers] = useState<Teacher[]>(initialAllTeachers);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(
    initialMyTeachers.map((t) => t.id)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: initialUser?.firstName || "",
    lastName: initialUser?.lastName || "",
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
  });
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [addingBalance, setAddingBalance] = useState(false);
  const [balances, setBalances] = useState<any>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Current user state (may be updated)
  const currentUser = user || initialUser;

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
    }
    // Balansları yüklə
    fetchBalances();
    if (currentUser?.role === "TEACHER" || currentUser?.role === "ADMIN") {
      fetchWithdrawals();
    }
  }, [initialUser, setUser, currentUser]);

  const fetchBalances = async () => {
    try {
      const response = await api.get("/payments/balances");
      setBalances(response.data);
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get("/payments/withdrawals");
      setWithdrawals(response.data);
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setMessage({
        type: "error",
        text: "Zəhmət olmasa düzgün məbləğ daxil edin",
      });
      return;
    }

    // if (
    //   currentUser?.role === "TEACHER"
    //   // parseFloat(withdrawAmount) < 30
    // ) {
    //   setMessage({
    //     type: "error",
    //     text: "Müəllimlər üçün minimum çıxarış məbləği 30 AZN-dir",
    //   });
    //   return;
    // }

    setWithdrawing(true);
    setMessage(null);

    try {
      // Əvvəlcə Stripe statusunu yoxla
      const statusResponse = await api.get("/teacher/stripe/status");
      const stripeStatus = statusResponse.data;

      // Əgər verify olunmayıbsa, onboarding linkinə yönləndir
      if (
        !stripeStatus.connected ||
        !stripeStatus.payoutsEnabled ||
        !stripeStatus.detailsSubmitted
      ) {
        // Onboarding linki al
        const onboardingResponse = await api.get(
          "/teacher/stripe/onboarding-link"
        );
        const onboardingUrl = onboardingResponse.data.url;

        setMessage({
          type: "error",
          text: "Stripe hesabınızı verify etməlisiniz. Sizi onboarding səhifəsinə yönləndiririk...",
        });

        // 2 saniyə sonra yönləndir
        setTimeout(() => {
          window.location.href = onboardingUrl;
        }, 2000);
        setWithdrawing(false);
        return;
      }

      // Verify olunubsa, birbaşa withdrawal et
      const endpoint =
        currentUser?.role === "TEACHER"
          ? "/payments/withdraw/teacher"
          : "/payments/withdraw/admin";
      const response = await api.post(endpoint, {
        amount: parseFloat(withdrawAmount),
        // bankAccount və bankName artıq göndərilmir
      });

      // Response-da status yoxla
      const withdrawal = response.data;
      if (withdrawal?.status === "COMPLETED") {
        setMessage({
          type: "success",
          text:
            currentUser?.role === "ADMIN"
              ? "Pul uğurla çıxarıldı"
              : "Pul uğurla çıxarıldı və Stripe hesabınıza köçürüldü",
        });
      } else if (withdrawal?.status === "PENDING") {
        setMessage({
          type: "error",
          text: "Çıxarış sorğusu göndərildi, amma Stripe transfer uğursuz oldu. Sorğu gözləmədədir və tezliklə həll olunacaq.",
        });
      } else {
        setMessage({
          type: "success",
          text:
            currentUser?.role === "ADMIN"
              ? "Pul uğurla çıxarıldı"
              : "Pul uğurla çıxarıldı və Stripe hesabınıza köçürüldü",
        });
      }

      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setBankAccount("");
      setBankName("");

      await fetchBalances();
      await fetchWithdrawals();
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      const errorMessage =
        err.response?.data?.message || "Çıxarış zamanı xəta baş verdi";

      // Əgər error mesajında "gözləmədədir" varsa, bu PENDING withdrawal deməkdir
      if (
        errorMessage.includes("gözləmədədir") ||
        errorMessage.includes("PENDING")
      ) {
        setMessage({
          type: "error",
          text: errorMessage,
        });
        // Balansları yenilə ki, withdrawal görünsün
        await fetchBalances();
        await fetchWithdrawals();
      } else {
        setMessage({
          type: "error",
          text: errorMessage,
        });
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await api.put("/auth/profile", profileData);
      setUser(response.data);
      setMessage({ type: "success", text: "Məlumatlarınız uğurla yeniləndi" });
      setEditing(false);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBalance = async () => {
    if (!balanceAmount || parseFloat(balanceAmount) <= 0) {
      setMessage({
        type: "error",
        text: "Zəhmət olmasa düzgün məbləğ daxil edin",
      });
      return;
    }

    setAddingBalance(true);
    setMessage(null);

    try {
      const response = await api.post("/payments/add-balance", {
        amount: parseFloat(balanceAmount),
      });

      // Stripe checkout URL-inə yönləndir
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("Ödəniş URL-i alına bilmədi");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Ödəniş zamanı xəta baş verdi",
      });
      setAddingBalance(false);
    }
  };

  const handleSaveTeachers = async () => {
    if (!currentUser || currentUser.role !== "STUDENT") return;

    setSaving(true);
    setMessage(null);

    try {
      const currentTeacherIds = myTeachers.map((t) => t.id);
      const toAdd = selectedTeachers.filter(
        (id) => !currentTeacherIds.includes(id)
      );
      const toRemove = currentTeacherIds.filter(
        (id) => !selectedTeachers.includes(id)
      );
      await saveTeachers(toAdd, toRemove);
      router.refresh();

      // // Refresh teachers
      // const response = await api.get("/teacher-student/teachers");
      // const { myTeachers: myTeachersData } = response.data;
      // setMyTeachers(myTeachersData);
      // setSelectedTeachers(myTeachersData.map((t: Teacher) => t.id));

      setMessage({
        type: "success",
        text: "Müəllimləriniz uğurla yeniləndi",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-3">
                <Link href="/dashboard" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                    <span
                      className="text-white font-bold text-lg"
                      role="img"
                      aria-label="İmtahan kağızı"
                    >
                      📝
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Online İmtahan
                  </h1>
                </Link>
              </div>
              <div className="flex items-center space-x-6">
                {currentUser && (
                  <div className="text-right">
                    <p className="text-gray-900 font-semibold">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {currentUser.role === UserRole.STUDENT
                        ? "Şagird"
                        : "Müəllim"}
                    </p>
                  </div>
                )}
                <Link
                  href="/dashboard"
                  aria-label="İdarə panelinə qayıt"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  İdarə paneli
                </Link>
                <button
                  onClick={() => {
                    useAuthStore.getState().logout();
                    // logout() already redirects to /login
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Profile Info */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Şəxsi Məlumatlar
                </h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    Redaktə et{" "}
                    <span role="img" aria-label="Qələm">
                      ✏️
                    </span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setProfileData({
                          firstName: currentUser?.firstName || "",
                          lastName: currentUser?.lastName || "",
                          email: currentUser?.email || "",
                          phone: currentUser?.phone || "",
                        });
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all shadow-md"
                    >
                      Ləğv et
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {saving ? "Yadda saxlanılır..." : "Yadda saxla"}
                    </button>
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={`mb-4 px-4 py-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 border-l-4 border-green-500 text-green-700"
                      : "bg-red-50 border-l-4 border-red-500 text-red-700"
                  }`}
                >
                  <p className="font-medium">{message.text}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          firstName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    />
                  ) : (
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {currentUser?.firstName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Soyad
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          lastName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    />
                  ) : (
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {currentUser?.lastName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    />
                  ) : (
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {currentUser?.email}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefon nömrəsi{" "}
                    {editing && (
                      <span className="text-gray-500 text-xs">
                        (istəyə bağlı)
                      </span>
                    )}
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="+994501234567"
                    />
                  ) : (
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {currentUser?.phone || (
                        <span className="text-gray-400 italic">
                          Nömrə əlavə edilməyib
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Section */}
            {currentUser?.role === "STUDENT" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Balans{" "}
                  <span role="img" aria-label="Pul">
                    💰
                  </span>
                </h2>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">
                    {(balances?.balance || currentUser?.balance || 0).toFixed(
                      2
                    )}{" "}
                    AZN
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    <span role="img" aria-label="İpucu">
                      💡
                    </span>{" "}
                    Balans yalnız imtahanlar üçün istifadə oluna bilər
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBalanceModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Balansı Artır{" "}
                  <span role="img" aria-label="Əlavə et">
                    ➕
                  </span>
                </button>
              </div>
            )}

            {/* Teacher Balance Section */}
            {currentUser?.role === "TEACHER" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Müəllim Balansı{" "}
                  <span role="img" aria-label="Pul">
                    💰
                  </span>
                </h2>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {(balances?.teacherBalance || 0).toFixed(2)} AZN
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    <span role="img" aria-label="İpucu">
                      💡
                    </span>{" "}
                    Minimum çıxarış məbləği: 30 AZN
                  </p>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  // disabled={(balances?.teacherBalance || 0) < 30}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pul Çıxart{" "}
                  <span role="img" aria-label="Çıxarış">
                    💸
                  </span>
                </button>
              </div>
            )}

            {/* Admin Balance Section */}
            {currentUser?.role === "ADMIN" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Admin Balansı{" "}
                  <span role="img" aria-label="Pul">
                    💰
                  </span>
                </h2>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {(balances?.adminBalance || 0).toFixed(2)} AZN
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    <span role="img" aria-label="İpucu">
                      💡
                    </span>{" "}
                    İstənilən vaxt pul çıxara bilərsiniz
                  </p>
                </div>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={(balances?.adminBalance || 0) <= 0}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pul Çıxart{" "}
                  <span role="img" aria-label="Çıxarış">
                    💸
                  </span>
                </button>
              </div>
            )}

            {/* Withdrawals History */}
            {(currentUser?.role === "TEACHER" ||
              currentUser?.role === "ADMIN") && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Çıxarışlar{" "}
                  <span role="img" aria-label="Tarixçə">
                    📋
                  </span>
                </h2>
                {withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal: any) => (
                      <div
                        key={withdrawal.id}
                        className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {withdrawal.amount.toFixed(2)} AZN
                            </div>
                            <div className="text-sm text-gray-500">
                              {withdrawal.bankName} - {withdrawal.bankAccount}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(withdrawal.createdAt).toLocaleString(
                                "az-AZ"
                              )}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                withdrawal.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : withdrawal.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {withdrawal.status === "COMPLETED"
                                ? "Tamamlandı"
                                : withdrawal.status === "REJECTED"
                                ? "Rədd edildi"
                                : "Gözləyir"}
                            </span>
                            {withdrawal.reason && (
                              <div className="text-xs text-red-600 mt-1">
                                {withdrawal.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Hələ çıxarış yoxdur
                  </p>
                )}
              </div>
            )}

            {/* My Teachers Section */}
            {currentUser?.role === "STUDENT" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Müəllimlərim
                </h2>
                <p className="text-gray-600 mb-6">
                  Müəllimlərinizi seçin və ya silin. Yalnız izlədiyiniz
                  müəllimlərin imtahanlarını görə bilərsiniz.
                </p>

                {message && (
                  <div
                    className={`mb-4 px-4 py-3 rounded-lg ${
                      message.type === "success"
                        ? "bg-green-50 border-l-4 border-green-500 text-green-700"
                        : "bg-red-50 border-l-4 border-red-500 text-red-700"
                    }`}
                  >
                    <p className="font-medium">{message.text}</p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Müəllimləri seçin
                  </label>
                  <TeacherMultiSelect
                    selectedTeachers={selectedTeachers}
                    onChange={setSelectedTeachers}
                    placeholder="Müəllimləri seçin..."
                    teachers={allTeachers}
                  />
                </div>

                <button
                  onClick={handleSaveTeachers}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {saving
                    ? "Yadda saxlanılır..."
                    : "Dəyişiklikləri Yadda Saxla"}
                </button>

                {myTeachers.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Hazırkı Müəllimlərim ({myTeachers.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="font-semibold text-gray-900">
                            {teacher.firstName} {teacher.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {teacher.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher Section */}
            {currentUser?.role === "TEACHER" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Müəllim Paneli
                </h2>
                <p className="text-gray-600 mb-6">
                  Bu panel müəllimlər üçündür. İmtahanlarınızı yaratmaq və idarə
                  etmək üçün idarə panelindən istifadə edin.
                </p>
                <Link
                  href="/dashboard"
                  aria-label="İdarə panelinə qayıt"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  İdarə panelinə qayıt <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>

          {/* Add Balance Modal */}
          {showAddBalanceModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Balans Artır{" "}
                  <span role="img" aria-label="Pul">
                    💰
                  </span>
                </h3>

                {message && message.type === "error" && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700">
                    <p className="font-medium text-sm">{message.text}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Məbləğ (AZN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={balanceAmount}
                    onChange={(e) => {
                      setBalanceAmount(e.target.value);
                      if (message && message.type === "error") {
                        setMessage(null);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    placeholder="Məs: 10.00"
                  />
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Bu məbləğ balansınıza əlavə ediləcək və istədiyiniz vaxt
                  imtahanlar üçün istifadə edə bilərsiniz. Ödəniş Stripe ilə
                  aparılacaq.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddBalanceModal(false);
                      setBalanceAmount("");
                      setMessage(null);
                      setAddingBalance(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleAddBalance}
                    disabled={
                      addingBalance ||
                      !balanceAmount ||
                      parseFloat(balanceAmount) <= 0
                    }
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingBalance ? "Yüklənir..." : "Ödənişə keç"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdraw Modal */}
          {showWithdrawModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Pul Çıxart{" "}
                  <span role="img" aria-label="Pul">
                    💸
                  </span>
                </h3>

                {message && message.type === "error" && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700">
                    <p className="font-medium text-sm">{message.text}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Məbləğ (AZN)
                  </label>
                  <input
                    type="number"
                    min={currentUser?.role === "TEACHER" ? "30" : "0.01"}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value);
                      if (message && message.type === "error") {
                        setMessage(null);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    placeholder={
                      currentUser?.role === "TEACHER"
                        ? "Minimum 30 AZN"
                        : currentUser?.role === "ADMIN"
                        ? "İstənilən məbləğ (Məs: 10.00)"
                        : "Məs: 10.00"
                    }
                  />
                  {currentUser?.role === "TEACHER" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum çıxarış məbləği: 30 AZN
                    </p>
                  )}
                  {currentUser?.role === "ADMIN" && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Admin üçün minimum məbləğ yoxdur - istənilən vaxt pul
                      çıxara bilərsiniz
                    </p>
                  )}
                </div>

                {/* Bank inputları kommentə alındı - Stripe onboarding istifadə olunur */}
                {/* <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Adı
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (message && message.type === "error") {
                        setMessage(null);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    placeholder="Məs: Kapital Bank"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Hesabı
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => {
                      setBankAccount(e.target.value);
                      if (message && message.type === "error") {
                        setMessage(null);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    placeholder="Məs: AZ12345678901234567890"
                  />
                </div> */}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setWithdrawAmount("");
                      setBankAccount("");
                      setBankName("");
                      setMessage(null);
                      setWithdrawing(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={
                      withdrawing ||
                      !withdrawAmount ||
                      parseFloat(withdrawAmount) <= 0
                    }
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? "Göndərilir..." : "Nağdlaşdır"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
