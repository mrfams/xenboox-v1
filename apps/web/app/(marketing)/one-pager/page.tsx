import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Globe,
  Shield,
  Zap,
  Users,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { PrintButton } from "@/components/marketing/print-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox — AI-Native Accounting Platform | One-Pager",
  description:
    "AI agents handle invoicing, payroll, compliance, and close. Multi-currency, multi-entity, bank-grade security. Start free.",
  openGraph: {
    title: "Xenboox — AI-Native Accounting Platform",
    description: "AI agents handle invoicing, payroll, compliance, and close.",
    url: "https://xenboox.com/one-pager",
    siteName: "Xenboox",
    type: "website",
  },
};

const features = [
  "Invoicing, payroll, compliance, and close — handled",
  "Multi-currency and mobile-money support",
  "Unlimited users and entities on all paid plans",
  "Append-only audit trail on every posting",
  "Month-end close automation",
  "Real-time bank feed synchronization",
  "Client portal for external stakeholders",
  "Audit-ready exports",
];

const stats = [
  { value: "100%", label: "Postings audit-trailed" },
  { value: "0", label: "Data entry required" },
  { value: "1", label: "Queue for every decision" },
  { value: "99.9%", label: "Uptime SLA" },
];

const earlySectors = [
  { name: "Logistics & freight" },
  { name: "Food distribution" },
  { name: "Clinics & healthcare" },
  { name: "Import & export" },
  { name: "Professional services" },
];

export default function OnePagerPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: "Home", url: "/" }, { name: "One-Pager" }]}
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
              Your books. On autopilot.
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              AI agents handle invoicing, payroll, compliance, and month-end
              close — so you can focus on growing your business.
            </p>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
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

      {/* Who it's for */}
      <section className="border-y border-border bg-paper-2/60 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <LogoCloud
            title="Built for teams like yours"
            logos={earlySectors}
          />
        </div>
      </section>

      {/* What is Xenboox */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <div className="rounded-2xl border border-border bg-card p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                What is Xenboox?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Xenboox is an AI-native accounting platform built for businesses
                in The Gambia and emerging markets. Instead of giving you forms
                to fill out, it handles the accounting work — from invoicing
                and payroll to compliance and month-end close. Uncertain work
                escalates to you with its evidence attached.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-balanced-green mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 bg-paper-2/60">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Who is Xenboox for?
            </h2>
          </FadeInUp>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Businesses",
                desc: "Growing companies that need real accounting without hiring a full finance team.",
              },
              {
                icon: Bot,
                title: "Accounting Firms",
                desc: "Practices managing multiple client entities — unlimited clients, no per-seat fees.",
              },
              {
                icon: Globe,
                title: "Global Teams",
                desc: "Organizations operating across multiple currencies, jurisdictions, and markets.",
              },
            ].map((item, i) => (
              <FadeInUp key={item.title} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-blue-90/40 mx-auto mb-4">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Simple pricing
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                {
                  name: "Free",
                  price: "$0",
                  desc: "Solo founders",
                  highlight: false,
                },
                {
                  name: "Starter",
                  price: "$29/mo",
                  desc: "Growing businesses",
                  highlight: true,
                },
                {
                  name: "Business",
                  price: "$79/mo",
                  desc: "Multi-entity teams",
                  highlight: false,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  desc: "Complex organizations",
                  highlight: false,
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl border bg-card p-5 text-center transition-all ${
                    tier.highlight
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                >
                  {tier.highlight && (
                    <div className="text-[10px] font-semibold text-primary mb-2 uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <div className="text-sm font-medium text-muted-foreground">
                    {tier.name}
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {tier.price}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tier.desc}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              No credit card required. Cancel anytime. Unlimited users on all
              plans.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-3xl font-bold text-foreground">
              Ready to get started?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start closing your books in days, not weeks.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
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
              <PrintButton />
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
