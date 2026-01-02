import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yeni İmtahan Yaradın",
  description: "Manual olaraq imtahan yaradın - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function CreateExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
