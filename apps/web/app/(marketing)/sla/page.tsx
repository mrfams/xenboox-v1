"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { BreadcrumbJsonLd } from "@/components/marketing/json-ld";

const commitments = [
  {
    metric: "99.9%",
    label: "Uptime SLA",
    desc: "Monthly uptime guarantee for all paid plans. Measured at the API and web application layer.",
    icon: Clock,
  },
  {
    metric: "< 4 hours",
    label: "Critical Issue Response",
    desc: "P1 incidents (platform down) acknowledged and triaged within 4 hours.",
    icon: AlertTriangle,
  },
  {
    metric: "< 24 hours",
    label: "High Issue Response",
    desc: "P2 incidents (major feature impaired) acknowledged within 1 business day.",
    icon: Mail,
  },
  {
    metric: "99.95%",
    label: "Data Durability",
    desc: "Backed by PostgreSQL on Neon with automated backups and point-in-time recovery.",
    icon: Shield,
  },
];

const exclusions = [
  "Scheduled maintenance windows (announced 72h in advance)",
  "Issues caused by customer configuration or third-party integrations",
  "Force majeure events (natural disasters, internet outages)",
  "Beta or preview features marked as experimental",
  "Issues in the free tier (best-effort support)",
];

const credits = [
  { uptime: "99.0% – 99.9%", credit: "10% of monthly bill" },
  { uptime: "95.0% – 99.0%", credit: "25% of monthly bill" },
  { uptime: "Below 95.0%", credit: "50% of monthly bill" },
];

export default function SLAPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "SLA" }]} />

      {/* Hero */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            {" "}
            <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              We take uptime seriously.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Your accounting platform should be available when you need it.
              Here&apos;s our commitment to reliability.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Commitments */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {commitments.map((item, i) => (
              <FadeInUp key={item.label} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-blue-900/40 mb-4">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {item.metric}
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-2">
                    {item.label}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* Service Credits */}
      <section className="py-16 bg-paper-2/60">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Service credits
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              If we miss our uptime guarantee, you receive credits on your next
              invoice.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Monthly Uptime
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((row, i) => (
                    <tr
                      key={row.uptime}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3 text-foreground font-medium">
                        {row.uptime}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {row.credit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Exclusions */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-3xl px-4">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Exclusions
            </h2>
            <ul className="space-y-3">
              {exclusions.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeInUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-foreground">
              Questions about our SLA?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Contact our team for custom SLA terms for enterprise deployments.
            </p>
            <div className="mt-8">
              <Link
                href="/docs/getting-started"
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Contact Sales
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
