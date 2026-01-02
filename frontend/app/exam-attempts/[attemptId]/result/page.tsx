import ExamResultServerWrapper from "./server-wrapper";

interface ExamResultPageProps {
  params: {
    attemptId: string;
  };
}

export default function ExamResultPage({ params }: ExamResultPageProps) {
  return <ExamResultServerWrapper params={params} />;
}

/* Client component moved to exam-result-client.tsx */
