import { Metadata } from "next";
import PendingWithdrawalsServerWrapper from "./server-wrapper";

export const metadata: Metadata = {
  title: "Gözləyən Çıxarışlar - Admin Panel",
  description: "Müəllimlərin çıxarış sorğularını idarə edin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PendingWithdrawalsPage() {
  return <PendingWithdrawalsServerWrapper />;
}


