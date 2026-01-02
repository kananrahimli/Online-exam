import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İmtahan Ver",
  description: "İmtahana daxil olun və sualları cavablandırın - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TakeExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
