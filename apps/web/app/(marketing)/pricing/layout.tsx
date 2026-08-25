import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Start Free, Scale As You Grow",
  description:
    "Free tier with 1 AI agent. Starter plan with all AI agents. Business plan for multi-entity, multi-currency. No hidden fees.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
