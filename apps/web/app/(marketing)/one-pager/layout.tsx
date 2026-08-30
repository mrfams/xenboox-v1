import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox One-Pager — AI Accounting Platform Overview | PDF",
  description:
    "Download the Xenboox one-pager. Quick overview of AI-native accounting with specialized agents for invoicing, payroll, and compliance.",
};

export default function OnePagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
