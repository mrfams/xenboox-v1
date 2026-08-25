import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — AI-Native Accounting Platform",
  description:
    "AI agents handle invoicing, payroll, compliance, and month-end close. Automated reconciliations, intelligent categorization, and real-time insights.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
