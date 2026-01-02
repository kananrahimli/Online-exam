import TeacherMyExamsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İmtahanlarım",
  description:
    "Yaratdığınız imtahanları idarə edin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TeacherMyExamsPage() {
  return <TeacherMyExamsServerWrapper />;
}

/* Client component moved to teacher-my-exams-client.tsx */
