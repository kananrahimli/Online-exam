"use server";

import { revalidateTag } from "next/cache";

export async function revalidateBalanceAction() {
  revalidateTag("balance");
  return { success: true };
}
