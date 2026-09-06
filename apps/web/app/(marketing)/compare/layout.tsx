import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare — Xenboox vs QuickBooks vs Xero",
  description:
    "How Xenboox compares to QuickBooks and Xero: books that run themselves, approvals with evidence, multi-currency and mobile money from day one.",
  openGraph: {
    title: "Xenboox vs QuickBooks vs Xero",
    description:
      "Feature-by-feature comparison: automation, approvals, multi-currency, pricing. See why teams switch.",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
