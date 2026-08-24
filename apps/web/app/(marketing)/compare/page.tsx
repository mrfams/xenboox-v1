"use client";

import Link from "next/link";
import { ArrowRight, Bot, Check, X } from "lucide-react";
import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const comparisons = [
  {
    name: "Xenboox vs QuickBooks",
    slug: "quickbooks",
    tagline: "AI workforce vs manual forms",
    highlights: [
      "19 AI agents vs 0",
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
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              See how we compare
            </span>
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

      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {comparisons.map((comp, i) => (
              <FadeInUp key={comp.slug} delay={i * 0.1}>
                <Link
                  href={`/compare/${comp.slug}`}
                  aria-label={`Compare Xenboox vs ${comp.slug}`}
                  className="group block rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {comp.name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {comp.tagline}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {comp.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check
                          className="h-4 w-4 text-emerald-500 shrink-0"
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

          <FadeInUp delay={0.25}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link
                href="/pricing"
                className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-5 font-medium text-foreground hover:bg-accent/50 transition-colors"
              >
                View pricing
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing#compare"
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Quick comparison table
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
