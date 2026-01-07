import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExamDetailsClient from "./exam-details-client";
import { Exam } from "@/lib/types";

interface ExamDetailsServerWrapperProps {
  params: {
    id: string;
  };
}

export default async function ExamDetailsServerWrapper({
  params,
}: ExamDetailsServerWrapperProps) {
  try {
    await requireRole("STUDENT");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    const examId = params.id;

    // Fetch exam and balance server-side
    const [examResponse, balanceResponse] = await Promise.all([
      fetchServerAPI<Exam>(`/exams/${examId}`).catch(() => null),
      fetchServerAPI<{ balance: number }>("/auth/balance", {
        cache: "no-store",
      }).catch(() => ({
        balance: 0,
      })),
    ]);

    if (!examResponse) {
      redirect("/exams");
    }

    const userBalance = balanceResponse?.balance || 0;

    return (
      <ExamDetailsClient
        initialExam={examResponse}
        initialBalance={userBalance}
        initialUser={user}
        examId={examId}
      />
    );
  } catch (error) {
    redirect("/login");
  }
}
