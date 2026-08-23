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
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui";
import { Section, SectionHeading } from "@/components/marketing/section";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import { FadeInUp } from "@/components/marketing/reveal";

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

const stats = [
  { value: "20+", label: "Accounting Modules", icon: Building2 },
  { value: "19", label: "AI Agents", icon: Zap },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
  { value: "50+", label: "Currencies Supported", icon: TrendingUp },
];

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

const timeline = [
  {
    year: "2024",
    title: "The problem hits home",
    description:
      "Watching businesses struggle with accounting software that doesn't fit their needs — tools built for one market, not the world. Month-end close takes days. Errors pile up. Nobody can afford a full accounting team.",
  },
  {
    year: "2024",
    title: "We start building",
    description:
      "Xenboox begins as a simple idea: what if AI could do the accounting? Not suggest what to do — actually do it. Categorize transactions, reconcile accounts, close the month, file compliance. All of it.",
  },
  {
    year: "2025",
    title: "19 agents, one platform",
    description:
      "We build a three-tier AI hierarchy — a CFO Agent that talks to you, department heads that manage the work, and worker agents that execute. Every agent logs its reasoning. Every action is auditable.",
  },
  {
    year: "2025",
    title: "Ready for production",
    description:
      "Full double-entry bookkeeping, real-time financial dashboards, automated month-end close, donor reporting, multi-currency support, and bank feed integration. The platform is live.",
  },
];

const team = [
  {
    name: "Engineering",
    description:
      "Building the AI-native platform that powers modern accounting",
    icon: Zap,
  },
  {
    name: "Product & Design",
    description: "Making complex accounting feel simple and intuitive",
    icon: Target,
  },
  {
    name: "Customer Success",
    description: "Ensuring every business succeeds with Xenboox",
    icon: Users,
  },
];

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "About" }]}
      />
      {/* Hero Section */}
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
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 sm:py-16 text-center">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                About Xenboox
              </span>
            </FadeInUp>
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
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <FadeInUp>
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Our Mission
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Give every business a world-class finance team
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  Not everyone can afford a CFO, an accountant, and a payroll
                  specialist. But everyone deserves accurate books, clean
                  reports, and financial clarity.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Xenboox gives you 19 AI agents that handle invoicing, payroll,
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
                    className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5"
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

      {/* Timeline Section */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our story"
            title="How Xenboox came to be"
            lead="It started with a frustration every business owner knows."
          />

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <FadeInUp key={item.year + item.title} delay={index * 0.1}>
                  <div className="relative flex gap-6">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {item.year.slice(-2)}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="mt-2 h-full w-0.5 bg-border" />
                      )}
                    </div>
                    <div className="pb-8">
                      <h3 className="text-xl font-semibold text-foreground">
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

      {/* Values Section */}
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
                <div className="group h-full rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 text-white shadow-lg">
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

      {/* Principles Section */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <FadeInUp>
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Star className="h-3.5 w-3.5" />
                  Our Principles
                </span>
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
                    className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-foreground/5"
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

      {/* Team Section */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our team"
            title="Small team, big mission"
            lead="We're a focused team building something that matters — and we're hiring."
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((department, index) => (
              <FadeInUp key={department.name} delay={index * 0.1}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
                    <department.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {department.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {department.description}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Why Xenboox Section */}
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
              <div className="h-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-500/5 p-8">
                <h3 className="mb-6 text-2xl font-bold text-foreground">
                  The Xenboox way
                </h3>
                <ul className="space-y-4">
                  {[
                    "19 AI agents that handle your books while you sleep",
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

      {/* Mission Statement */}
      <section className="border-y border-border bg-paper-2/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <FadeInUp>
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Every business deserves an accounting department that works around
              the clock. Xenboox gives you 19 AI agents that handle invoicing,
              payroll, compliance, and close — so you can focus on growing your
              business, not managing your books.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* CTA Section */}
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
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/register">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-paper hover:bg-white/10 hover:text-paper"
                  >
                    <Link href="/careers">View Careers</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-paper hover:bg-white/10 hover:text-paper"
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
