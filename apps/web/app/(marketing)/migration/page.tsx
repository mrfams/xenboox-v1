"use client";

import Link from "next/link";
import {
  ArrowRight,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const steps = [
  {
    icon: Upload,
    title: "1. Export your data",
    desc: "Export your chart of accounts, customers, vendors, and transactions from QuickBooks or Xero as CSV/Excel files.",
  },
  {
    icon: FileText,
    title: "2. Upload to Xenboox",
    desc: "Drag and drop your files into the import wizard. The AI maps your data to Xenboox's schema automatically.",
  },
  {
    icon: CheckCircle2,
    title: "3. Review & confirm",
    desc: "Review the AI's mapping suggestions. Confirm or adjust before importing. The AI learns from your corrections.",
  },
  {
    icon: Zap,
    title: "4. Start using Xenboox",
    desc: "Your data is live. The 19 AI agents start working immediately — categorizing, reconciling, and forecasting.",
  },
];

const platforms = [
  {
    name: "QuickBooks",
    imports: [
      "Chart of Accounts",
      "Customers & Vendors",
      "Invoices & Bills",
      "Journal Entries",
      "Bank Transactions",
      "Products & Services",
    ],
    time: "~5 minutes",
  },
  {
    name: "Xero",
    imports: [
      "Chart of Accounts",
      "Contacts",
      "Invoices & Bills",
      "Manual Journals",
      "Bank Transactions",
      "Fixed Assets",
    ],
    time: "~5 minutes",
  },
  {
    name: "Spreadsheets",
    imports: [
      "Chart of Accounts",
      "Transaction History",
      "Customer Lists",
      "Vendor Lists",
      "Custom Data",
    ],
    time: "~10 minutes",
  },
];

export default function MigrationPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "Migration" }]}
      />

      {/* Hero */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            {" "}
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Switch in minutes, not months.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Import your data from QuickBooks, Xero, or spreadsheets. The AI
              maps everything automatically. Your team can start using Xenboox
              today.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              How migration works
            </h2>
          </FadeInUp>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.map((step, i) => (
              <FadeInUp key={step.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-blue-900/40 mb-4">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-16 bg-paper-2/60">
        <div className="mx-auto max-w-5xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              What we import
            </h2>
          </FadeInUp>
          <div className="grid gap-6 sm:grid-cols-3">
            {platforms.map((platform, i) => (
              <FadeInUp key={platform.name} delay={i * 0.1}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    From {platform.name}
                  </h3>
                  <ul className="space-y-2 mb-4">
                    {platform.imports.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-balanced-green shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Typical migration: {platform.time}
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInUp>
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              {[
                {
                  icon: Shield,
                  title: "Data stays yours",
                  desc: "Import is read-only. Your original data is never modified.",
                },
                {
                  icon: Clock,
                  title: "No downtime",
                  desc: "Import in the background while your team keeps working.",
                },
                {
                  icon: CheckCircle2,
                  title: "Verified import",
                  desc: "Row counts and balances are verified before go-live.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground text-sm">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-foreground">
              Ready to switch?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start your free migration today. No credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Migration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
