"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/lib/types";
import TeacherMultiSelect from "@/components/TeacherMultiSelect";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from "@/lib/constants/messages";

const registerSchema = z.object({
  email: z.string().email(ERROR_MESSAGES.INVALID_EMAIL),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      ERROR_MESSAGES.INVALID_PHONE
    )
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, ERROR_MESSAGES.PASSWORD_MIN_LENGTH),
  firstName: z.string().min(2, ERROR_MESSAGES.NAME_MIN_LENGTH),
  lastName: z.string().min(2, ERROR_MESSAGES.NAME_MIN_LENGTH),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  teacherIds: z.array(z.string()).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: UserRole.STUDENT,
      teacherIds: [],
    },
  });

  const role = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setError("");
    setLoading(true);

    try {
      const registerData = {
        ...data,
        phone:
          data.phone && data.phone.trim() !== ""
            ? data.phone.trim()
            : undefined,
        teacherIds:
          data.role === UserRole.STUDENT ? selectedTeachers : undefined,
      };
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, registerData);
      setToken(response.data.token);
      setUser(response.data.user);
      // Save to localStorage and cookies
      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        // Also save to cookies for server-side access
        document.cookie = `token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `user=${encodeURIComponent(
          JSON.stringify(response.data.user)
        )}; path=/; max-age=86400; SameSite=Lax`;
      }

      // ✅ Əgər müəllim və ya admin üçün Stripe onboarding linki varsa, oraya yönləndir
      if (response.data.stripeOnboardingUrl) {
        window.location.href = response.data.stripeOnboardingUrl;
        return; // Yönləndirmə edilir, aşağıdakı router.push işləməsin
      }

      router.push(ROUTES.DASHBOARD);
    } catch (err: any) {
      setError(
        err.response?.data?.message || ERROR_MESSAGES.GENERIC
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">O</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Yeni hesab yaradın
            </h2>
            <p className="text-gray-600">Platformaya qoşulun</p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Ad
                </label>
                <input
                  {...register("firstName")}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Adınız"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Soyad
                </label>
                <input
                  {...register("lastName")}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="Soyadınız"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Email ünvanı
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Telefon nömrəsi (istəyə bağlı)
              </label>
              <input
                {...register("phone")}
                type="tel"
                id="phone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="+994501234567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Şifrə
              </label>
              <input
                {...register("password")}
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Rol
              </label>
              <select
                {...register("role")}
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 appearance-none bg-no-repeat bg-right pr-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "right 12px center",
                }}
              >
                <option value={UserRole.STUDENT}>Şagird</option>
                <option value={UserRole.TEACHER}>Müəllim</option>
              </select>
            </div>

            {role === UserRole.STUDENT && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Müəllimləriniz (istəyə bağlı)
                </label>
                <TeacherMultiSelect
                  selectedTeachers={selectedTeachers}
                  onChange={setSelectedTeachers}
                  placeholder="Müəllimləri seçin..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Qeydiyyat zamanı müəllimlərinizi seçə bilərsiniz. Sonradan
                  profil səhifəsindən də dəyişdirə bilərsiniz.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
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
                  Yüklənir...
                </span>
              ) : (
                "Qeydiyyatdan keç"
              )}
            </button>

            <div className="text-center">
              <a
                href={ROUTES.LOGIN}
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Artıq hesabınız var? Daxil olun
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
