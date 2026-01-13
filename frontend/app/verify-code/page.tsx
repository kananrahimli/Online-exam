"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import Link from "next/link";
import { formatTimeMMSS } from "@/lib/utils";
import { API_ENDPOINTS, ROUTES } from "@/lib/constants/routes";
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from "@/lib/constants/messages";

const verifyCodeSchema = z.object({
  code: z
    .string()
    .min(6, VALIDATION_MESSAGES.CODE_LENGTH)
    .max(6, VALIDATION_MESSAGES.CODE_LENGTH)
    .regex(/^\d+$/, ERROR_MESSAGES.CODE_NUMERIC),
});

type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 dəqiqə = 120 saniyə
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
  });

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft]);

  const sendVerificationCode = async () => {
    if (!email) {
      setError(ERROR_MESSAGES.NOT_FOUND);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.trim(),
      });
      setTimeLeft(120); // Reset timer to 2 minutes
      setCanResend(false);
    } catch (err: any) {
      setError(err.response?.data?.message || ERROR_MESSAGES.GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: VerifyCodeFormData) => {
    if (!email) {
      setError(ERROR_MESSAGES.NOT_FOUND);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_CODE, {
        email: email.trim(),
        code: data.code,
      });

      // Redirect to reset password page with token
      router.push(
        `${ROUTES.RESET_PASSWORD}?token=${
          response.data.resetToken
        }&email=${encodeURIComponent(email)}`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || ERROR_MESSAGES.GENERIC);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Email tapılmadı
              </h2>
              <p className="text-gray-600 mb-6">
                Verifikasiya səhifəsinə düzgün yönləndirilməmisiniz.
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4">
              <span className="text-white text-2xl font-bold">✉️</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Kod Təsdiqi
            </h2>
            <p className="text-gray-600">
              Email ünvanınıza göndərilən verifikasiya kodunu daxil edin
            </p>
            <p className="text-sm text-gray-500 mt-2">{email}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="code"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Verifikasiya kodu *
                </label>
                {!canResend && timeLeft > 0 && (
                  <span className="text-sm text-gray-500">
                    Yenidən göndər: {formatTimeMMSS(timeLeft)}
                  </span>
                )}
                {canResend && (
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={loading}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                  >
                    Kodu yenidən göndər
                  </button>
                )}
              </div>
              <input
                {...register("code")}
                type="text"
                id="code"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900 text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.code.message}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Verifikasiya kodu email ünvanınıza göndərildi. Kodun müddəti 2
                dəqiqədir.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? "Yoxlanılır..." : "Kodu Təsdiq Et"}
            </button>

            <div className="text-center space-y-2">
              <Link
                href={ROUTES.FORGOT_PASSWORD}
                className="block text-sm text-indigo-600 hover:text-indigo-800"
              >
                Geri
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="block text-sm text-gray-600 hover:text-gray-800"
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

export default function VerifyCodePage() {
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
      <VerifyCodeContent />
    </Suspense>
  );
}
