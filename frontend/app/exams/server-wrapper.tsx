import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireAuth, requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExamsClient from "./exams-client";
import { Exam } from "@/lib/types";

// Force server-side rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default async function ExamsServerWrapper() {
  try {
    const session = await requireAuth();
    await requireRole("STUDENT");
    
    // Fetch user
    const user = await getServerUser();
    if (!user) {
      redirect("/login");
    }

    // Fetch data server-side
    const [examsResponse, teachersResponse] = await Promise.all([
      fetchServerAPI<Exam[]>("/exams/published"),
      fetchServerAPI<{ allTeachers: Teacher[]; myTeachers: Teacher[] }>("/teacher-student/teachers").catch(() => ({ myTeachers: [], allTeachers: [] })),
    ]);

    let exams = examsResponse || [];
    
    // Handle teachers response structure
    let teachers: Teacher[] = [];
    if (teachersResponse && teachersResponse.myTeachers) {
      teachers = teachersResponse.myTeachers || [];
    }

    return <ExamsClient initialExams={exams} initialTeachers={teachers} initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}
