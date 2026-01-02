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

export default function ResultsPage() {
  return <ResultsServerWrapper />;
}
