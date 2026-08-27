"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  CreditCard,
  RotateCcw,
} from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import {
  FaqJsonLd,
  BreadcrumbJsonLd,
  ProductJsonLd,
} from "@/components/marketing/json-ld";
import { ComparisonTeaser } from "@/components/marketing/comparison-teaser";
import { RoiCalculator } from "@/components/marketing/roi-calculator";

const monthlyTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Start closing your books with AI.",
    features: [
      "1 entity",
      "1 AI agent (CFO)",
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
    description: "Let AI agents handle your daily accounting.",
    features: [
      "Up to 3 entities",
      "All 19 AI agents",
      "Unlimited journal entries",
      "Full AP/AR module",
      "Payroll processing",
      "Treasury & bank reconciliation",
      "Web app",
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
    description: "Scale to multiple entities — AI handles the complexity.",
    features: [
      "Up to 10 entities",
      "All 19 AI agents",
      "Unlimited everything",
      "Multi-currency support",
      "Fixed assets & depreciation",
      "Inventory management",
      "Web app",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
  },
];

const yearlyTiers = monthlyTiers.map((tier) => {
  if (tier.price === "$0") return tier;
  const monthly = parseInt(tier.price.replace("$", ""));
  const yearly = Math.round(monthly * 10);
  return {
    ...tier,
    price: `$${yearly}`,
    period: "/year",
    description: `$${monthly}/mo billed annually — save $${monthly * 2}`,
  };
});

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade anytime. Upgrades are prorated for the remaining billing cycle.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. PostgreSQL RLS, AES-256 encryption, TLS 1.3, and a complete audit trail.",
  },
  {
    q: "Do you support my country's tax regulations?",
    a: "Tax compliance built in for multiple jurisdictions. Enterprise supports custom tax configs for any country.",
  },
  {
    q: "Can I use Xenboox on my phone?",
    a: "Yes. Xenboox is a responsive web app that works great on any device — phone, tablet, or desktop.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Export anytime. Data retained 90 days after cancellation, then permanently deleted.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const tiers = annual ? yearlyTiers : monthlyTiers;

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Pricing" }]}
      />
      <FaqJsonLd items={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <ProductJsonLd
        name="Xenboox Starter"
        description="Full access to all 19 AI agents, unlimited journal entries, AP/AR, payroll, and treasury."
        price="29"
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Simple pricing
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Simple, transparent{" "}
                <span className="text-primary">pricing</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                Start free with 1 AI agent. Upgrade when you need the full team.
                Cancel anytime — your data stays yours.
              </p>

              {/* Trust Signals */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-balanced-green" />
                  No credit card required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-balanced-green" />
                  Cancel anytime
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-balanced-green" />
                  30-day money-back guarantee
                </span>
              </div>

              {/* Billing Toggle */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="relative flex rounded-full border border-border bg-card p-0.5">
                  <button
                    type="button"
                    onClick={() => setAnnual(false)}
                    className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      !annual
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnual(true)}
                    className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                      annual
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Annual
                  </button>
                </div>
                <span className="inline-flex items-center rounded-full bg-balanced-green/10 px-2.5 py-0.5 text-xs font-medium text-balanced-green border border-balanced-green/20">
                  Save 17%
                </span>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Pricing Cards */}
      <Section className="!pt-0 !pb-16 sm:!pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {tiers.map((tier, index) => (
              <FadeInUp key={tier.name} delay={index * 0.1}>
                <div
                  className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    tier.highlighted
                      ? "border-primary/40 shadow-xl shadow-primary/10 lg:scale-[1.03] bg-gradient-to-b from-card to-primary/5"
                      : "border-border/60 bg-card hover:shadow-lg hover:-translate-y-1 hover:border-border/40"
                  }`}
                >
                  {tier.highlighted && (
                    <div
                      aria-label="Most popular plan"
                      className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md ring-1 ring-primary/20"
                    >
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground/90"
                        aria-hidden="true"
                      />
                      Most Popular
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {tier.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground">
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-sm text-muted-foreground">
                          {tier.period}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            tier.highlighted
                              ? "text-primary"
                              : "text-balanced-green"
                          }`}
                        />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.ctaHref}
                    className={`mt-6 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                      tier.highlighted
                        ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        : "border border-border bg-card text-foreground hover:bg-accent/50 hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Trust Bar */}
      <section className="border-t border-border bg-paper-2/60 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-balanced-green" />
              <span>
                <strong className="text-foreground">
                  No credit card required
                </strong>{" "}
                to start your free plan
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-balanced-green" />
              <span>
                <strong className="text-foreground">Cancel anytime</strong> — no
                lock-in contracts
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Shield className="h-5 w-5 text-balanced-green" />
              <span>
                <strong className="text-foreground">
                  30-day money-back guarantee
                </strong>{" "}
                on paid plans
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="border-t border-border bg-background py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FadeInUp>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Calculate your savings
              </h2>
              <p className="mt-3 text-muted-foreground">
                See how much time and money Xenboox saves your team
              </p>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <RoiCalculator />
          </FadeInUp>
        </div>
      </section>

      {/* Comparison Teaser */}
      <ComparisonTeaser />

      {/* FAQ */}
      <section className="border-t border-border bg-paper-2/60 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FadeInUp>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Frequently Asked Questions
              </h2>
            </div>
          </FadeInUp>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FadeInUp key={faq.q} delay={index * 0.05}>
                <details className="group rounded-xl border border-border/60 bg-card transition-all duration-300 hover:shadow-sm hover:border-border/40 open:shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-foreground list-none">
                    {faq.q}
                    <svg
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                </details>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start closing your books in days, not weeks.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
