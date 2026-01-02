import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İmtahanı Redaktə Et",
  description: "İmtahan məlumatlarını yeniləyin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function EditExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
