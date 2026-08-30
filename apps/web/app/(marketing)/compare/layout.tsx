import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Xenboox vs QuickBooks vs Xero | AI Accounting",
  description:
    "See how Xenboox compares to QuickBooks, Xero, Wave, and FreshBooks. AI-native automation with 19 specialized agents vs traditional manual accounting software.",
  openGraph: {
    title: "Compare Xenboox vs QuickBooks vs Xero | AI Accounting",
    description:
      "AI-native automation with 19 specialized agents vs traditional manual accounting software.",
    url: "https://xenboox.com/compare",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
