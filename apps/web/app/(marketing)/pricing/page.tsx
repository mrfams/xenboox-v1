"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  ArrowUpRight,
  Zap,
  Users,
  Building2,
  Headphones,
  Clock,
  Upload,
  ScanSearch,
  Sparkles,
  Check,
} from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import {
  FaqJsonLd,
  BreadcrumbJsonLd,
  ProductJsonLd,
} from "@/components/marketing/json-ld";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { FeatureComparison } from "@/components/marketing/feature-comparison";

// ─── Tiers ───────────────────────────────────────────────────────────────────

const monthlyTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Start closing your books with AI.",
    annualSavings: null,
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
    icon: Zap,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Let AI agents handle your daily accounting.",
    annualSavings: 58,
    features: [
      "Up to 3 entities",
      "All AI agents",
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
    icon: Users,
  },
  {
    name: "Business",
    price: "$79",
    period: "/month",
    description: "Scale to multiple entities — AI handles the complexity.",
    annualSavings: 158,
    features: [
      "Up to 10 entities",
      "All AI agents",
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
    icon: Building2,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with complex, multi-entity needs.",
    annualSavings: null,
    features: [
      "Unlimited entities",
      "All AI agents",
      "Unlimited everything",
      "Multi-currency + multi-entity consolidation",
      "Advanced compliance & audit trail",
      "SSO & role-based access control",
      "Web app + API access",
      "Dedicated account manager",
      "Custom integrations & SLA",
      "Onboarding & training",
    ],
    cta: "Talk to Sales",
    ctaHref: "/contact",
    highlighted: false,
    icon: Headphones,
    badge: null,
  },
];

const yearlyTiers = monthlyTiers.map((tier) => {
  if (tier.price === "$0" || tier.price === "Custom") return tier;
  const monthly = parseInt(tier.price.replace("$", ""));
  const yearly = Math.round(monthly * 10);
  return {
    ...tier,
    price: `$${yearly}`,
    period: "/year",
    description: `$${monthly}/mo billed annually — save $${tier.annualSavings}`,
  };
});

// ─── Feature Comparison Table ─────────────────────────────────────────────────

