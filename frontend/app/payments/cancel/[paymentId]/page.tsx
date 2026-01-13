import { getServerUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import Link from "next/link";

interface PaymentCancelServerProps {
  params: {
    paymentId: string;
  };
}

export default async function PaymentCancelPage({
  params,
}: PaymentCancelServerProps) {
  // Check authentication
  const user = await getServerUser({ tags: ["balance"] });
  if (!user) {
    redirect("/login");
  }

  // Revalidate balance tag to refresh profile data
  revalidateTag("balance");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-200 text-center">
        <div className="text-yellow-500 text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Ödəniş Ləğv Edildi
        </h1>
        <p className="text-gray-600 mb-6">
          Ödəniş ləğv edildi və ya uğursuz oldu. Zəhmət olmasa yenidən cəhd
          edin.
        </p>
        {params.paymentId && (
          <div className="mb-6 text-left inline-block bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Ödəniş ID:</strong> {params.paymentId}
            </p>
          </div>
        )}
        <div className="space-y-3">
          <Link
            href="/profile"
            className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Profilə Qayıt
          </Link>
          <Link
            href="/dashboard"
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    </div>
  );
}
