import type { Metadata } from "next";
import { Cta } from "@/components/marketing/cta";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero-home";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Security } from "@/components/marketing/security";
import { Testimonials } from "@/components/marketing/testimonials";

export const metadata: Metadata = {
  title: "Home",
  description:
    "AI-native accounting platform for businesses worldwide. Automated journal entries, reconciliations, payroll, and financial reporting.",
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
