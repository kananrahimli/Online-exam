import { getServerUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { use } from "react";

export default async function DashboardServerWrapper() {
  try {
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    return <DashboardClient initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}
