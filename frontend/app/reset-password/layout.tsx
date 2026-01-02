import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yeni Şifrə Təyin Et",
  description: "Yeni şifrənizi təyin edin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
