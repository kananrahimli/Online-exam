"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import Link from "next/link";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";
import { ERROR_MESSAGES } from "@/lib/constants/messages";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, ERROR_MESSAGES.PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Şifrələr uyğun gəlmir",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!email) {
      setError(ERROR_MESSAGES.NOT_FOUND);
      return;
    }

    if (!token) {
      setError("Token tapılmadı. Zəhmət olmasa yenidən kod tələb edin.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: email.trim(),
        newPassword: data.newPassword,
        resetToken: token,
      });

      setSuccess("Şifrə uğurla dəyişdirildi! Giriş səhifəsinə yönləndirilirsiniz...");
      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || ERROR_MESSAGES.GENERIC
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Xəta
              </h2>
              <p className="text-gray-600 mb-6">
                Şifrə bərpa səhifəsinə düzgün yönləndirilməmisiniz.
              </p>
              <Link
                href={ROUTES.FORGOT_PASSWORD}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Şifrə bərpası səhifəsinə qayıt
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">🔒</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Şifrə Bərpası
            </h2>
            <p className="text-gray-600">
              Yeni şifrənizi təyin edin
            </p>
            <p className="text-sm text-gray-500 mt-2">{email}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{success}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Yeni şifrə *
              </label>
              <input
                {...register("newPassword")}
                type="password"
                id="newPassword"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="Minimum 6 simvol"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Şifrəni təsdiq et *
              </label>
              <input
                {...register("confirmPassword")}
                type="password"
                id="confirmPassword"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900"
                placeholder="Şifrəni təkrar daxil edin"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? "Yenilənir..." : "Şifrəni Dəyişdir"}
            </button>

            <div className="text-center">
              <Link
                href={ROUTES.LOGIN}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Giriş səhifəsinə qayıt
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yüklənir...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

