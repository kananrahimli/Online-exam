import ExamDetailsServerWrapper from "./server-wrapper";

interface ExamDetailsPageProps {
  params: {
    id: string;
  };
}

export default function ExamDetailsPage({ params }: ExamDetailsPageProps) {
  return <ExamDetailsServerWrapper params={params} />;
}

/* Client component moved to exam-details-client.tsx */
