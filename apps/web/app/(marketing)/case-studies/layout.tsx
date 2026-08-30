import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies — Real Teams, Real Results | Xenboox",
  description:
    "See how businesses close their books in days, recover overdue invoices, and automate payroll with AI agents. Real stories from real teams.",
  openGraph: {
    title: "Case Studies — Real Teams, Real Results | Xenboox",
    description:
      "See how businesses close their books in days, recover overdue invoices, and automate payroll with AI agents.",
    url: "https://xenboox.com/case-studies",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function CaseStudiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
