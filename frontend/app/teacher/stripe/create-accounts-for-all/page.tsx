import { Metadata } from "next";
import CreateStripeAccountsServerWrapper from "./server-wrapper";

export const metadata: Metadata = {
  title: "Stripe Account-ları Yarat - Admin Panel",
  description: "Bütün müəllim və admin-lər üçün Stripe account yaradın",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateStripeAccountsPage() {
  return <CreateStripeAccountsServerWrapper />;
}


