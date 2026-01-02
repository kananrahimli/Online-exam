import ExamDetailsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

interface ExamDetailsPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "İmtahan Detalları",
  description: "İmtahan haqqında ətraflı məlumat və imtahana başlama",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ExamDetailsPage({ params }: ExamDetailsPageProps) {
  return <ExamDetailsServerWrapper params={params} />;
}

/* Client component moved to exam-details-client.tsx */
