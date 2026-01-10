import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import PaymentSuccessClient from "./page-client";

interface PaymentSuccessServerProps {
  params: {
    paymentId: string;
  };
}

export default async function PaymentSuccessPage({
  params,
}: PaymentSuccessServerProps) {
  try {
    // Check authentication
    const user = await getServerUser({ tags: ["balance"] });
    if (!user) {
      redirect("/login");
    }

    // Verify payment server-side
    let paymentData: any = null;
    let error: string | null = null;

    try {
      paymentData = await fetchServerAPI<any>(
        `/payments/verify/${params.paymentId}`,
        {
          method: "POST",
          cache: "no-store",
          next: { tags: ["balance"] },
        }
      );
    } catch (err: any) {
      error = err.message || "Ödəniş yoxlanıla bilmədi";
    }

    // Revalidate balance tag to refresh profile data
    revalidateTag("balance");

    // If payment has attemptId, redirect to exam
    if (paymentData?.attemptId && paymentData?.payment?.examId) {
      redirect(
        `/exams/${paymentData.payment.examId}/take?attemptId=${paymentData.attemptId}`
      );
    }

    return (
      <PaymentSuccessClient
        paymentId={params.paymentId}
        initialPayment={paymentData?.payment || null}
        initialError={error}
        initialMessage={paymentData?.message || null}
        attemptId={paymentData?.attemptId || null}
        examId={paymentData?.payment?.examId || null}
      />
    );
  } catch (error) {
    redirect("/profile");
  }
}
