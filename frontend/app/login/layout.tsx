import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daxil ol",
  description: "Hesabınıza daxil olun - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
