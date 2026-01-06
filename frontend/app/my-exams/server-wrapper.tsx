import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import MyExamsClient from "./my-exams-client";

interface ExamAttemptWithExam {
  id: string;
  examId: string;
  status: string;
  score?: number;
  totalScore?: number;
  submittedAt?: string;
  exam?: {
    id: string;
    title: string;
    subject: string;
    level: string;
    duration: number;
    teacher?: {
      firstName: string;
      lastName: string;
    };
  };
}

export default async function MyExamsServerWrapper() {
  try {
    await requireRole("STUDENT");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    // Fetch attempts server-side
    const attempts = await fetchServerAPI<ExamAttemptWithExam[]>(
      "/exam-attempts/my-attempts"
    ).catch(() => []);

    return <MyExamsClient initialAttempts={attempts} initialUser={user} />;
  } catch (error) {
    redirect("/login");
  }
}
