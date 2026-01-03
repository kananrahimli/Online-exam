import ExamResultServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

interface ExamResultPageProps {
  params: Promise<{
    attemptId: string;
  }>;
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

export default async function ExamResultPage({ params }: ExamResultPageProps) {
  const resolvedParams = await params;
  return <ExamResultServerWrapper params={resolvedParams} />;
}

/* Client component moved to exam-result-client.tsx */
