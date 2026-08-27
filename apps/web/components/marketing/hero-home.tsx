import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  FileCheck2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui";
import { FadeInUp } from "@/components/marketing/reveal";

const feed = [
  {
    icon: FileCheck2,
    agent: "Invoice Agent",
    time: "2m ago",
    message: "Posted invoice #INV-1042 — Atlantic Foods Ltd (GMD 486,000)",
    status: {
      label: "Posted",
      tone: "text-balanced-green bg-balanced-green/10",
    },
  },
  {
    icon: Users,
    agent: "Payroll Agent",
    time: "14m ago",
    message: "Ran July payroll — 34 staff, GMD 1.92M net",
    status: {
      label: "Completed",
      tone: "text-balanced-green bg-balanced-green/10",
    },
  },
  {
    icon: ShieldCheck,
    agent: "Compliance Agent",
    time: "1h ago",
    message: "Drafted June VAT return — due Monday",
    status: {
      label: "Needs review",
      tone: "text-attention-amber bg-attention-amber/10",
    },
  },
];

const journal = [
  { date: "01 Aug", desc: "Cash at bank (GMD)", dr: "486,000", cr: "" },
  { date: "01 Aug", desc: "Accounts receivable", dr: "486,000", cr: "" },
  { date: "01 Aug", desc: "VAT output (15%)", dr: "", cr: "72,900" },
  { date: "01 Aug", desc: "Revenue", dr: "", cr: "413,100" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      {/* Premium ambient gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(20, 33, 61, 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 100% at 50% -20%, rgba(59, 79, 224, 0.14), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-40 top-40 h-[300px] w-[300px] rounded-full bg-balanced-green/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 sm:gap-12 lg:gap-16 pb-10 pt-10 sm:pt-14 md:pt-16 lg:grid-cols-2 lg:pb-20 lg:pt-20">
          <FadeInUp>
            <div className="flex flex-col items-start gap-5 sm:gap-6">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your entire accounting department, running{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  autonomously
                </span>
                .
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                AI agents handle invoicing, payroll, compliance, and month-end
                close — every decision confidence-scored, every action
                audit-trailed. You approve what matters.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/onboarding">
                    Start free
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="#demo">See it in action</Link>
                </Button>
              </div>

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {[
                  "No credit card required",
                  "Built for The Gambia",
                  "Human approval on every decision",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check
                        className="h-3 w-3 text-primary"
                        aria-hidden="true"
                      />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <ProductPreview />
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[480px] md:max-w-[520px] lg:max-w-[560px]">
      <div
        className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-balanced-green/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -inset-4 rounded-[1.75rem] bg-gradient-to-br from-primary/10 to-transparent blur-xl"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
          <span
            className="h-2.5 w-2.5 rounded-full bg-error-clay/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-attention-amber/70"
            aria-hidden="true"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-balanced-green/70"
            aria-hidden="true"
          />
          <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Xenboox — CFO Briefing
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-balanced-green"
              aria-hidden="true"
            />
            19 agents working
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Agent activity
            </p>
            <div className="divide-y divide-border rounded-xl border border-border">
              {feed.map((item) => (
                <div
                  key={item.agent}
                  className="flex items-start gap-3 px-3.5 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {item.agent}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status.tone}`}
                  >
                    {item.status.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              General ledger
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-3.5 py-2 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-3.5 py-2 font-semibold">
                      Account
                    </th>
                    <th
                      scope="col"
                      className="px-3.5 py-2 text-right font-semibold"
                    >
                      Dr
                    </th>
                    <th
                      scope="col"
                      className="px-3.5 py-2 text-right font-semibold"
                    >
                      Cr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((row) => (
                    <tr
                      key={row.desc}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-3.5 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {row.date}
                      </td>
                      <td className="px-3.5 py-2 text-xs font-medium text-foreground">
                        {row.desc}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-[11px] tabular-nums text-foreground">
                        {row.dr || ""}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-[11px] tabular-nums text-foreground">
                        {row.cr || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 -top-8 hidden w-52 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-foreground/10 backdrop-blur-sm md:block lg:-right-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash position
          </p>
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-balanced-green">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            +18%
          </span>
        </div>
        <p className="mt-1 text-lg font-semibold tracking-tight text-foreground tabular-nums">
          GMD 4,210,000
        </p>
        <svg
          viewBox="0 0 160 44"
          className="mt-2 h-11 w-full"
          aria-hidden="true"
        >
          <path
            d="M0 34 L16 30 L32 32 L48 24 L64 26 L80 18 L96 20 L112 12 L128 14 L144 8 L160 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
      </div>

      <div className="absolute -bottom-8 -left-4 hidden w-60 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-foreground/10 backdrop-blur-sm md:block lg:-left-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Decision needed
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          Approve VAT payment of GMD 84,500?
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1">
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Review
          </Button>
        </div>
      </div>
    </div>
  );
}
