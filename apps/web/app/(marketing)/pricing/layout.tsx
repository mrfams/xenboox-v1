import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AI-Native Accounting for SMEs | Xenboox",
  description:
    "Start free with 1 AI agent. Upgrade to unlock all 19 agents, multi-currency, payroll, and treasury. Cancel anytime. 30-day money-back guarantee.",
  openGraph: {
    title: "Pricing — AI-Native Accounting for SMEs | Xenboox",
    description:
      "Start free with 1 AI agent. Upgrade to unlock all 19 agents, multi-currency, payroll, and treasury.",
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
