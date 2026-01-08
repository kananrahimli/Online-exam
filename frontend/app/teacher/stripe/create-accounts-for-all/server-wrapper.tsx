import { getServerUser, requireRole } from "@/lib/server-api";
import { redirect } from "next/navigation";
import CreateStripeAccountsClient from "./create-stripe-accounts-client";

export default async function CreateStripeAccountsServerWrapper() {
  try {
    await requireRole("ADMIN");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    return <CreateStripeAccountsClient initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}


