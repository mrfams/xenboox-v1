"use client";

import Link from "next/link";
import { ArrowRight, Check, X, Bot, Globe, Shield, Zap } from "lucide-react";
import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const features = [
  { feature: "AI-powered automation", xenboox: true, xero: false },
  { feature: "Specialized AI agents", xenboox: true, xero: false },
  {
    feature: "Multi-currency (50+ currencies)",
    xenboox: true,
    xero: "Standard+ plans",
  },
  { feature: "Mobile money integration", xenboox: true, xero: false },
  { feature: "Real-time bank feed", xenboox: true, xero: true },
  { feature: "Invoice creation & sending", xenboox: true, xero: true },
  { feature: "Expense tracking", xenboox: true, xero: true },
  { feature: "Payroll (multi-country)", xenboox: true, xero: "AU/NZ/UK only" },
  { feature: "Multi-entity consolidation", xenboox: true, xero: "Add-on ($)" },
  { feature: "Month-end close automation", xenboox: true, xero: false },
  { feature: "AI-generated financial reports", xenboox: true, xero: false },
  { feature: "Confidence-scored decisions", xenboox: true, xero: false },
  { feature: "Human-in-the-loop approvals", xenboox: true, xero: false },
  { feature: "Inventory management", xenboox: true, xero: "Standard+" },
  {
    feature: "Fixed assets & depreciation",
    xenboox: true,
    xero: "Premium only",
  },
  { feature: "Free tier available", xenboox: true, xero: false },
];

const pricing = [
  { tier: "Starter", xenboox: "$29/mo", xero: "$29/mo" },
  { tier: "Business", xenboox: "$79/mo", xero: "$46/mo" },
  { tier: "Enterprise", xenboox: "$199/mo", xero: "$69/mo" },
];

export default function CompareXeroPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Compare", url: "/compare" },
          { name: "Xenboox vs Xero" },
        ]}
      />

      {/* Hero */}
      <section className="bg-paper py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            {" "}
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Xenboox vs Xero
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Xero is great accounting software. Xenboox is what happens when AI
              does the accounting for you.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Key Differences */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8">
              The key differences
            </h2>
          </FadeInUp>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Bot,
                title: "AI Agents, Not Dashboards",
                desc: "Xero gives you dashboards to monitor. Xenboox gives you AI agents that do the work — invoicing, payroll, compliance, and close.",
              },
              {
                icon: Globe,
                title: "Built for Every Market",
                desc: "Xero focuses on AU/NZ/UK/US. Xenboox supports 50+ currencies and multi-jurisdiction tax from day one.",
              },
              {
                icon: Shield,
                title: "Trust by Design",
                desc: "Every AI decision is confidence-scored and auditable. You approve what matters. Xero has no AI decision-making.",
              },
            ].map((item) => (
              <FadeInUp key={item.title}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100  mb-4">
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

      {/* Feature Comparison Table */}
      <section className="py-16 bg-paper-2/60 ">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Feature comparison
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Feature
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-primary">
                      Xenboox
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                      Xero
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2.5 text-foreground">
                        {row.feature}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.xenboox === true ? (
                          <Check className="h-4 w-4 text-balanced-green mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">
                            {row.xenboox}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.xero === true ? (
                          <Check className="h-4 w-4 text-balanced-green mx-auto" />
                        ) : row.xero === false ? (
                          <X className="h-4 w-4 text-error-clay/60 mx-auto" />
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

      {/* Pricing */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Pricing comparison
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Plan
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-primary">
                      Xenboox
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">
                      Xero
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((row, i) => (
                    <tr
                      key={row.tier}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {row.tier}
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold text-primary">
                        {row.xenboox}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {row.xero}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-muted/30 text-xs text-muted-foreground">
                Xero charges per user ($4-5/user/month extra). Xenboox includes
                unlimited users on all plans.
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Migration CTA */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background  ">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">
              Switching from Xero?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Import your chart of accounts, contacts, and invoices. The AI
              picks up where Xero left off.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Start Free Migration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
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
