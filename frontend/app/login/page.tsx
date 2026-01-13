"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from "@/lib/constants/messages";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email(ERROR_MESSAGES.INVALID_EMAIL),
  password: z.string().min(6, ERROR_MESSAGES.PASSWORD_MIN_LENGTH),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data);
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
      router.push(ROUTES.DASHBOARD);
    } catch (err: any) {
      setError(err.response?.data?.message || ERROR_MESSAGES.GENERIC);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
              <Image
                src="/download.png"
                alt="Online İmtahan Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Xoş gəlmisiniz
            </h2>
            <p className="text-gray-600">Hesabınıza daxil olun</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
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
                  autoComplete="email"
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
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Şifrə
                </label>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

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
                "Daxil ol"
              )}
            </button>

            <div className="text-center flex flex-col gap-2">
              <Link
                href={ROUTES.REGISTER}
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Hesabınız yoxdur? Qeydiyyatdan keçin
              </Link>
              <Link
                href={ROUTES.FORGOT_PASSWORD}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Şifrəni unutmusunuz?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
