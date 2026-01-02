"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";
import Link from "next/link";
import TeacherMultiSelect from "@/components/TeacherMultiSelect";
import { UserRole } from "@/lib/types";
import { useAlert } from "@/hooks/useAlert";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, initialize, setUser } = useAuthStore();
  const { showConfirm, AlertComponent } = useAlert();
  const [myTeachers, setMyTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [addingBalance, setAddingBalance] = useState(false);

  const fetchMyTeachers = async () => {
    try {
      const response = await api.get("/teacher-student/my-teachers");
      const teachers = response.data;
      setMyTeachers(teachers);
      setSelectedTeachers(teachers.map((t: Teacher) => t.id));
    } catch (err) {
      console.error("Error fetching teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

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
      // Create payment for balance addition
      const response = await api.post("/payments/add-balance", {
        amount: parseFloat(balanceAmount),
      });

      // Show confirmation dialog
      const confirmed = await showConfirm({
        message: `${parseFloat(balanceAmount).toFixed(
          2
        )} AZN məbləğində ödəniş etmək istədiyinizə əminsiniz?`,
        type: "warning",
        confirmButtonText: "Bəli, ödəniş et",
        cancelButtonText: "Ləğv et",
        onConfirm: () => {}, // Empty callback, we handle it with the returned value
      });

      if (!confirmed) {
        setMessage({
          type: "error",
          text: "Ödəniş ləğv edildi",
        });
        return;
      }

      // Verify payment (this will process the payment and add to balance)
      const verifyResponse = await api.post(
        `/payments/verify/${response.data.paymentId}`
      );

      if (verifyResponse.data && verifyResponse.data.message) {
        // Update user balance from server
        const updatedUser = await api.get("/auth/me");
        setUser(updatedUser.data);

        // Close modal first
        setShowAddBalanceModal(false);
        setBalanceAmount("");

        // Show success message
        setMessage({
          type: "success",
          text: `Ödəniş uğurlu oldu! ${parseFloat(balanceAmount).toFixed(
            2
          )} AZN balansınıza əlavə edildi.`,
        });

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard?balanceAdded=true");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Ödəniş zamanı xəta baş verdi",
      });
    } finally {
      setAddingBalance(false);
    }
  };

  const handleSaveTeachers = async () => {
    if (!user || user.role !== "STUDENT") return;

    setSaving(true);
    setMessage(null);

    try {
      if (user?.role === "STUDENT") {
        // Get current teacher IDs
        const currentTeacherIds = myTeachers.map((t) => t.id);

        // Find teachers to add
        const toAdd = selectedTeachers.filter(
          (id) => !currentTeacherIds.includes(id)
        );

        // Find teachers to remove
        const toRemove = currentTeacherIds.filter(
          (id) => !selectedTeachers.includes(id)
        );

        // Add new teachers
        for (const teacherId of toAdd) {
          await api.post(`/teacher-student/${teacherId}/follow`);
        }

        // Remove teachers
        for (const teacherId of toRemove) {
          await api.delete(`/teacher-student/${teacherId}/unfollow`);
        }

        setMessage({
          type: "success",
          text: "Müəllimləriniz uğurla yeniləndi",
        });
        fetchMyTeachers();
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Xəta baş verdi",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    initialize();
    if (!token) {
      router.push("/login");
      return;
    }

    // Refresh user data to get updated balance (prizes may have been awarded)
    const refreshUser = async () => {
      try {
        const userResponse = await api.get("/auth/me");
        const updatedUser = userResponse.data;
        setUser(updatedUser);
        setProfileData({
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          email: updatedUser.email || "",
          phone: updatedUser.phone || "",
        });

        // After refreshing user, check role and fetch teachers if needed
        if (updatedUser?.role === "STUDENT") {
          fetchMyTeachers();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error refreshing user data:", err);
        if (user) {
          setProfileData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
          });
        }
        setLoading(false);
      }
    };

    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router, initialize, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertComponent />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Modern Navigation */}
        <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-3">
                <Link href="/dashboard" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                    <span className="text-white font-bold text-lg">📝</span>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Online İmtahan
                  </h1>
                </Link>
              </div>
              <div className="flex items-center space-x-6">
                {user && (
                  <div className="text-right">
                    <p className="text-gray-900 font-semibold">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {user.role === UserRole.STUDENT ? "Şagird" : "Müəllim"}
                    </p>
                  </div>
                )}
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  İdarə paneli
                </Link>
                <button
                  onClick={() => {
                    useAuthStore.getState().logout();
                    router.push("/login");
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
                    Redaktə et ✏️
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setProfileData({
                          firstName: user?.firstName || "",
                          lastName: user?.lastName || "",
                          email: user?.email || "",
                          phone: user?.phone || "",
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
                      {user?.firstName}
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
                      {user?.lastName}
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
                      {user?.email}
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
                    <div>
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
                    </div>
                  ) : (
                    <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                      {user?.phone || (
                        <span className="text-gray-400 italic">
                          Nömrə əlavə edilməyib
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Section - Only for Students */}
            {user?.role === "STUDENT" && (
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Balans 💰
                </h2>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">
                    {(user?.balance || 0).toFixed(2)} AZN
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    💡 Balans yalnız imtahanlar üçün istifadə oluna bilər
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBalanceModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Balansı Artır ➕
                </button>
              </div>
            )}

            {/* My Teachers Section - Only for Students */}
            {user?.role === "STUDENT" && (
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
            {user?.role === "TEACHER" && (
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
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  İdarə panelinə qayıt →
                </Link>
              </div>
            )}
          </div>

          {/* Add Balance Modal */}
          {showAddBalanceModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Balans Artır 💰
                </h3>

                {/* Error message inside modal */}
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
                      // Clear error message when user types
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
        </main>
      </div>
    </>
  );
}
