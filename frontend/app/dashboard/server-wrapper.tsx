import { getServerUser } from "@/lib/server-api";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

// Force server-side rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardServerWrapper() {
  try {
    const session = await requireAuth();
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    return <DashboardClient initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}
