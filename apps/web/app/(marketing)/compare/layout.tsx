import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Xenboox vs QuickBooks vs Xero | AI Accounting",
  description:
    "See how Xenboox compares to QuickBooks and Xero. AI-native automation with 19 specialized agents vs traditional manual accounting software.",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
