"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import TeacherMultiSelect from "@/components/TeacherMultiSelect";
import { UserRole } from "@/lib/types";
import { useAlert } from "@/hooks/useAlert";
import { saveTeachers } from "@/lib/actions/teachers";
import { addBalanceAction, verifyPaymentAction } from "@/lib/actions/payments";
import Navigation from "@/components/Navigation";

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
  const searchParams = useSearchParams();
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
  const [isClient, setIsClient] = useState(false);

  // ✅ HYDRATION FIX: Client-side balance state
  const [clientBalance, setClientBalance] = useState<number | null>(null);

  // Teacher withdrawal states
  const [teacherBalance, setTeacherBalance] = useState<number>(0);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [loadingBankAccount, setLoadingBankAccount] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({
    accountNumber: "",
    bankName: "",
    accountHolderName: "",
    iban: "",
    phoneNumber: "",
  });

  // Current user state
  const currentUser = user || initialUser;

  // ✅ HYDRATION FIX 1: Initialize client state
  useEffect(() => {
    setIsClient(true);

    // Set initial balance from props
    if (initialUser?.balance !== undefined && clientBalance === null) {
      setClientBalance(initialUser.balance);
    }

    // Set initial teacher balance from props
    if (initialUser?.teacherBalance !== undefined) {
      setTeacherBalance(initialUser.teacherBalance);
    }

    // Sync store if empty
    if (initialUser && !user) {
      setUser(initialUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to prevent hydration mismatch

  // Fetch teacher balance and bank account for teachers
  useEffect(() => {
    if (currentUser?.role === "TEACHER") {
      // Set initial teacher balance from user
      if (initialUser?.teacherBalance !== undefined) {
        setTeacherBalance(initialUser.teacherBalance);
      }

      // Fetch teacher balance from API
      api
        .get("/payments/teacher/balance")
        .then((response) => {
          const balance = response.data.balance || 0;
          setTeacherBalance(balance);
          // Update user in store
          if (user) {
            setUser({ ...user, teacherBalance: balance });
          }
        })
        .catch((err) => {
          console.error("Failed to fetch teacher balance:", err);
        });

      // Fetch bank account
      api
        .get("/payments/teacher/bank-account")
        .then((response) => {
          if (response.data.bankAccount) {
            setBankAccount(response.data.bankAccount);
            setBankAccountForm({
              accountNumber: response.data.bankAccount.accountNumber || "",
              bankName: response.data.bankAccount.bankName || "",
              accountHolderName:
                response.data.bankAccount.accountHolderName || "",
              iban: response.data.bankAccount.iban || "",
              phoneNumber: response.data.bankAccount.phoneNumber || "",
            });
          }
        })
        .catch((err) => {
          console.error("Failed to fetch bank account:", err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]); // Only depend on role to avoid infinite loop

  // Payment verification
  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    const paymentId = searchParams?.get("paymentId");

    if (paymentStatus === "success" && paymentId) {
      // Use server action to verify payment and revalidate balance tag
      // This will trigger server-side re-render of the profile page
      verifyPaymentAction(paymentId)
        .then(async (verifyResponse) => {
          const paymentAmount = verifyResponse.payment?.amount || 0;

          setMessage({
            type: "success",
            text: `Ödəniş uğurlu! ${paymentAmount.toFixed(
              2
            )} AZN əlavə edildi.`,
          });

          // Refresh profile page to get updated balance from server
          // This will trigger server-side re-render with fresh data
          router.refresh();

          // After refresh, fetch fresh user data
          setTimeout(async () => {
            try {
              const updatedUserResponse = await api.get("/auth/me");
              const updatedUser = updatedUserResponse.data;
              setUser(updatedUser);
              setClientBalance(updatedUser.balance);
            } catch (err) {
              console.error("Failed to fetch updated user:", err);
            }
          }, 500);
        })
        .catch((err: any) => {
          setMessage({
            type: "error",
            text: err.message || "Ödəniş yoxlanıla bilmədi",
          });
        });
    } else if (paymentStatus === "error") {
      setMessage({
        type: "error",
        text: searchParams?.get("message") || "Ödəniş xətası",
      });
      router.replace("/profile");
    }
  }, [searchParams, router, setUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await api.put("/auth/profile", profileData);
      setUser(response.data);
      setMessage({ type: "success", text: "Məlumatlar yeniləndi" });
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
      setMessage({ type: "error", text: "Düzgün məbləğ daxil edin" });
      return;
    }

    const confirmed = await showConfirm({
      message: `${parseFloat(balanceAmount).toFixed(
        2
      )} AZN ödəniş etmək istədiyinizə əminsiniz?`,
      type: "warning",
      confirmButtonText: "Bəli, ödəniş et",
      cancelButtonText: "Ləğv et",
    });

    if (!confirmed) {
      setMessage({ type: "error", text: "Ödəniş ləğv edildi" });
      return;
    }

    setAddingBalance(true);
    setMessage(null);

    try {
      // Use server action to create payment and revalidate balance tag
      const result = await addBalanceAction(parseFloat(balanceAmount));

      if (!result.success || !result.paymentUrl) {
        throw new Error("Payment URL alına bilmədi");
      }

      // Redirect to PayRiff payment page
      window.location.href = result.paymentUrl;
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Ödəniş xətası",
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

      setMessage({ type: "success", text: "Müəllimlər yeniləndi" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setSaving(false);
    }
  };

  // ✅ HYDRATION SAFE: Balance display logic
  const getBalanceDisplay = () => {
    if (!isClient || clientBalance === null) {
      return initialUser?.balance?.toFixed(2) ?? "0.00";
    }
    return clientBalance.toFixed(2);
  };

  // Teacher withdrawal handlers
  const handleSaveBankAccount = async () => {
    if (
      !bankAccountForm.accountNumber ||
      !bankAccountForm.bankName ||
      !bankAccountForm.accountHolderName
    ) {
      setMessage({
        type: "error",
        text: "Zəhmət olmasa hesab nömrəsi, bank adı və hesab sahibinin adını daxil edin",
      });
      return;
    }

    setLoadingBankAccount(true);
    setMessage(null);

    try {
      await api.post("/payments/teacher/bank-account", bankAccountForm);
      setBankAccount(bankAccountForm);
      setShowBankAccountModal(false);
      setMessage({
        type: "success",
        text: "Bank hesabı məlumatları uğurla saxlanıldı",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setLoadingBankAccount(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      setMessage({ type: "error", text: "Düzgün məbləğ daxil edin" });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount > teacherBalance) {
      setMessage({
        type: "error",
        text: "Balansınız kifayət etmir",
      });
      return;
    }

    if (!bankAccount) {
      setMessage({
        type: "error",
        text: "Zəhmət olmasa əvvəlcə bank hesabı məlumatlarını təyin edin",
      });
      setShowBankAccountModal(true);
      return;
    }

    const confirmed = await showConfirm({
      message: `${amount.toFixed(
        2
      )} AZN məbləğində pulu bank hesabınıza köçürmək istədiyinizə əminsiniz?`,
      type: "warning",
      confirmButtonText: "Bəli, köçür",
      cancelButtonText: "Ləğv et",
    });

    if (!confirmed) {
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      const response = await api.post("/payments/teacher/withdrawals", {
        amount: amount,
        bankAccount: JSON.stringify(bankAccount),
        notes: `Müəllim çıxarışı - ${amount.toFixed(2)} AZN`,
      });

      // Update teacher balance
      const updatedBalance = teacherBalance - amount;
      setTeacherBalance(updatedBalance);

      // Update user in store
      const updatedUser = { ...currentUser, teacherBalance: updatedBalance };
      setUser(updatedUser);

      setMessage({
        type: "success",
        text: response.data.message || "Pul uğurla bank hesabınıza köçürüldü",
      });

      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Çıxarış zamanı xəta baş verdi",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Navigation
          user={currentUser || initialUser}
          showProfileLink={false}
          showDashboardLink={true}
        />

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

            {/* ✅ HYDRATION FIXED Balance Section */}
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
                    {getBalanceDisplay()} AZN
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

            {/* Teacher Balance & Withdrawal Section */}
            {currentUser?.role === "TEACHER" && (
              <>
                <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Müəllim Balansı{" "}
                    <span role="img" aria-label="Pul">
                      💰
                    </span>
                  </h2>

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
                    <div className="text-4xl font-bold text-indigo-600 mb-2">
                      {teacherBalance.toFixed(2)} AZN
                    </div>
                    <p className="text-sm text-gray-500 italic">
                      <span role="img" aria-label="İpucu">
                        💡
                      </span>{" "}
                      Bu balans imtahan ödənişlərindən qazandığınız gəlirdir.
                      Bank hesabınıza avtomatik köçürə bilərsiniz.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {!bankAccount ? (
                      <button
                        onClick={() => setShowBankAccountModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                      >
                        Bank Hesabı Təyin Et{" "}
                        <span role="img" aria-label="Bank">
                          🏦
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowWithdrawalModal(true)}
                          disabled={teacherBalance <= 0}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                          Pul Çıxart{" "}
                          <span role="img" aria-label="Çıxart">
                            💸
                          </span>
                        </button>
                        <button
                          onClick={() => setShowBankAccountModal(true)}
                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                        >
                          Bank Hesabını Dəyiş{" "}
                          <span role="img" aria-label="Redaktə">
                            ✏️
                          </span>
                        </button>
                      </>
                    )}
                    <Link
                      href="/dashboard"
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-center"
                    >
                      İdarə panelinə qayıt <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  {bankAccount && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Bank Hesabı Məlumatları
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Bank:</strong> {bankAccount.bankName}
                        </p>
                        <p>
                          <strong>Hesab Sahibi:</strong>{" "}
                          {bankAccount.accountHolderName}
                        </p>
                        <p>
                          <strong>Hesab Nömrəsi:</strong>{" "}
                          {bankAccount.accountNumber}
                        </p>
                        {bankAccount.iban && (
                          <p>
                            <strong>IBAN:</strong> {bankAccount.iban}
                          </p>
                        )}
                        {bankAccount.phoneNumber && (
                          <p>
                            <strong>Telefon:</strong> {bankAccount.phoneNumber}{" "}
                            (MPAY üçün)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
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
                  imtahanlar üçün istifadə edə bilərsiniz.
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
                    {addingBalance ? "Yüklənir..." : "Artır"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bank Account Modal */}
          {showBankAccountModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Bank Hesabı Məlumatları{" "}
                  <span role="img" aria-label="Bank">
                    🏦
                  </span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bank Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountForm.bankName}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          bankName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="Məs: Kapital Bank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hesab Sahibinin Adı{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountForm.accountHolderName}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          accountHolderName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="Məs: Kənan Rəhimli"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hesab Nömrəsi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccountForm.accountNumber}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          accountNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="Məs: 1234567890123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IBAN (İstəyə bağlı)
                    </label>
                    <input
                      type="text"
                      value={bankAccountForm.iban}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          iban: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="Məs: AZ21NABZ00000000001234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Telefon Nömrəsi (MPAY üçün)
                    </label>
                    <input
                      type="tel"
                      value={bankAccountForm.phoneNumber}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                      placeholder="Məs: +994501234567"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Bank transfer mümkün olmadıqda MPAY wallet-ə köçürmə üçün
                      telefon nömrəsi lazımdır
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowBankAccountModal(false);
                      setMessage(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleSaveBankAccount}
                    disabled={loadingBankAccount}
                    className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingBankAccount ? "Yadda saxlanılır..." : "Yadda Saxla"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Modal */}
          {showWithdrawalModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Pul Çıxart{" "}
                  <span role="img" aria-label="Çıxart">
                    💸
                  </span>
                </h3>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Mövcud balans:{" "}
                    <span className="font-bold text-indigo-600">
                      {teacherBalance.toFixed(2)} AZN
                    </span>
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Çıxarılacaq Məbləğ (AZN)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={teacherBalance}
                    step="0.01"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 shadow-sm"
                    placeholder="Məs: 50.00"
                  />
                </div>

                {bankAccount && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Bank Hesabı:
                    </p>
                    <p className="text-sm text-gray-600">
                      {bankAccount.bankName} - {bankAccount.accountNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {bankAccount.accountHolderName}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-6">
                  💡 Pul avtomatik şəkildə bank hesabınıza köçürüləcək. Əgər
                  bank transfer mümkün deyilsə, MPAY wallet-ə köçürüləcək.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setWithdrawalAmount("");
                      setMessage(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={
                      withdrawing ||
                      !withdrawalAmount ||
                      parseFloat(withdrawalAmount) <= 0 ||
                      parseFloat(withdrawalAmount) > teacherBalance
                    }
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? "Köçürülür..." : "Köçür"}
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
