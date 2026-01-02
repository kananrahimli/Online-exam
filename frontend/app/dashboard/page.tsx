import DashboardServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İdarə Paneli",
  description: "İdarə panelinizə xoş gəlmisiniz - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DashboardPage() {
  return <DashboardServerWrapper />;
}
