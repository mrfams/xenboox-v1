"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  MapPin,
  Clock,
  Code,
  Palette,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
  CtaBand,
} from "../components/marketing-primitives";

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Build the core platform — Next.js, tRPC, Drizzle ORM, PostgreSQL. You'll work on the web app, API layer, and database schema.",
    icon: Code,
  },
  {
    title: "Mobile Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "Own the React Native mobile app. Build native features, optimize performance, and ensure offline-first reliability.",
    icon: Code,
  },
  {
    title: "AI/ML Engineer",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description:
      "Design and improve our agent workflows. Fine-tune prompts, build evaluation suites, and optimize costs.",
    icon: BarChart3,
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description:
      "Design intuitive interfaces for complex accounting workflows. Balance power with simplicity across web, mobile, and desktop.",
    icon: Palette,
  },
];

const benefits = [
  "Remote-first — work from anywhere",
  "Competitive salary + equity",
  "Health insurance",
  "Unlimited PTO",
  "Learning & development budget",
  "Annual team retreats",
];

function OpeningCard({
  opening,
  index,
}: {
  opening: (typeof openings)[number];
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
      <GlassCard className="flex h-full flex-col p-7">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
          <opening.icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-white">{opening.title}</h3>
        <p className="mt-2 flex-1 text-sm text-white/55">
          {opening.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/50">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {opening.team}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {opening.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {opening.type}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function CareersPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Careers"
        title="Build the future of"
        highlight="finance in Africa"
        subtitle="Help us build the accounting platform that African businesses deserve. We're looking for people who care about craft, impact, and doing things right."
      />

      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Why Xenboox?
            </h2>
            <p className="mt-4 text-white/55">
              We're a focused team tackling a massive problem. Accounting
              software in Africa is stuck in the past — we're building what
              comes next.
            </p>
            <p className="mt-4 text-white/55">
              You'll work on hard problems: agent orchestration, multi-currency
              accounting, offline-first sync, and enterprise security. And
              you'll see your work used by real businesses.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="p-7">
              <h3 className="mb-4 text-lg font-semibold text-white">
                What We Offer
              </h3>
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 text-sm text-white/70"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Open Positions
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {openings.map((opening, i) => (
              <OpeningCard key={opening.title} opening={opening} index={i} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Don't see your role?"
        subtitle="We're always interested in meeting talented people. Send us your resume."
        primaryHref="mailto:careers@xenboox.com"
        primaryLabel="Get in Touch"
      />
    </MarketingShell>
  );
}
