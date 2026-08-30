import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox One-Pager — AI Accounting Platform Overview | PDF",
  description:
    "Download the Xenboox one-pager. Quick overview of AI-native accounting with specialized agents for invoicing, payroll, and compliance.",
  openGraph: {
    title: "Xenboox One-Pager — AI Accounting Platform Overview",
    description:
      "Quick overview of AI-native accounting with specialized agents for invoicing, payroll, and compliance.",
    url: "https://xenboox.com/one-pager",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function OnePagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
