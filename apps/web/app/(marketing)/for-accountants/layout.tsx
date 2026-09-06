import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox for Accountants — Every Client's Close in One Queue",
  description:
    "Manage multiple clients with books that run themselves. Automated bookkeeping, payroll, and compliance for accounting firms. Free tier available.",
  openGraph: {
    title: "Xenboox for Accountants",
    description:
      "One queue for every client's close, evidence on every posting. Free tier available.",
    url: "https://xenboox.com/for-accountants",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function ForAccountantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
