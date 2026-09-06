import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Books That Run Themselves | Xenboox",
  description:
    "Invoicing, payroll, reconciliation, and month-end close — handled, with evidence attached and human approval where it matters. Multi-currency, multi-entity, bank-grade security.",
  openGraph: {
    title: "Features — Books That Run Themselves | Xenboox",
    description:
      "Invoicing, payroll, reconciliation, and month-end close — handled. Multi-currency, multi-entity, bank-grade security.",
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
