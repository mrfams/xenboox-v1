import type { Metadata } from "next";

import { AnnouncementBar } from "@/components/marketing/announcement-bar";
import { Cta } from "@/components/marketing/cta";
import { DemoVideo } from "@/components/marketing/demo-video";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero-home";
import { HowItWorks } from "@/components/marketing/how-it-works";
import {
  OrganizationJsonLd,
  SoftwareAppJsonLd,
} from "@/components/marketing/json-ld";
import { Security } from "@/components/marketing/security";
// import { StatBar } from "@/components/marketing/stat-bar";
import { Testimonials } from "@/components/marketing/testimonials";

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
      <HowItWorks />
      <Features />
      <DemoVideo />
      <Security />
      <Cta />
    </>
  );
}
