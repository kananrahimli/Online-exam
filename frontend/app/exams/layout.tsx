import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mövcud İmtahanlar",
  description:
    "İzlədiyiniz müəllimlərin yaratdığı imtahanları görüntüləyin və imtahan verin.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ExamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
