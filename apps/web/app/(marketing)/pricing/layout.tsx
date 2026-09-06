import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Start Free | Xenboox",
  description:
    "Start free. Paid plans from $29/mo with unlimited journal entries, full close automation, payroll, and multi-entity support. Cancel anytime. 30-day money-back guarantee.",
  openGraph: {
    title: "Pricing — Start Free | Xenboox",
    description:
      "Start free. Paid plans from $29/mo with unlimited entries, full automation, and multi-entity support.",
    url: "https://xenboox.com/pricing",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
