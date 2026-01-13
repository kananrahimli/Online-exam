"use server";

import { revalidateTag } from "next/cache";
import { fetchServerAPI } from "../server-api";

export async function addBalanceAction(amount: number) {
  const result = (await fetchServerAPI("/payments/add-balance", {
    method: "POST",
    cache: "no-store",
    body: JSON.stringify({ amount }),
  })) as any;

  // Revalidate balance tag to refresh profile data
  revalidateTag("balance");

  return {
    success: true,
    paymentId: result.paymentId,
    amount: result.amount,
    paymentUrl: result.paymentUrl,
    orderId: result.orderId,
    message: result.message,
  };
}

export async function verifyPaymentAction(paymentId: string) {
  const result = (await fetchServerAPI(`/payments/verify/${paymentId}`, {
    method: "POST",
    cache: "no-store",
  })) as any;

  // Revalidate balance tag to refresh profile data after payment verification
  revalidateTag("balance");

  return {
    success: true,
    payment: result.payment,
    message: result.message,
    attemptId: result.attemptId,
  };
}
