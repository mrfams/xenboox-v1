import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox vs QuickBooks — Built Beyond the US",
  description:
    "QuickBooks vs Xenboox: close automation, approvals with evidence, multi-currency, mobile money, and multi-jurisdiction tax. Feature-by-feature comparison.",
  openGraph: {
    title: "Xenboox vs QuickBooks",
    description:
      "Close automation, approvals with evidence, multi-currency and mobile money. Compare feature by feature.",
  },
};

export default function CompareQuickbooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
