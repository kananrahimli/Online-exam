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

  // Current user state (may be updated)
  const currentUser = user || initialUser;

  useEffect(() => {
    // Sync initial user to store
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser, setUser]);

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

      const confirmed = await showConfirm({
        message: `${parseFloat(balanceAmount).toFixed(
          2
        )} AZN məbləğində ödəniş etmək istədiyinizə əminsiniz?`,
        type: "warning",
        confirmButtonText: "Bəli, ödəniş et",
        cancelButtonText: "Ləğv et",
        onConfirm: () => {},
      });

      if (!confirmed) {
        setMessage({
          type: "error",
          text: "Ödəniş ləğv edildi",
        });
        return;
      }

      const verifyResponse = await api.post(
        `/payments/verify/${response.data.paymentId}`
      );

      if (verifyResponse.data && verifyResponse.data.message) {
        const updatedUser = await api.get("/auth/me");
        setUser(updatedUser.data);

        setShowAddBalanceModal(false);
        setBalanceAmount("");

        setMessage({
          type: "success",
          text: `Ödəniş uğurlu oldu! ${parseFloat(balanceAmount).toFixed(
            2
          )} AZN balansınıza əlavə edildi.`,
        });

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
                    {(currentUser?.balance || 0).toFixed(2)} AZN
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
