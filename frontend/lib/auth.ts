import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const userStr = cookieStore.get("user")?.value;

  if (!token) {
    return null;
  }

  try {
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token, user: null };
  }
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.token) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: "STUDENT" | "TEACHER" | "ADMIN") {
  const session = await requireAuth();
  if (session.user?.role !== role) {
    redirect("/dashboard");
  }
  return session;
}
