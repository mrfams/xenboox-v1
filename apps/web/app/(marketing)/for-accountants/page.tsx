"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Shield,
  Users,
  BarChart3,
  FileText,
  Zap,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const benefits = [
  {
    icon: Bot,
    title: "AI handles the busywork",
    desc: "19 AI agents automate data entry, categorization, reconciliation, and month-end close. Your team focuses on advisory, not admin.",
  },
  {
    icon: Users,
    title: "Unlimited clients, no per-seat fees",
    desc: "Manage all your client entities from one dashboard. No extra charges per client or per user — flat monthly pricing.",
  },
  {
    icon: BarChart3,
    title: "Multi-entity consolidation",
    desc: "Run consolidated financials across all client entities. Multi-currency, multi-jurisdiction tax, all in one place.",
  },
  {
    icon: Shield,
    title: "Audit-ready by default",
    desc: "Every transaction has an append-only audit trail. Confidence-scored AI decisions. Period lock enforcement. SOC 2 ready.",
  },
  {
    icon: FileText,
    title: "Automated reporting",
    desc: "AI-generated P&L, balance sheet, cash flow, and custom reports. Delivered to clients on schedule — no manual preparation.",
  },
  {
    icon: Zap,
    title: "Client portal included",
    desc: "Each client gets a read-only portal to view their financials, download reports, and track projects. No extra setup.",
  },
];

const comparison = [
  {
    feature: "AI-powered automation",
    xenboox: true,
    quickbooks: false,
    xero: false,
  },
  {
    feature: "Multi-entity from one dashboard",
    xenboox: true,
    quickbooks: "Enterprise only",
    xero: "Add-on ($)",
  },
  {
    feature: "Unlimited users & clients",
    xenboox: true,
    quickbooks: "Per-seat pricing",
    xero: "Per-seat pricing",
  },
  {
    feature: "Multi-currency built-in",
    xenboox: true,
    quickbooks: "Paid add-on",
    xero: "Standard+",
  },
  {
    feature: "Month-end close automation",
    xenboox: true,
    quickbooks: false,
    xero: false,
  },
  {
    feature: "Confidence-scored AI decisions",
    xenboox: true,
    quickbooks: false,
    xero: false,
  },
  {
    feature: "Client portal included",
    xenboox: true,
    quickbooks: false,
    xero: false,
  },
  {
    feature: "Free tier for small practices",
    xenboox: true,
    quickbooks: false,
    xero: false,
  },
];

export default function ForAccountantsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "For Accountants" }]}
      />

      {/* Hero */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              Built for accounting firms
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Stop doing busywork.
              <br />
              <span className="text-blue-600">Start advising.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Xenboox gives your firm 19 AI agents that handle bookkeeping,
              payroll, compliance, and close — so your team can focus on what
              clients actually pay for: strategic advice.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/compare"
                className="inline-flex h-12 items-center rounded-xl border border-border px-8 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
              >
                See How We Compare
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="mx-auto max-w-6xl px-4">
          <FadeInUp>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Why firms switch to Xenboox
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Your team is too skilled for data entry. Let the AI handle the
                repetitive work while your accountants deliver higher-value
                advisory services.
              </p>
            </div>
          </FadeInUp>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item, i) => (
              <FadeInUp key={item.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-6 h-full">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 mb-4">
                    <item.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Xenboox vs traditional accounting software
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              Purpose-built for firms that manage multiple clients.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Feature
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-blue-600">
                      Xenboox
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                      QuickBooks
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                      Xero
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2.5 text-foreground">
                        {row.feature}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.xenboox === true ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">
                            {row.xenboox}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.quickbooks === true ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : row.quickbooks === false ? (
                          <span className="text-red-400">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {row.quickbooks}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.xero === true ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : row.xero === false ? (
                          <span className="text-red-400">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {row.xero}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInUp>
            <blockquote className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-lg text-foreground leading-relaxed">
                &ldquo;We manage 40 client entities. Before Xenboox, month-end
                close took two weeks of my team&rsquo;s time. Now it takes three
                days — and the AI does most of the work.&rdquo;
              </p>
              <footer className="mt-6">
                <p className="font-semibold text-foreground">Omar Darboe</p>
                <p className="text-sm text-muted-foreground">
                  Finance Director, Atlantic Traders
                </p>
              </footer>
            </blockquote>
          </FadeInUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-foreground">
              Ready to automate your firm?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with the free tier. No credit card required. Upgrade when
              you&rsquo;re ready.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex h-12 items-center rounded-xl border border-border px-8 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
              >
                Read the Guide
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
