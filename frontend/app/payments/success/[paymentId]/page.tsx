'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;
  const [verifying, setVerifying] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentId) {
        setError('Payment ID tapılmadı');
        setVerifying(false);
        return;
      }

      try {
        // Verify payment status from backend
        const response = await api.post(`/payments/verify/${paymentId}`);
        setPayment(response.data);
        setVerifying(false);

        // Redirect to appropriate page after 3 seconds
        setTimeout(() => {
          if (response.data.attemptId) {
            // Exam payment - redirect to exam
            router.push(`/exams/${response.data.examId}/take?attemptId=${response.data.attemptId}`);
          } else {
            // Balance payment - redirect to profile
            router.push('/profile?payment=success');
          }
        }, 3000);
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.response?.data?.message || 'Ödəniş yoxlanıla bilmədi');
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentId, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ödəniş yoxlanılır...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Xəta</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/profile"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Profilə qayıt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Ödəniş Uğurlu!
        </h1>
        <p className="text-gray-600 mb-6">
          {payment?.message || 'Ödənişiniz uğurla tamamlandı.'}
        </p>
        {payment?.attemptId && (
          <p className="text-sm text-gray-500 mb-6">
            İmtahana yönləndirilirsiniz...
          </p>
        )}
        <div className="space-y-3">
          {payment?.attemptId ? (
            <Link
              href={`/exams/${payment.examId}/take?attemptId=${payment.attemptId}`}
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              İmtahana başla
            </Link>
          ) : (
            <Link
              href="/profile"
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Profilə qayıt
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