const comparisonCategories = [
  {
    name: "Core Accounting",
    features: [
      {
        name: "AI Agents",
        free: "1 (CFO)",
        starter: "All",
        business: "All",
        enterprise: "All",
      },
      {
        name: "Entities",
        free: "1",
        starter: "Up to 3",
        business: "Up to 10",
        enterprise: "Unlimited",
      },
      {
        name: "Journal entries",
        free: "50/mo",
        starter: "Unlimited",
        business: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Chart of accounts",
        free: true,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "P&L & Balance Sheet",
        free: true,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Cash flow statements",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "AP / AR & Payroll",
    features: [
      {
        name: "Accounts payable",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Accounts receivable",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Payroll processing",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Bill payment automation",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Invoice generation",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "Treasury & Banking",
    features: [
      {
        name: "Bank reconciliation",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Multi-currency (50+)",
        free: false,
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "Fixed assets & depreciation",
        free: false,
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "Inventory management",
        free: false,
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "Multi-entity consolidation",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
    ],
  },
  {
    name: "Compliance & Security",
    features: [
      {
        name: "Month-end close automation",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Confidence-scored approvals",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Audit trail",
        free: "Basic",
        starter: "Full",
        business: "Full",
        enterprise: "Advanced",
      },
      {
        name: "Tax compliance",
        free: "Basic",
        starter: "Standard",
        business: "Multi-jurisdiction",
        enterprise: "Custom",
      },
      {
        name: "SSO & RBAC",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
      {
        name: "SOC 2 compliance",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
    ],
  },
  {
    name: "Support & Integrations",
    features: [
      {
        name: "Community support",
        free: true,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Email support",
        free: false,
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "Priority support",
        free: false,
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "Dedicated account manager",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
      {
        name: "Custom integrations",
        free: false,
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "API access",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
      {
        name: "Onboarding & training",
        free: false,
        starter: false,
        business: false,
        enterprise: true,
      },
    ],
  },
];

// ─── FAQs ────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade anytime. Upgrades are prorated for the remaining billing cycle. Downgrades take effect at the next billing date.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. PostgreSQL row-level security, AES-256 encryption at rest, TLS 1.3 in transit, and a complete audit trail for every action.",
  },
  {
    q: "Do you support my country's tax regulations?",
    a: "Tax compliance is built in for multiple jurisdictions. Enterprise supports custom tax configurations for any country.",
  },
  {
    q: "Can I use Xenboox on my phone?",
    a: "Yes. Xenboox is a responsive web app that works great on any device — phone, tablet, or desktop.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Export anytime. Data is retained for 90 days after cancellation, then permanently deleted. You can request early deletion at any time.",
  },
  {
    q: "How does the Enterprise plan work?",
    a: "Enterprise is custom-priced based on your entity count, agent usage, and support needs. Contact our sales team for a tailored quote.",
  },
  {
    q: "What's the difference between Starter and Business?",
    a: "Starter covers up to 3 entities with all AI agents. Business adds multi-currency, fixed assets, inventory, and up to 10 entities.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

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
        description="Full access to all AI agents, unlimited journal entries, AP/AR, payroll, and treasury."
        price="29"
      />
      {/* ── Hero ──────────────────────────────────────────────────────── */}
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
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
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
      {/* ── Pricing Cards ─────────────────────────────────────────────── */}
      <Section className="!pt-0 !pb-16 sm:!pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-4">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <FadeInUp key={tier.name} delay={index * 0.08}>
                  <div
                    className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      tier.highlighted
                        ? "border-primary/40 shadow-xl shadow-primary/10 lg:scale-[1.03] bg-gradient-to-b from-card to-primary/5"
                        : tier.name === "Enterprise"
                          ? "border-border/60 bg-card hover:shadow-lg hover:-translate-y-1 hover:border-border/40"
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
                    {tier.name === "Enterprise" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background shadow-md">
                        Custom Pricing
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground">
                          {tier.name}
                        </h3>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
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
                      {annual && tier.annualSavings && (
                        <p className="mt-1 text-xs font-medium text-balanced-green">
                          Save ${tier.annualSavings}/year
                        </p>
                      )}
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
                          <span className="text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={tier.ctaHref}
                      className={`mt-6 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                        tier.highlighted
                          ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          : tier.name === "Enterprise"
                            ? "border border-foreground bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
                            : "border border-border bg-card text-foreground hover:bg-accent/50 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      {tier.cta}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>
      </Section>
      {/* ── Trust Bar ─────────────────────────────────────────────────── */}
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
      </section>{" "}
      {/* ── Feature Comparison Table ──────────────────────────────────── */}
      <FeatureComparison
        title="Compare plans in detail"
        subtitle="Every plan includes AI agents. The difference is how many entities and features you need."
        columns={["Free", "Starter", "Business", "Enterprise"]}
        highlightColumn={1}
        categories={comparisonCategories.map((cat) => ({
          name: cat.name,
          features: cat.features.map((f) => ({
            name: f.name,
            values: [f.free, f.starter, f.business, f.enterprise],
          })),
        }))}
      />
      {/* ── ROI Calculator ──────────────────────────────────────────────
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
      ── */}
      {/* ── Migration — Editorial Split · Production Grade ──────────────── */}
      <section className="relative overflow-hidden border-t border-border/60 bg-paper-2/40 py-24 sm:py-28 lg:py-32">
        {/* subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20,33,61,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at 30% 20%, black 25%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 30% 20%, black 25%, transparent 70%)",
          }}
        />
        {/* soft ambient highlight */}
        <div
          className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[680px] rounded-full opacity-20 blur-3xl"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(20,33,61,0.08), transparent 65%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-16 items-start">
            {/* Left — Editorial */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <FadeInUp>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Migration
                  </span>
                  <span className="hidden sm:inline text-[10px] text-muted-foreground/60">
                    · Zero downtime
                  </span>
                </div>

                <h2 className="mt-6 text-[1.9rem] font-semibold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.55rem]">
                  Switching is
                  <br />
                  <span className="text-primary">easy.</span> The AI
                  <br />
                  does the work.
                </h2>

                <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
                  Export from QuickBooks, Xero, or any ledger. Our migration
                  agent maps your chart, validates every entry, and flags only
                  what needs you — nothing more.
                </p>

                {/* proof row — monospace, editorial */}
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-border/40 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/60">
                      <Clock className="h-3 w-3" />
                    </span>
                    <span className="font-mono text-[11px] tracking-wide text-foreground font-medium">
                      48h
                    </span>
                    avg. migration
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/60">
                      <ShieldCheck className="h-3 w-3" />
                    </span>
                    No data loss
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border/60">
                      <Check className="h-3 w-3" />
                    </span>
                    Guided
                  </span>
                </div>

                {/* CTA — primary with button-in-button, secondary links */}
                <div className="mt-7 flex flex-col gap-4">
                  <Link
                    href="/register"
                    className="group inline-flex w-fit items-center gap-3 rounded-full bg-foreground px-1.5 py-1.5 pr-1.5 text-sm font-medium text-background shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01] active:scale-[0.98]"
                  >
                    <span className="pl-4 pr-1">Start migration</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/10 ring-1 ring-background/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <Link
                      href="/compare/quickbooks"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2.5 font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:border-border"
                    >
                      Switch from QuickBooks
                      <ArrowUpRight
                        className="h-3 w-3 opacity-60"
                        aria-hidden="true"
                      />
                    </Link>
                    <Link
                      href="/compare/xero"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2.5 font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:border-border"
                    >
                      Switch from Xero
                      <ArrowUpRight
                        className="h-3 w-3 opacity-60"
                        aria-hidden="true"
                      />
                    </Link>
                    <Link
                      href="/compare"
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40"
                    >
                      View all
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                    Free migration help for Business &amp; Enterprise · Your
                    data stays yours.
                  </p>
                </div>
              </FadeInUp>
            </div>

            {/* Right — Timeline with Double-Bezel cards */}
            <div className="lg:col-span-7">
              <div className="relative">
                {/* vertical hairline */}
                <div
                  className="pointer-events-none absolute left-[19px] top-6 bottom-6 hidden w-px bg-gradient-to-b from-border via-border/60 to-transparent sm:block"
                  aria-hidden="true"
                />

                <div className="flex flex-col gap-6">
                  {/* Step 01 */}
                  <FadeInUp delay={0.05}>
                    <div className="flex gap-4 sm:gap-5">
                      <div className="hidden shrink-0 flex-col items-center sm:flex">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card shadow-[0_4px_16px_-8px_rgba(20,33,61,0.15)]">
                          <Upload className="h-4 w-4 text-foreground/70" />
                        </div>
                        <div className="mt-3 h-14 w-px bg-border/40" />
                      </div>
                      <div className="flex-1">
                        <div className="group rounded-[24px] border border-border/40 bg-white/60 p-[7px] shadow-[0_8px_32px_-16px_rgba(20,33,61,0.12)] backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_16px_40px_-16px_rgba(20,33,61,0.16)] hover:-translate-y-0.5">
                          <div className="rounded-[17px] border border-border/40 bg-card p-6 sm:p-7">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
                                    01 — EXPORT
                                  </span>
                                  <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
                                  <span className="text-xs text-muted-foreground/60">
                                    2 min
                                  </span>
                                </div>
                                <h3 className="mt-2 text-[17px] font-semibold tracking-tight text-foreground">
                                  Export your data
                                </h3>
                                <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                                  Download your chart of accounts, transactions,
                                  and reports. CSV or XLSX — the agent accepts
                                  both.
                                </p>
                              </div>
                              <span className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/50 text-muted-foreground">
                                <Upload className="h-4 w-4" />
                              </span>
                            </div>
                            {/* micro file chips */}
                            <div className="mt-5 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
                                CoA.csv
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" />
                                Transactions.xlsx
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                                Reports.pdf
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeInUp>

                  {/* Step 02 */}
                  <FadeInUp delay={0.12}>
                    <div className="flex gap-4 sm:gap-5">
                      <div className="hidden shrink-0 flex-col items-center sm:flex">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-[0_4px_16px_-8px_rgba(20,33,61,0.15)]">
                          <ScanSearch className="h-4 w-4 text-primary" />
                        </div>
                        <div className="mt-3 h-14 w-px bg-border/40" />
                      </div>
                      <div className="flex-1">
                        <div className="group rounded-[24px] border border-primary/15 bg-primary/[0.04] p-[7px] shadow-[0_8px_32px_-16px_rgba(20,33,61,0.12)] backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_16px_40px_-16px_rgba(20,33,61,0.16)] hover:-translate-y-0.5">
                          <div className="rounded-[17px] border border-primary/10 bg-card p-6 sm:p-7">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-primary">
                                    02 — IMPORT &amp; MAP
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-500/15">
                                    AI does this
                                  </span>
                                </div>
                                <h3 className="mt-2 text-[17px] font-semibold tracking-tight text-foreground">
                                  Import to Xenboox
                                </h3>
                                <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                                  The migration agent maps accounts, validates
                                  entries, and surfaces only conflicts for you.
                                </p>
                              </div>
                              <span className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                                <ScanSearch className="h-4 w-4" />
                              </span>
                            </div>
                            {/* mapping preview */}
                            <div className="mt-5 rounded-xl border border-border/50 bg-muted/30 p-3">
                              <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    1200 · Sales
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <Check className="h-3 w-3" /> Mapped
                                  </span>
                                </div>
                                <div className="h-px bg-border/50" />
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    2100 · Accounts Payable
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <Check className="h-3 w-3" /> Mapped
                                  </span>
                                </div>
                                <div className="h-px bg-border/50" />
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    5300 · VAT Control
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-700 border border-amber-500/15">
                                    Review
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeInUp>

                  {/* Step 03 */}
                  <FadeInUp delay={0.2}>
                    <div className="flex gap-4 sm:gap-5">
                      <div className="hidden shrink-0 flex-col items-center sm:flex">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 shadow-[0_4px_16px_-8px_rgba(20,33,61,0.15)]">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="group rounded-[24px] border border-border/40 bg-white/60 p-[7px] shadow-[0_8px_32px_-16px_rgba(20,33,61,0.12)] backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_16px_40px_-16px_rgba(20,33,61,0.16)] hover:-translate-y-0.5">
                          <div className="rounded-[17px] border border-border/40 bg-card p-6 sm:p-7">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
                                    03 — LIVE
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-500/15">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    48h to live
                                  </span>
                                </div>
                                <h3 className="mt-2 text-[17px] font-semibold tracking-tight text-foreground">
                                  AI picks up where you left off
                                </h3>
                                <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                                  Agents start posting, reconciling, and
                                  closing. Most teams are operational within two
                                  days.
                                </p>
                              </div>
                              <span className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/15 bg-emerald-500/10 text-emerald-600">
                                <Sparkles className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                  Migration verified
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  1,247 entries · 0 conflicts · Ready to close
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeInUp>
                </div>

                {/* bottom helper */}
                <p className="mt-6 pl-0 sm:pl-[60px] text-center text-[11px] text-muted-foreground/60 sm:text-left">
                  Need help? We migrate for you — free on Business &amp;
                  Enterprise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-background py-12 sm:py-16">
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
              <FadeInUp key={faq.q} delay={index * 0.04}>
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
      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start closing your books in days, not weeks.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-full border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                Talk to Sales
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
