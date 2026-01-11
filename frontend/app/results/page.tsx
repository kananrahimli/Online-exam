import ResultsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nəticələr",
  description:
    "İmtahan nəticələrinizi görüntüləyin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

// Enable ISR for results page - revalidate every 60 seconds (1 minute)
export const revalidate = 60;

export default function ResultsPage() {
  return <ResultsServerWrapper />;
}
