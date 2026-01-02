import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Şifrəni Unutmusunuz?",
  description: "Şifrənizi bərpa edin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
