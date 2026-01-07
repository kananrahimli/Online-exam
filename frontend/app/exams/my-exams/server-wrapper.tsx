import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireAuth, requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeacherMyExamsClient from "./teacher-my-exams-client";
import { Exam } from "@/lib/types";

export default async function TeacherMyExamsServerWrapper() {
  try {
    const session = await requireAuth();
    await requireRole("TEACHER");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    // Fetch exams server-side (no status filter for initial load)
    const exams = await fetchServerAPI<Exam[]>("/exams/my-exams", {
      next: { tags: ["exams"] },
    }).catch(() => []);

    return <TeacherMyExamsClient initialExams={exams} initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}
