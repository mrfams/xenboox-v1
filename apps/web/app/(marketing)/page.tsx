import type { Metadata } from "next";

import { AnnouncementBar } from "@/components/marketing/announcement-bar";
import { Cta } from "@/components/marketing/cta";
import { DemoVideo } from "@/components/marketing/demo-video";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero-home";
import {
  HowItWorks,
  type HowItWorksStep,
} from "@/components/marketing/how-it-works";
import {
  OrganizationJsonLd,
  SoftwareAppJsonLd,
} from "@/components/marketing/json-ld";
import { Security } from "@/components/marketing/security";
// import { StatBar } from "@/components/marketing/stat-bar";
import { Testimonials } from "@/components/marketing/testimonials";
import {
  Bot,
  FileText,
  Banknote,
  ShieldCheck,
  PieChart,
  BarChart3,
} from "lucide-react";

const howItWorksSteps: HowItWorksStep[] = [
  {
    step: "1",
    title: "Connect & configure",
    description:
      "Link your bank, import your chart of accounts, and set up your entity in minutes.",
    icon: Banknote,
  },
  {
    step: "2",
    title: "AI agents take over",
    description:
      "Specialized agents handle invoicing, payroll, compliance, and reconciliations — all automatically.",
    icon: Bot,
  },
  {
    step: "3",
    title: "Review & approve",
    description:
      "AI confidence-scores every decision. You review what matters and approve with one click.",
    icon: ShieldCheck,
  },
];

export const metadata: Metadata = {
  title: "AI-Native Accounting Platform — AI Agents, Zero Data Entry",
  description:
    "Xenboox is an AI-native accounting platform with specialized agents that handle invoicing, payroll, compliance, and month-end close. Multi-currency, multi-entity, built for modern businesses.",
  openGraph: {
    title: "Xenboox — Your Entire Accounting Department, Running Autonomously",
    description:
      "AI agents handle invoicing, payroll, compliance, and month-end close. Agents do the work. You make the decisions.",
  },
};

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <SoftwareAppJsonLd />
      <AnnouncementBar />
      <Hero />
      <Testimonials />
      {/* <StatBar /> */}
      <HowItWorks
        steps={howItWorksSteps}
        title="From signup to autonomous accounting in 3 steps"
        subtitle="No data entry. No spreadsheets. No month-end panic."
      />
      <Features />
      <DemoVideo />
      <Security />
      <Cta />
    </>
  );
}
