import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qeydiyyat",
  description:
    "Yeni hesab yaradın - Online İmtahan Platforması. Pulsuz qeydiyyatdan keçin və imtahanlara qoşulun.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Qeydiyyat - Online İmtahan Platforması",
    description:
      "Yeni hesab yaradın və AI dəstəklı online imtahan sistemindən istifadə edin.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
