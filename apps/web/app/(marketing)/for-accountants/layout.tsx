import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox for Accountants — AI-Powered Practice Management",
  description:
    "Manage multiple clients with AI agents. Automated bookkeeping, payroll, and compliance for accounting firms. Free tier available.",
};

export default function ForAccountantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
