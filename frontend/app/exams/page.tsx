import ExamsServerWrapper from "./server-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mövcud İmtahanlar",
  description:
    "İzlədiyiniz müəllimlərin yaratdığı imtahanları görüntüləyin və imtahan verin.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ExamsPage() {
  return <ExamsServerWrapper />;
}