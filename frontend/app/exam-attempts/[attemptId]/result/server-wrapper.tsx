import { getServerUser, fetchServerAPI } from "@/lib/server-api";
import { requireAuth, requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExamResultClient from "./exam-result-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ExamResultServerWrapperProps {
  params: {
    attemptId: string;
  };
}

export default async function ExamResultServerWrapper({
  params,
}: ExamResultServerWrapperProps) {
  try {
    const session = await requireAuth();
    await requireRole("STUDENT");
    const user = await getServerUser();

    if (!user) {
      redirect("/login");
    }

    const attemptId = params.attemptId;

    // Fetch result and user balance server-side
    const [resultResponse, balanceResponse] = await Promise.all([
      fetchServerAPI<any>(`/exam-attempts/${attemptId}/result`).catch(
        () => null
      ),
      fetchServerAPI<{ balance: number }>("/auth/balance").catch(() => ({
        balance: 0,
      })),
    ]);

    if (!resultResponse) {
      redirect("/my-exams");
    }

    const userBalance = balanceResponse?.balance || 0;

    // Fetch leaderboard if exam exists
    let leaderboard = null;
    if (resultResponse?.exam?.id) {
      try {
        leaderboard = await fetchServerAPI(
          `/exams/${resultResponse.exam.id}/leaderboard`
        );
      } catch (err) {
        // Leaderboard is optional, silently fail
      }
    }

    return (
      <ExamResultClient
        initialResult={resultResponse}
        initialLeaderboard={leaderboard}
        initialBalance={userBalance}
        initialUser={user}
        attemptId={attemptId}
      />
    );
  } catch (error) {
    redirect("/login");
  }
}
