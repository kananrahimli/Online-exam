import AnalyticsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistika",
  description: "İmtahan statistikalarını görüntüləyin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AnalyticsPage() {
  return <AnalyticsServerWrapper />;
}

/* Client component moved to analytics-client.tsx */