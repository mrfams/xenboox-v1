"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe,
  Clock,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Bot,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui";
import {
  Section,
  SectionHeading,
  CheckItem,
} from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import { Cta } from "@/components/marketing/cta";

// Animated counter component
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Feature showcase sections
const featureSections = [
  {
    id: "automation",
    eyebrow: "AI Automation",
    title: "Your accounting runs itself",
    description:
      "Stop doing repetitive data entry. Our AI learns your business patterns and handles the routine work — while you focus on strategy.",
    features: [
      "Automated transaction categorization",
      "Smart bank reconciliation",
      "Invoice processing with OCR",
      "Anomaly detection and alerts",
    ],
    visual: (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl shadow-foreground/5">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-error-clay/70" />
          <div className="h-3 w-3 rounded-full bg-attention-amber/70" />
          <div className="h-3 w-3 rounded-full bg-balanced-green/70" />
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Invoice INV-2847",
              status: "Processed",
              time: "2s",
              color: "text-balanced-green",
            },
            {
              label: "Bank reconciliation",
              status: "Running",
              time: "45s",
              color: "text-primary",
            },
            {
              label: "Payroll batch #142",
              status: "Queued",
              time: "—",
              color: "text-attention-amber",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
              <span className={`text-xs font-medium ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-balanced-green/20 bg-balanced-green/10 p-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-balanced-green" />
            <span className="text-sm text-balanced-green">
              AI suggests: Categorize as &quot;Office Supplies&quot;
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "reporting",
    eyebrow: "Financial Reporting",
    title: "Insights that drive decisions",
    description:
      "Real-time financial reports generated automatically. P&L, balance sheet, cash flow — always up to date, always accurate.",
    features: [
      "Real-time P&L and Balance Sheet",
      "Cash flow forecasting",
      "Custom report builder",
      "Export to PDF, Excel, CSV",
    ],
    visual: (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl shadow-foreground/5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Financial Overview</h4>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-4">
          {[
            {
              label: "Revenue",
              value: "$284,500",
              change: "+12%",
              positive: true,
            },
            {
              label: "Expenses",
              value: "$142,300",
              change: "-8%",
              positive: true,
            },
            {
              label: "Net Profit",
              value: "$142,200",
              change: "+24%",
              positive: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p
                className={`text-xs font-medium ${stat.positive ? "text-balanced-green" : "text-error-clay"}`}
              >
                {stat.change}
              </p>
            </div>
          ))}
        </div>
        <div className="flex h-32 items-end gap-1">
          {[40, 55, 45, 60, 50, 65, 55, 70, 60, 75, 65, 80].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-primary to-indigo-500"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "multi-currency",
    eyebrow: "Multi-Currency",
    title: "Global business, local expertise",
    description:
      "Handle transactions in any currency with automatic exchange rates. Perfect for businesses operating across borders.",
    features: [
      "50+ currencies supported",
      "Real-time exchange rates",
      "Automatic conversion",
      "Multi-currency reporting",
    ],
    visual: (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl shadow-foreground/5">
        <h4 className="mb-4 font-semibold text-foreground">
          Currency Dashboard
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { currency: "USD", flag: "🇺🇸", rate: "1.00", change: "+0.2%" },
            { currency: "GBP", flag: "🇬🇧", rate: "0.79", change: "-0.1%" },
            { currency: "GMD", flag: "🇬🇲", rate: "53.20", change: "+0.8%" },
            { currency: "EUR", flag: "🇪🇺", rate: "0.92", change: "+0.3%" },
          ].map((item) => (
            <div key={item.currency} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.flag}</span>
                <span className="font-medium text-foreground">
                  {item.currency}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                1 USD = {item.rate}
              </p>
              <p className="text-xs text-balanced-green">{item.change}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "security",
    eyebrow: "Security",
    title: "Your data, protected",
    description:
      "Enterprise-grade security built in from day one. Your financial data is encrypted, isolated, and auditable.",
    features: [
      "End-to-end encryption",
      "Role-based access control",
      "Complete audit trail",
      "SOC 2 compliant",
    ],
    visual: (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl shadow-foreground/5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-balanced-green/20">
            <Shield className="h-5 w-5 text-balanced-green" />
          </div>
          <div>
            <p className="font-medium text-foreground">Security Score</p>
            <p className="text-sm text-balanced-green">Excellent</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Encryption at rest", status: true },
            { label: "Encryption in transit", status: true },
            { label: "Audit logging", status: true },
            { label: "Access controls", status: true },
            { label: "Data isolation", status: true },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
            >
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
              <Check className="h-4 w-4 text-balanced-green" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime SLA" },
  { value: 50, suffix: "+", label: "Currencies" },
  { value: 256, suffix: "-bit", label: "Encryption" },
  { value: 24, suffix: "/7", label: "Support" },
];

const testimonials = [
  {
    quote:
      "Xenboox transformed how we handle accounting. What used to take days now happens automatically.",
    author: "Sarah Chen",
    role: "CFO, TechStart Inc.",
  },
  {
    quote:
      "The AI automation is incredible. It's like having a full accounting team working around the clock.",
    author: "Michael Okafor",
    role: "Finance Director, Lagos Ventures",
  },
  {
    quote:
      "Finally, accounting software that understands multi-currency. Game changer for our global operations.",
    author: "Emma Johansson",
    role: "Controller, Nordic Trading Co.",
  },
];

export default function FeaturesPage() {
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
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-20 text-center sm:py-24 lg:py-28">
            <FadeInUp>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Platform features
              </span>
            </FadeInUp>
            <FadeInUp delay={0.05}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Accounting that{" "}
                <span className="text-primary">thinks for itself</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                The first accounting platform where AI handles the work.
                Automated reconciliations, intelligent categorization, and
                real-time insights — so you can focus on growing your business.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.15}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/onboarding">
                    Start Building Free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/register">Start Free Trial</Link>
                </Button>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                      />
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
      </section>

      {/* Feature Sections */}
      {featureSections.map((section, index) => (
        <section
          key={section.id}
          className={`${index % 2 === 0 ? "bg-paper" : "bg-paper-2/60"} py-20 sm:py-24 lg:py-28`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid items-center gap-16 lg:grid-cols-2 ${
                index % 2 === 1 ? "lg:grid-flow-dense" : ""
              }`}
            >
              {/* Content */}
              <FadeInUp className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                <div className="flex flex-col items-start gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {section.eyebrow}
                  </span>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {section.features.map((feature) => (
                      <CheckItem key={feature}>{feature}</CheckItem>
                    ))}
                  </ul>
                </div>
              </FadeInUp>

              {/* Visual */}
              <FadeInUp
                delay={0.15}
                className={index % 2 === 1 ? "lg:col-start-1" : ""}
              >
                <div className="relative">
                  <div
                    className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-emerald-500/10 blur-xl"
                    aria-hidden="true"
                  />
                  <div className="relative">{section.visual}</div>
                </div>
              </FadeInUp>
            </div>
          </div>
        </section>
      ))}

      {/* Bento Grid */}
      <Section className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Everything included"
            title={
              <>
                Everything you need,{" "}
                <span className="text-primary">nothing you don&apos;t</span>
              </>
            }
            lead="Built for modern finance teams who want powerful tools without the complexity."
          />

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CreditCard,
                title: "Accounts Payable",
                description: "Automate bill processing and payments",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                icon: TrendingUp,
                title: "Accounts Receivable",
                description: "Track invoices and collect payments faster",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: FileText,
                title: "Document AI",
                description: "Extract data from receipts and invoices",
                gradient: "from-violet-500 to-violet-600",
              },
              {
                icon: Globe,
                title: "Multi-Entity",
                description: "Manage multiple businesses in one place",
                gradient: "from-amber-500 to-amber-600",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Role-based access and approval workflows",
                gradient: "from-pink-500 to-pink-600",
              },
              {
                icon: Clock,
                title: "Real-Time Sync",
                description: "Updates across all devices instantly",
                gradient: "from-cyan-500 to-cyan-600",
              },
            ].map((item) => (
              <FadeInUp key={item.title}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}
                  >
                    <item.icon className="h-6 w-6" />
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
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="bg-paper-2/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Trusted by finance teams worldwide"
            lead="Hear from the teams that run their books with Xenboox."
          />

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <FadeInUp key={index} delay={index * 0.1}>
                <div className="h-full rounded-2xl border border-border bg-card p-8 shadow-sm">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-attention-amber text-attention-amber"
                      />
                    ))}
                  </div>
                  <blockquote className="leading-relaxed text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 text-sm font-semibold text-white">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {testimonial.author}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Cta />
    </>
  );
}
