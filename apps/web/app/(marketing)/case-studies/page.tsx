"use client";

import Link from "next/link";
import { ArrowRight, Clock, TrendingUp, Users, Building2 } from "lucide-react";

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

export default function CaseStudiesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Case Studies" }]}
      />

      {/* Hero */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            {" "}
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Real teams. Real results.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              How businesses in The Gambia close their books in days, recover
              overdue invoices, and automate payroll — with AI agents.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4 space-y-12">
          {caseStudies.map((study, i) => (
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
                  <blockquote className="text-foreground leading-relaxed mb-6">
                    &ldquo;{study.quote}&rdquo;
                  </blockquote>
                  <p className="text-sm text-muted-foreground mb-4">
                    — {study.author}, {study.role}
                  </p>

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
          ))}
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
