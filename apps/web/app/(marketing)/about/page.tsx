"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Bot, Globe, Shield, Eye, ArrowRight, Sparkles } from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
  CtaBand,
} from "../components/marketing-primitives";

const values = [
  {
    icon: Bot,
    title: "AI-First, Not AI-Added",
    description:
      "We didn't bolt AI onto legacy accounting software. Xenboox was built from the ground up with intelligent agents at its core.",
  },
  {
    icon: Globe,
    title: "Built for Africa",
    description:
      "African businesses face unique challenges — multi-currency, mobile money, varying tax regimes. We solve for these from day one.",
  },
  {
    icon: Shield,
    title: "Security Without Compromise",
    description:
      "Row-level security, encryption at rest, full audit trails. Enterprise-grade security available to every business, not just the big ones.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description:
      "Every AI decision is logged with confidence scores. If an agent isn't sure, it asks — not guesses. You always know what happened and why.",
  },
];

const milestones = [
  {
    year: "2025",
    event: "Founded",
    detail:
      "Started with a vision to modernize accounting for African businesses.",
  },
  {
    year: "2025",
    event: "First Release",
    detail: "Core ledger, AP/AR, and payroll operational with AI assistance.",
  },
  {
    year: "2026",
    event: "Public Beta",
    detail: "Web, mobile, and desktop apps available across multiple markets.",
  },
  {
    year: "2026",
    event: "General Availability",
    detail:
      "Full launch with enterprise features, multi-entity support, and SLA guarantees.",
  },
];

function ValueCard({
  value,
  index,
}: {
  value: (typeof values)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <GlassCard className="h-full p-7">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
          <value.icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-white">{value.title}</h3>
        <p className="mt-2 text-sm text-white/55">{value.description}</p>
      </GlassCard>
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="About"
        title="Accounting, reimagined"
        highlight="for Africa"
        subtitle="We're building the accounting platform that African businesses deserve — AI-native, multi-currency, multi-platform, and accessible to everyone."
      />

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Our Mission
            </h2>
            <p className="mt-4 text-white/55">
              Accounting software hasn't kept pace with the way businesses
              actually work in Africa. Multi-currency transactions, mobile
              money, varying tax regimes, and unreliable connectivity are the
              norm — not the exception.
            </p>
            <p className="mt-4 text-white/55">
              Xenboox changes that. We've built an AI-native platform where
              intelligent agents handle the heavy lifting — from journal entries
              to payroll to financial reports. Your books stay accurate,
              compliant, and up-to-date without the manual grind.
            </p>
            <p className="mt-4 text-white/55">
              Available on web, mobile, and desktop. Works online and offline.
              Priced so that small businesses can access the same tools as
              enterprises.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="p-8">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Why teams choose us
              </div>
              <ul className="space-y-4">
                {[
                  "Close your books faster with automated workflows",
                  "Reduce manual error with AI-assisted posting",
                  "Real-time financial intelligence at your fingertips",
                  "Enterprise-grade security from day one",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-white/70"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              What We Believe
            </h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <ValueCard key={value.title} value={value} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Our Journey
            </h2>
          </Reveal>
          <div className="space-y-8">
            {milestones.map((milestone, i) => (
              <Reveal key={milestone.event} delay={i * 0.05}>
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg">
                      {milestone.year}
                    </div>
                    {i < milestones.length - 1 && (
                      <div className="mt-2 h-full w-px flex-1 bg-white/10" />
                    )}
                  </div>
                  <div className="pb-8">
                    <h3 className="font-semibold text-white">
                      {milestone.event}
                    </h3>
                    <p className="mt-1 text-sm text-white/55">
                      {milestone.detail}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Join us on the journey"
        subtitle="We're building the future of accounting for Africa. Come along."
        primaryHref="/register"
        primaryLabel="Get Started"
      />
    </MarketingShell>
  );
}
