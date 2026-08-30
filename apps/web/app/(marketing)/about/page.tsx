"use client";

import Link from "next/link";
import {
  ArrowRight,
  Target,
  Eye,
  Heart,
  Users,
  Globe,
  Shield,
  Zap,
  Building2,
  TrendingUp,
  CheckCircle2,
  Newspaper,
  Download,
  Mail,
  ExternalLink,
  Briefcase,
  Code,
  Palette,
  Headphones,
  BarChart3,
  Lock,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui";
import { Section, SectionHeading } from "@/components/marketing/section";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import { FadeInUp } from "@/components/marketing/reveal";
import { LogoCloud, type LogoItem } from "@/components/marketing/logo-cloud";

// ─── Values ──────────────────────────────────────────────────────────────────

const values = [
  {
    icon: Target,
    title: "Built for how you actually work",
    description:
      "Multi-currency, multi-entity, mobile money, bank feeds — not bolted on later. We built for businesses operating across borders from day one.",
  },
  {
    icon: Eye,
    title: "AI that explains itself",
    description:
      "Every AI decision comes with a confidence score and plain-English explanation. No black boxes. If the AI isn't sure, it asks you. You're always in control.",
  },
  {
    icon: Heart,
    title: "Accuracy is non-negotiable",
    description:
      "Accounting is trust. Every journal entry is double-checked. Every report is auditable. We'd rather be right than fast — and we're both.",
  },
  {
    icon: Users,
    title: "Built with real businesses",
    description:
      "We talk to businesses every week — trading companies, NGOs, SaaS startups, professional services. They tell us what's broken. We fix it.",
  },
  {
    icon: Zap,
    title: "Ship fast, learn faster",
    description:
      "We deploy daily. We listen to feedback the same day. We're a small team with big ambitions — speed is our advantage.",
  },
  {
    icon: Globe,
    title: "Global from day one",
    description:
      "Multi-currency, multi-jurisdiction, multi-language. Whether you're in New York, Nairobi, or Singapore — Xenboox was built for you.",
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────────

const stats = [
  { value: "20+", label: "Accounting Modules", icon: Building2 },
  { value: "20+", label: "AI Agents", icon: Zap },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
  { value: "50+", label: "Currencies Supported", icon: TrendingUp },
];

// ─── Principles ──────────────────────────────────────────────────────────────

const principles = [
  {
    title: "Accuracy over speed",
    description:
      "We'd rather be right than fast. Every calculation is double-checked. Every report is auditable. Your books are too important for shortcuts.",
  },
  {
    title: "Simplicity over features",
    description:
      "Powerful doesn't mean complicated. We relentlessly simplify complex accounting workflows so you can focus on what matters — running your business.",
  },
  {
    title: "Security over convenience",
    description:
      "We never compromise on data protection. PostgreSQL row-level security, AES-256 encryption, complete audit trails — non-negotiable.",
  },
  {
    title: "Transparency over marketing",
    description:
      "No buzzwords. No black boxes. We explain exactly how our AI works, what it costs, and how it helps your business. Try it free and see for yourself.",
  },
];

// ─── Timeline ────────────────────────────────────────────────────────────────

const timeline = [
  {
    year: "2024",
    quarter: "Q1",
    title: "The problem hits home",
    description:
      "Watching businesses struggle with accounting software that doesn't fit their needs — tools built for one market, not the world. Month-end close takes days. Errors pile up. Nobody can afford a full accounting team.",
  },
  {
    year: "2024",
    quarter: "Q2",
    title: "We start building",
    description:
      "Xenboox begins as a simple idea: what if AI could do the accounting? Not suggest what to do — actually do it. Categorize transactions, reconcile accounts, close the month, file compliance. All of it.",
  },
  {
    year: "2024",
    quarter: "Q3",
    title: "First AI agents ship",
    description:
      "The CFO Agent, Accounts Payable Agent, and Bank Reconciliation Agent go live. Early users report 60% reduction in manual data entry. The three-tier hierarchy takes shape.",
  },
  {
    year: "2024",
    quarter: "Q4",
    title: "Multi-currency and mobile money",
    description:
      "Support for 50+ currencies and mobile money integrations (M-Pesa, Airtel Money, Wave). Businesses in Africa and Southeast Asia can now use Xenboox natively.",
  },
  {
    year: "2025",
    quarter: "Q1",
    title: "Full agent roster",
    description:
      "Full agent roster complete — a three-tier AI hierarchy with a CFO Agent that talks to you, department heads that manage the work, and worker agents that execute. Every agent logs its reasoning.",
  },
  {
    year: "2025",
    quarter: "Q2",
    title: "Ready for production",
    description:
      "Full double-entry bookkeeping, real-time financial dashboards, automated month-end close, donor reporting, multi-currency support, and bank feed integration. The platform is live.",
  },
];

// ─── Team ────────────────────────────────────────────────────────────────────

const team = [
  {
    name: "Engineering",
    role: "Building the AI-native platform",
    description:
      "Full-stack engineers, AI/ML specialists, and infrastructure experts building the autonomous accounting platform.",
    icon: Code,
    count: "Core team",
  },
  {
    name: "Product & Design",
    role: "Making accounting feel simple",
    description:
      "Product designers and researchers making complex accounting workflows intuitive and accessible for everyone.",
    icon: Palette,
    count: "Core team",
  },
  {
    name: "AI & Agents",
    role: "Teaching machines to do accounting",
    description:
      "AI engineers building the LangGraph agent hierarchy — from CFO to worker agents — that powers autonomous accounting.",
    icon: Zap,
    count: "Core team",
  },
  {
    name: "Customer Success",
    role: "Ensuring every business succeeds",
    description:
      "Onboarding specialists, support engineers, and account managers helping businesses get the most from Xenboox.",
    icon: Headphones,
    count: "Growing",
  },
  {
    name: "Operations",
    role: "Running the business behind the scenes",
    description:
      "Finance, legal, compliance, and operations keeping Xenboox running smoothly as we scale.",
    icon: BarChart3,
    count: "Core team",
  },
  {
    name: "Security & Compliance",
    role: "Protecting your financial data",
    description:
      "Dedicated to SOC 2 compliance, data protection, and ensuring every transaction is secure and auditable.",
    icon: Lock,
    count: "Embedded",
  },
];

// ─── Investors (placeholder — update with real logos when available) ──────────

const investors = [
  { name: "Angel Investor", placeholder: "AI" },
  { name: "Seed Fund", placeholder: "SF" },
  { name: "Venture Partner", placeholder: "VP" },
];

// ─── Press (placeholder — update with real logos when available) ──────────────

const press = [
  { name: "TechCrunch", placeholder: "TC" },
  { name: "Forbes", placeholder: "FB" },
  { name: "Bloomberg", placeholder: "BL" },
  { name: "The Information", placeholder: "TI" },
  { name: "VentureBeat", placeholder: "VB" },
];

// ─── Customer Logos ──────────────────────────────────────────────────────────

const customers = [
  "Seagull Logistics",
  "SunuFresh Foods",
  "Atlantic Traders",
  "Kaira Clinics",
  "LS Consulting",
  "Gampetroleum Services",
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "About" }]}
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
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 100% at 50% -10%, rgba(59, 79, 224, 0.12), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 sm:py-16 lg:py-24 text-center">
            <FadeInUp delay={0.05}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Accounting should work{" "}
                <span className="text-primary">everywhere</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Most accounting software was built for one market and adapted
                for the rest. We built Xenboox differently — multi-currency,
                multi-entity, multi-jurisdiction from day one. Your books should
                work wherever you do business.
              </p>
            </FadeInUp>

            {/* Quick stats in hero */}
            <FadeInUp delay={0.15}>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">50+</strong> businesses
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">50+</strong> currencies
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">99.9%</strong> uptime
                </span>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ── Press Mentions ("As Seen In") ─────────────────────────────── */}
      <section className="border-y border-border bg-paper-2/60 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <LogoCloud title="As featured in" logos={press} variant="press" />
        </div>
      </section>

      {/* ── Mission Section ───────────────────────────────────────────── */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <FadeInUp>
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Give every business a finance team that works
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  Not everyone can afford a CFO, an accountant, and a payroll
                  specialist. But everyone deserves accurate books, clean
                  reports, and financial clarity.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Xenboox gives you AI agents that handle invoicing, payroll,
                  reconciliation, compliance, and month-end close — the work of
                  a full finance department, at a fraction of the cost.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]"
                  >
                    <stat.icon className="mb-3 h-8 w-8 text-primary" />
                    <div className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </Section>

      {/* ── Timeline Section ──────────────────────────────────────────── */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our story"
            title="How Xenboox came to be"
            lead="It started with a frustration every business owner knows."
          />

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="space-y-0">
              {timeline.map((item, index) => (
                <FadeInUp
                  key={`${item.year}-${item.quarter}`}
                  delay={index * 0.08}
                >
                  <div className="relative flex gap-6">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                        aria-label={`${item.year} ${item.quarter}`}
                      >
                        {item.quarter}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="mt-2 h-full w-0.5 bg-border" />
                      )}
                    </div>
                    <div className="pb-8">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.year}
                        </span>
                      </div>
                      <h3 className="mt-1 text-xl font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Founder Story Section ─────────────────────────────────────── */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-16 lg:grid-cols-5">
            <FadeInUp className="lg:col-span-2">
              <div className="sticky top-24">
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Why we built Xenboox
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  A personal note from the founder on the problem that started
                  it all.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1} className="lg:col-span-3">
              <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
                <p>
                  I spent years watching businesses — especially in emerging
                  markets — struggle with accounting software that was never
                  designed for them. Tools built in San Francisco for San
                  Francisco businesses, then awkwardly adapted for everywhere
                  else.
                </p>
                <p>
                  Multi-currency was an afterthought. Mobile money didn&apos;t
                  exist. Month-end close meant three days of manual work,
                  spreadsheet wrangling, and hoping nothing was missed. And the
                  &ldquo;AI features&rdquo; were just rule-based categorization
                  with a fancy label.
                </p>
                <p className="text-foreground font-medium">
                  I believed accounting could be fundamentally different.
                </p>
                <p>
                  What if AI didn&apos;t just suggest what to do — but actually
                  did the work? Categorized every transaction. Reconciled every
                  account. Closed the month in minutes, not days. And explained
                  every decision it made, in plain English, with a confidence
                  score you could trust.
                </p>
                <p>
                  That&apos;s why we built Xenboox. Not another SaaS tool with
                  40 pages and a sidebar. An AI-native platform where the AI
                  handles the work and humans make the decisions. A three-tier
                  agent hierarchy — a CFO that talks to you, department heads
                  that manage the work, and worker agents that execute. Every
                  action auditable. Every decision explainable.
                </p>
                <p>
                  We built for the world from day one. Multi-currency,
                  multi-entity, multi-jurisdiction. Whether you&apos;re in The
                  Gambia or New York, your books should work where you do
                  business.
                </p>
                <p className="text-foreground font-medium">
                  We&apos;re not done. But we&apos;re building something that
                  matters — and we&apos;d love for you to try it.
                </p>

                {/* Founder card */}
                <div className="flex items-center gap-4 pt-6 border-t border-border">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    XT
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      The Xenboox Team
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Founding team · Building AI-native accounting for the
                      world
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </Section>

      {/* ── Values Section ────────────────────────────────────────────── */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our values"
            title="What we believe in"
            lead="These principles guide every decision — from product design to customer support."
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value, index) => (
              <FadeInUp key={value.title} delay={index * 0.1}>
                <div className="group h-full rounded-2xl border border-border/60 bg-card p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Principles Section ────────────────────────────────────────── */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <FadeInUp>
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  How we build
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  These aren&apos;t just words on a wall. They&apos;re the
                  standards we hold ourselves to every day — because your
                  financial data demands it.
                </p>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="space-y-6">
                {principles.map((principle, index) => (
                  <div
                    key={principle.title}
                    className="rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ledger-ink text-sm font-bold text-paper">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {principle.title}
                        </h3>
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                          {principle.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>
        </div>
      </Section>

      {/* ── Team Section ──────────────────────────────────────────────── */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our team"
            title="Small team, big mission"
            lead="We're a focused team building something that matters — and we're hiring."
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((department, index) => (
              <FadeInUp key={department.name} delay={index * 0.08}>
                <div className="group h-full rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]">
                  <div className="flex items-start justify-between">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <department.icon className="h-6 w-6" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {department.count}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {department.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {department.role}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {department.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>

          {/* Careers CTA */}
          <FadeInUp delay={0.4}>
            <div className="mt-12 text-center">
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                <Briefcase className="h-4 w-4" />
                View open positions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </Section>

      {/* ── Investors & Backers ───────────────────────────────────────── */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="mx-auto max-w-2xl text-center mb-10">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Backed by believers
              </h2>
              <p className="mt-3 text-muted-foreground">
                We&apos;re funded by investors who share our vision for
                AI-native accounting.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <LogoCloud logos={investors} variant="investor" />
          </FadeInUp>
        </div>
      </Section>

      {/* ── Customer Trust Logos ──────────────────────────────────────── */}
      <section className="border-y border-border bg-paper-2/60 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <LogoCloud
            title="Trusted by finance teams across industries"
            logos={customers.map((name) => ({ name }))}
          />
        </div>
      </section>

      {/* ── Why Xenboox Section ───────────────────────────────────────── */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Xenboox" title="Why we're different" />

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <FadeInUp>
              <div className="h-full rounded-2xl border border-border bg-card p-8">
                <h3 className="mb-6 text-2xl font-bold text-foreground">
                  The old way
                </h3>
                <ul className="space-y-4">
                  {[
                    "Accounting software built for one market, adapted for everyone else",
                    "Month-end close that takes 3-5 days of manual work",
                    "Spreadsheets tracking what the software should handle",
                    "Hiring a full accounting team you can't afford",
                    "Multi-currency and mobile money as afterthoughts",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                      </span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <div className="h-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-balanced-green/5 p-8">
                <h3 className="mb-6 text-2xl font-bold text-foreground">
                  The Xenboox way
                </h3>
                <ul className="space-y-4">
                  {[
                    "AI agents that handle your books while you sleep",
                    "Month-end close in 10 minutes, not 5 days",
                    "Real-time dashboards that explain what the numbers mean",
                    "Multi-currency, mobile money, and bank feeds built in",
                    "Free tier so you can try before you commit",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="font-medium text-foreground">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          </div>
        </div>
      </Section>

      {/* ── Mission Statement ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-paper-2/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <FadeInUp>
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Every business deserves an accounting department that works around
              the clock. Xenboox gives you AI agents that handle invoicing,
              payroll, compliance, and close — so you can focus on growing your
              business, not managing your books.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInUp>
            <div className="relative overflow-hidden rounded-3xl bg-ledger-ink px-8 py-16 text-center sm:px-16 lg:py-20">
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 60% 90% at 80% 0%, rgba(59, 79, 224, 0.35), transparent 60%), radial-gradient(ellipse 50% 80% at 10% 100%, rgba(15, 113, 89, 0.25), transparent 60%)",
                }}
              />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl lg:text-5xl">
                  Ready to try Xenboox?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-paper/70">
                  Start free with 1 AI agent. No credit card required. See how
                  much time your accounting team can save.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 rounded-full shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/register">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/5 text-paper hover:bg-white/10 hover:text-paper transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/careers">View Careers</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/5 text-paper hover:bg-white/10 hover:text-paper transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </div>
                <p className="mt-5 text-sm text-paper/50">
                  No credit card required · Free tier available · Setup in
                  minutes
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </Section>
    </>
  );
}
