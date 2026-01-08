import { getServerUser, requireRole } from "@/lib/server-api";
import { redirect } from "next/navigation";
import PendingWithdrawalsClient from "./pending-withdrawals-client";

export default async function PendingWithdrawalsServerWrapper() {
  try {
    await requireRole("ADMIN");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    return <PendingWithdrawalsClient initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}


