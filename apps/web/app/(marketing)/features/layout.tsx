import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Books That Run Themselves | Xenboox",
  description:
    "Invoicing, payroll, compliance, close, forecasting, and reporting — handled by Xenboox with evidence attached and human approval where it matters.",
  openGraph: {
    title: "Xenboox Features",
    description:
      "Everything a finance team does: invoicing, payroll, compliance, close, forecasting, reporting. You approve what matters.",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
