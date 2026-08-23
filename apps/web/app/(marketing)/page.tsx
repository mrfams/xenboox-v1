import type { Metadata } from "next";

import { Cta } from "@/components/marketing/cta";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero-home";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Security } from "@/components/marketing/security";
import { Testimonials } from "@/components/marketing/testimonials";

export const metadata: Metadata = {
  title: "AI-Native Accounting Platform — 19 Agents, Zero Data Entry",
  description:
    "Xenboox is an AI-native accounting platform with 19 specialized agents that handle invoicing, payroll, compliance, and month-end close. Multi-currency, multi-entity, built for modern businesses.",
  openGraph: {
    title: "Xenboox — Your Entire Accounting Department, Running Autonomously",
    description:
      "19 AI agents handle invoicing, payroll, compliance, and month-end close. Agents do the work. You make the decisions.",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Security />
      <Testimonials />
      <Cta />
    </>
  );
}
