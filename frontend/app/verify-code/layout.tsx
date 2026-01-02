import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kod Təsdiqlə",
  description: "Şifrə bərpası üçün təsdiq kodunu daxil edin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function VerifyCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
