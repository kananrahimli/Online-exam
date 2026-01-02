import ProfileServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Şəxsi Məlumatlar",
  description: "Şəxsi məlumatlarınızı idarə edin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProfilePage() {
  return <ProfileServerWrapper />;
}
