"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  CreditCard,
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
  Zap,
  Users,
  Building2,
  Headphones,
} from "lucide-react";
// Note: Check and X are now in the shared FeatureComparison component

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import {
  FaqJsonLd,
  BreadcrumbJsonLd,
  ProductJsonLd,
} from "@/components/marketing/json-ld";
import { ComparisonTeaser } from "@/components/marketing/comparison-teaser";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import {
  TestimonialCard,
  type Testimonial,
} from "@/components/marketing/testimonial-card";
import { LogoCloud, type LogoItem } from "@/components/marketing/logo-cloud";
import {
  FeatureComparison,
  type ComparisonCategory,
} from "@/components/marketing/feature-comparison";

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
      "All 19 AI agents",
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
        starter: "All 19",
        business: "All 19",
        enterprise: "All 19",
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

// ─── Testimonials (pricing-specific) ─────────────────────────────────────────

const customerLogos = [
  { name: "Seagull Logistics" },
  { name: "SunuFresh Foods" },
  { name: "Atlantic Traders" },
  { name: "Kaira Clinics" },
  { name: "LS Consulting" },
];

const pricingTestimonials = [
  {
    quote:
      "We closed our first month in four days. Previously it took three weeks and two accountants.",
    name: "Fatoumata Ceesay",
    role: "CFO, Seagull Logistics",
    plan: "Business",
  },
  {
    quote:
      "The agents chased down GMD 1.8M in overdue invoices while we slept. I just reviewed and approved over breakfast.",
    name: "Musa Jallow",
    role: "Founder, SunuFresh Foods",
    plan: "Starter",
  },
  {
    quote:
      "Multi-currency used to eat hours every week. Now the AI reconciles USD, EUR, and GMD automatically.",
    name: "Omar Darboe",
    role: "Finance Director, Atlantic Traders",
    plan: "Business",
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
    a: "Starter covers up to 3 entities with all 19 AI agents. Business adds multi-currency, fixed assets, inventory, and up to 10 entities.",
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
        description="Full access to all 19 AI agents, unlimited journal entries, AP/AR, payroll, and treasury."
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
      {/* ── Social Proof ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-paper-2/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Teams that chose Xenboox
              </h2>
              <p className="mt-3 text-muted-foreground">
                Finance leads and founders on what changed after AI took the
                busywork.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingTestimonials.map((t, i) => (
              <FadeInUp key={t.name} delay={i * 0.1}>
                <TestimonialCard
                  testimonial={{ ...t, rating: 5 }}
                  showRating
                  showPlan
                />
              </FadeInUp>
            ))}
          </div>

          {/* Trust Stats */}
          <FadeInUp delay={0.3}>
            <div className="mt-12">
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">500+</p>
                  <p className="text-xs text-muted-foreground">Businesses</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">19</p>
                  <p className="text-xs text-muted-foreground">AI Agents</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">99%</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
              <LogoCloud
                title="Trusted by finance teams across industries"
                logos={customerLogos}
              />
            </div>
          </FadeInUp>
        </div>
      </section>
      {/* ── ROI Calculator ────────────────────────────────────────────── */}
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
      {/* ── Migration Messaging ───────────────────────────────────────── */}
      <section className="border-t border-border bg-paper-2/60 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mx-auto max-w-2xl text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Switching is easy
              </h2>
              <p className="mt-3 text-muted-foreground">
                Migrate from QuickBooks, Xero, or any accounting software. The
                AI handles the heavy lifting.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Export your data",
                description:
                  "Download your chart of accounts, transactions, and reports from your current software.",
              },
              {
                step: "2",
                title: "Import to Xenboox",
                description:
                  "Upload your data. The migration agent maps accounts, validates entries, and flags issues.",
              },
              {
                step: "3",
                title: "AI picks up where you left off",
                description:
                  "Your 19 AI agents start working immediately. Most teams are fully operational within 48 hours.",
              },
            ].map((item, i) => (
              <FadeInUp key={item.step} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-border/60 bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/compare/quickbooks"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent/50 hover:scale-[1.02]"
              >
                Switch from QuickBooks
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/compare/xero"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent/50 hover:scale-[1.02]"
              >
                Switch from Xero
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground hover:scale-[1.02]"
              >
                View all comparisons
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </FadeInUp>
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
