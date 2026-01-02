import ExamResultServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

interface ExamResultPageProps {
  params: {
    attemptId: string;
  };
}

export const metadata: Metadata = {
  title: "İmtahan Nəticəsi",
  description:
    "İmtahan nəticələrinizi və liderlər cədvəlini görüntüləyin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ExamResultPage({ params }: ExamResultPageProps) {
  return <ExamResultServerWrapper params={params} />;
}

/* Client component moved to exam-result-client.tsx */
