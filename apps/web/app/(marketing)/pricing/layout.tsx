import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Plans for Every Stage | Xenboox",
  description:
    "Start free. Paid plans from $29/mo with unlimited journal entries, full close automation, payroll, and multi-entity support. No credit card required.",
  openGraph: {
    title: "Xenboox Pricing — Start Free",
    description:
      "Free tier for getting started, paid plans from $29/mo. Unlimited entries, full automation, human support.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
