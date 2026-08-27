import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies — How Businesses Use Xenboox | AI Accounting",
  description:
    "See how businesses in The Gambia close their books in days, recover overdue invoices, and automate payroll with Xenboox AI agents.",
};

export default function CaseStudiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
