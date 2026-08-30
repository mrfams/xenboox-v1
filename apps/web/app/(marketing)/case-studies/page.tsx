"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  TrendingUp,
  Users,
  Building2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const caseStudies = [
  {
    company: "Seagull Logistics",
    industry: "Freight & Customs",
    location: "Banjul",
    logo: "SL",
    metric: "4 days",
    metricLabel: "month-end close (was 3 weeks)",
    quote:
      "We closed our first month in four days. Previously it took three weeks and two accountants. The close checklist alone is worth the subscription.",
    author: "Fatoumata Ceesay",
    role: "CFO",
    highlights: [
      "Month-end close reduced from 3 weeks to 4 days",
      "2 accountants freed for advisory work",
      "Zero missed NAPSA filings since switching",
    ],
  },
  {
    company: "SunuFresh Foods",
    industry: "FMCG Distribution",
    location: "Serekunda",
    logo: "SF",
    metric: "GMD 1.8M",
    metricLabel: "overdue invoices recovered",
    quote:
      "The agents chased down GMD 1.8M in overdue invoices while we slept. I just reviewed and approved the follow-ups over breakfast.",
    author: "Musa Jallow",
    role: "Founder",
    highlights: [
      "GMD 1.8M in overdue invoices recovered automatically",
      "Payment follow-ups sent without manual intervention",
      "Cash flow improved by 40% within 2 months",
    ],
  },
  {
    company: "Kaira Clinics",
    industry: "Healthcare",
    location: "Kanifing",
    logo: "KC",
    metric: "100%",
    metricLabel: "on-time payroll for 34 staff",
    quote:
      "Payroll used to be a spreadsheet nightmare. Now I click once, review the confidence scores, and every payslip is delivered. No more statutory surprises.",
    author: "Amina Draboe",
    role: "Ops Lead",
    highlights: [
      "34 staff paid on time, every time",
      "NAPSA and PAYE calculated automatically",
      "Payroll processing time reduced from 2 days to 15 minutes",
    ],
  },
  {
    company: "Atlantic Traders",
    industry: "Import/Export",
    location: "Banjul",
    logo: "AT",
    metric: "50+",
    metricLabel: "currencies reconciled automatically",
    quote:
      "Multi-currency used to eat hours every week. Now the AI reconciles USD, EUR, and GMD automatically. I just review the exchange rates each morning.",
    author: "Omar Darboe",
    role: "Finance Director",
    highlights: [
      "50+ currencies handled automatically",
      "Exchange rate reconciliation reduced from 5 hours/week to 10 minutes",
      "Multi-entity consolidation in one dashboard",
    ],
  },
];

const industries = [
  "All",
  "Freight & Customs",
  "FMCG Distribution",
  "Healthcare",
  "Import/Export",
];

const aggregateStats = [
  { value: "80%", label: "Faster month-end close" },
  { value: "GMD 1.8M", label: "Overdue invoices recovered" },
  { value: "100%", label: "On-time payroll" },
  { value: "50+", label: "Currencies automated" },
];

export default function CaseStudiesPage() {
  const [activeIndustry, setActiveIndustry] = useState("All");
  const filtered =
    activeIndustry === "All"
      ? caseStudies
      : caseStudies.filter((s) => s.industry === activeIndustry);

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Case Studies" }]}
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
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-24 text-center">
          <FadeInUp>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Real teams. Real results.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              How businesses close their books in days, recover overdue
              invoices, and automate payroll — with AI agents.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Aggregate Stats */}
      <section className="border-y border-border bg-paper-2/60 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {aggregateStats.map((stat, i) => (
              <FadeInUp key={stat.label} delay={i * 0.08}>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Filter */}
      <section className="bg-background py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {industries.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setActiveIndustry(ind)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  activeIndustry === ind
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4 space-y-12">
          {filtered.length === 0 ? (
            <FadeInUp>
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">
                  No case studies in this industry yet. Check back soon!
                </p>
              </div>
            </FadeInUp>
          ) : (
            filtered.map((study, i) => (
              <FadeInUp key={study.company} delay={i * 0.1}>
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:border-border/40">
                  {/* Header */}
                  <div className="flex items-center gap-4 border-b border-border/50 bg-muted/20 px-6 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {study.logo}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {study.company}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {study.industry} · {study.location}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-primary">
                        {study.metric}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {study.metricLabel}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className="h-4 w-4 fill-attention-amber text-attention-amber"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>
                    <blockquote className="text-foreground leading-relaxed mb-4">
                      &ldquo;{study.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {study.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {study.author}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {study.role}, {study.company}
                        </p>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Key Results
                    </h3>
                    <ul className="space-y-2">
                      {study.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <TrendingUp className="h-4 w-4 text-balanced-green mt-0.5 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeInUp>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-foreground">
              Ready to write your success story?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with the free tier. No credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
