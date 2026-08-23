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
import { FadeInUp } from "@/components/marketing/reveal";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We exist to give every business access to world-class financial tools. Not just the enterprises that can afford consultants — everyone.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description:
      "Our AI explains its reasoning. Our pricing is simple. Our roadmap is public. We believe trust is earned through openness.",
  },
  {
    icon: Heart,
    title: "Obsessive Quality",
    description:
      "Accounting demands precision. We ship nothing that isn't thoroughly tested, reviewed, and validated. Accuracy isn't a feature — it's a requirement.",
  },
  {
    icon: Users,
    title: "Customer-Obsessed",
    description:
      "We talk to our users weekly. We ship what they need, not what we think they want. Their success is our success.",
  },
  {
    icon: Zap,
    title: "Move with Purpose",
    description:
      "We're fast but not reckless. Every decision is deliberate. We ship iteratively, learn constantly, and never stop improving.",
  },
  {
    icon: Globe,
    title: "Global by Design",
    description:
      "Built for businesses operating across borders from day one. Multi-currency, multi-jurisdiction, multi-language — not bolted on later.",
  },
];

const stats = [
  { value: "20+", label: "Accounting Modules", icon: Building2 },
  { value: "19", label: "AI Agents", icon: Zap },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
  { value: "50+", label: "Currencies", icon: TrendingUp },
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
      "Powerful doesn't mean complicated. We relentlessly simplify complex accounting workflows so you can focus on what matters.",
  },
  {
    title: "Security over convenience",
    description:
      "We never compromise on data protection. End-to-end encryption, role-based access, complete audit trails — non-negotiable.",
  },
  {
    title: "Transparency over marketing",
    description:
      "No buzzwords. No black boxes. We explain exactly how our AI works, what it costs, and how it helps your business.",
  },
];

const team = [
  {
    name: "Engineering",
    description: "Building the platform that powers modern accounting",
    icon: Zap,
  },
  {
    name: "Product & Design",
    description: "Designing experiences that make complex simple",
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
                The future of finance,{" "}
                <span className="text-primary">built today</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                We&apos;re building the accounting platform that every business
                deserves — AI agents that handle the books, so you can focus on
                growing your business.
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
                  Make world-class accounting accessible to every business
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  Most accounting software was built for Western enterprises.
                  Multi-currency, mobile money, and varying tax regimes are
                  afterthoughts — not core features.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Xenboox flips that. Built for businesses operating across
                  borders from day one, with AI agents that handle the daily
                  accounting grind automatically.
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

      {/* Values Section */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our values"
            title="What we believe in"
            lead="These principles guide every decision we make, from product design to customer support."
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
      <Section className="bg-paper-2/60">
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
                  standards we hold ourselves to every day.
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
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our team"
            title="The people behind Xenboox"
            lead="A small, focused team with big ambitions. We're building something that matters."
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
      <Section className="bg-paper-2/60">
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
                    "Manual data entry and reconciliation",
                    "Spreadsheet-based tracking",
                    "Month-end chaos and errors",
                    "Expensive consultants and software",
                    "One-size-fits-all Western solutions",
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
                    "AI-powered automation that learns your business",
                    "Real-time financial dashboards",
                    "Automated month-end close",
                    "Transparent, affordable pricing",
                    "Built for global businesses from day one",
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
      <section className="border-y border-border bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <FadeInUp>
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Every business deserves an accounting department that works around
              the clock. Xenboox gives you 19 AI agents that handle invoicing,
              payroll, compliance, and close — so you can focus on what matters.
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
                  Join us on this journey
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-paper/70">
                  We&apos;re building the future of accounting. Whether
                  you&apos;re a customer, partner, or future team member —
                  we&apos;d love to connect.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/onboarding">
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
