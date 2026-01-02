import MyExamsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İmtahanlarım",
  description:
    "Verdiyiniz imtahanları görüntüləyin - Online İmtahan Platforması",
  robots: {
    index: true,
    follow: true,
  },
};

export default function MyExamsPage() {
  return <MyExamsServerWrapper />;
}
