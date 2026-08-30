import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — AI-Native Accounting Platform | Xenboox",
  description:
    "19 AI agents handle invoicing, payroll, reconciliation, and month-end close. Multi-currency, multi-entity, bank-grade security. See what Xenboox can do.",
  openGraph: {
    title: "Features — AI-Native Accounting Platform | Xenboox",
    description:
      "19 AI agents handle invoicing, payroll, reconciliation, and month-end close. Multi-currency, multi-entity, bank-grade security.",
    url: "https://xenboox.com/features",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
