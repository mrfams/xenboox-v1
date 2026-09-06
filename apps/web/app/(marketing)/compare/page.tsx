"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import {
  FeatureComparison,
  type ComparisonCategory,
} from "@/components/marketing/feature-comparison";
import { LogoCloud } from "@/components/marketing/logo-cloud";

const comparisons = [
  {
    name: "Xenboox vs QuickBooks",
    slug: "quickbooks",
    tagline: "AI workforce vs manual forms",
    highlights: [
      "AI agents vs 0",
      "Multi-currency built-in",
      "Unlimited users",
    ],
  },
  {
    name: "Xenboox vs Xero",
    slug: "xero",
    tagline: "AI-native vs traditional accounting",
    highlights: [
      "AI agents vs dashboards",
      "50+ currencies",
      "Multi-jurisdiction tax",
    ],
  },
  {
    name: "Xenboox vs FreshBooks",
    slug: "freshbooks",
    tagline: "Full accounting suite vs invoicing tool",
    highlights: [
      "Double-entry bookkeeping",
      "AI agents included",
      "Multi-entity support",
    ],
  },
  {
    name: "Xenboox vs Wave",
    slug: "wave",
    tagline: "AI automation vs free basic software",
    highlights: [
      "AI agents vs manual entry",
      "50+ currencies",
      "Enterprise-grade security",
    ],
  },
];

const featureMatrix: ComparisonCategory[] = [
  {
    name: "AI & Automation",
    features: [
      {
        name: "Books that run themselves",
        values: [true, false, false, false],
      },
      {
        name: "Month-end close automation",
        values: [true, false, false, false],
      },
      {
        name: "Approvals with evidence",
        values: [true, false, false, false],
      },
      { name: "Anomaly detection", values: [true, "Add-on", false, false] },
    ],
  },
  {
    name: "Core Accounting",
    features: [
      { name: "Double-entry bookkeeping", values: [true, true, true, true] },
      { name: "Bank reconciliation", values: [true, true, true, "Basic"] },
      { name: "Invoicing", values: [true, true, true, true] },
      { name: "Payroll processing", values: [true, true, "Add-on", "Add-on"] },
    ],
  },
  {
    name: "Multi-Currency & Global",
    features: [
      {
        name: "Multi-currency (50+)",
        values: [true, "Add-on", "Standard+", false],
      },
      { name: "Multi-entity support", values: [true, false, false, false] },
      { name: "Mobile money integration", values: [true, false, false, false] },
      {
        name: "Multi-jurisdiction tax",
        values: [true, false, "Limited", false],
      },
    ],
  },
  {
    name: "Pricing & Users",
    features: [
      { name: "Free tier", values: [true, false, false, true] },
      {
        name: "Unlimited users",
        values: [true, "Per-seat", "Per-seat", "Limited"],
      },
      { name: "Starting price", values: ["$0", "$30/mo", "$15/mo", "Free"] },
      { name: "Enterprise plan", values: [true, true, true, false] },
    ],
  },
];

const switchReasons = [
  {
    from: "QuickBooks",
    reason:
      "Close automation and approvals with evidence — not another reconcile-by-hand month.",
  },
  {
    from: "Xero",
    reason: "Multi-currency and mobile money from day one, not as add-ons.",
  },
  {
    from: "Wave",
    reason: "Books that run themselves, with a human approving what matters.",
  },
];

export default function CompareIndexPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Compare" }]}
      />

      <section className="bg-paper py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            {" "}
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Compare Xenboox
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              See how Xenboox stacks up against traditional accounting software.
              AI-native automation vs manual processes.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Individual Comparison Cards */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                Detailed comparisons
              </h2>
              <p className="mt-2 text-muted-foreground">
                Deep-dive into how Xenboox compares to each competitor.
              </p>
            </div>
          </FadeInUp>

          <div className="grid gap-6 sm:grid-cols-2">
            {comparisons.map((comp, i) => (
              <FadeInUp key={comp.slug} delay={i * 0.08}>
                <Link
                  href={`/compare/${comp.slug}`}
                  aria-label={`Compare Xenboox vs ${comp.slug}`}
                  className="group block rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:-translate-y-1 hover:border-border/40"
                >
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {comp.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {comp.tagline}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {comp.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check
                          className="h-4 w-4 text-balanced-green shrink-0"
                          aria-hidden="true"
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    See comparison
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <FeatureComparison
        title="Feature-by-feature comparison"
        subtitle="See exactly what you get with each platform — no marketing fluff."
        columns={["Xenboox", "QuickBooks", "Xero", "Wave"]}
        highlightColumn={0}
        categories={featureMatrix}
        links={[
          { label: "vs QuickBooks", href: "/compare/quickbooks" },
          { label: "vs Xero", href: "/compare/xero" },
        ]}
      />

      {/* Social Proof */}
      <section className="py-16 bg-paper-2/60 border-t border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <FadeInUp>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Why teams switch to Xenboox
            </h2>
            <p className="mt-3 text-muted-foreground">
              The reasons teams leave traditional software behind.
            </p>
          </div>
        </FadeInUp>

          <div className="grid gap-6 md:grid-cols-3">
            {switchReasons.map((item, i) => (
              <FadeInUp key={item.from} delay={i * 0.1}>
                <div className="rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    From {item.from}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {item.reason}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-background border-t border-border">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Ready to switch?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. White-glove migration from QuickBooks, Xero, or Wave included.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center rounded-full border border-border bg-card px-8 text-sm font-medium text-foreground transition-all duration-300 hover:bg-accent/50"
              >
                View Pricing
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
