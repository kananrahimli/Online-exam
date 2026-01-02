import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI ilə İmtahan Yaradın",
  description: "3 klikdə AI dəstəyi ilə imtahan hazırlayın - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AIGenerateExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
