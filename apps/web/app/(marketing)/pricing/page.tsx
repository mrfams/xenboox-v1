"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  CtaBand,
} from "../components/marketing-primitives";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For solo founders and small businesses getting started.",
    features: [
      "1 entity",
      "Core AI assistant",
      "Up to 50 journal entries/month",
      "Chart of accounts",
      "Basic reports (P&L, Balance Sheet)",
      "Web app access",
      "Community support",
    ],
    cta: "Start Free",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For growing businesses that need AI-powered automation.",
    features: [
      "Up to 3 entities",
      "Full AI agent suite",
      "Unlimited journal entries",
      "Complete AP/AR module",
      "Payroll processing",
      "Treasury & bank reconciliation",
      "Web + mobile apps",
      "Email support",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$79",
    period: "/month",
    description: "For established businesses with complex accounting needs.",
    features: [
      "Up to 10 entities",
      "Full AI agent suite",
      "Unlimited everything",
      "Multi-currency support",
      "Fixed assets & depreciation",
      "Inventory management",
      "All platforms (web, mobile, desktop)",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations that need dedicated infrastructure and support.",
    features: [
      "Unlimited entities",
      "Full AI agent suite",
      "Unlimited everything",
      "SSO/SAML authentication",
      "Custom AI configuration",
      "Dedicated deployment options",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom reporting",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

function PricingCard({
  tier,
  index,
}: {
  tier: (typeof tiers)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`relative flex flex-col rounded-3xl p-7 ${
        tier.highlighted
          ? "glass shadow-[0_0_70px_-20px_rgba(99,102,241,0.6)] ring-1 ring-indigo-400/40"
          : "glass"
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-1 text-xs font-semibold text-white shadow-lg">
          Most Popular
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-white">
            {tier.price}
          </span>
          {tier.period && (
            <span className="text-sm text-white/40">{tier.period}</span>
          )}
        </div>
        <p className="mt-3 text-sm text-white/50">{tier.description}</p>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-sm text-white/70"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={tier.ctaHref}
        className={`mt-7 inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.03] ${
          tier.highlighted
            ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-600/30"
            : "border border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
        }`}
      >
        {tier.cta}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Link>
    </motion.div>
  );
}

const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remaining days in your billing cycle.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use database row-level security, AES-256 encryption for sensitive fields, and all data is encrypted in transit with TLS 1.3. We also maintain a complete audit trail for every action.",
  },
  {
    question: "Do you support my country's tax regulations?",
    answer:
      "Xenboox ships with regional tax bands and social-security contributions built in, with more jurisdictions on the way. Custom tax configurations are available on the Enterprise plan.",
  },
  {
    question: "Can I use Xenboox on my phone?",
    answer:
      "Yes. Xenboox is available on web, iOS, Android, Windows, and macOS. Your data syncs seamlessly across all platforms.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "You can export all your data at any time. After cancellation, we retain your data for 30 days, then it's permanently deleted.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return <GlassFaq question={question} answer={answer} />;
}

function GlassFaq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-white">{question}</h3>
      <p className="mt-2 text-sm text-white/55">{answer}</p>
    </div>
  );
}

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Pricing"
        title="Simple, transparent"
        highlight="pricing"
        subtitle="Start free. Scale as you grow. No hidden fees, no surprises."
      />

      <section className="pb-8 pt-4">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="mb-10 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              FAQ
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {faqs.map((f) => (
              <FaqItem key={f.question} {...f} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to get started?"
        subtitle="Create your free account in 30 seconds. No credit card required."
        primaryHref="/register"
        primaryLabel="Start Free"
      />
    </MarketingShell>
  );
}
