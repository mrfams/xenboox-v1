"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  PlugZap,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTION NOTES
// Graph fan-in: Product (clarity of job-to-be-done) × Design (Linear/Stripe
// high-contrast + whitespace + monochrome+1 accent) × Engineering (perf/a11y).
// Vibe: Editorial Tech — ethereal glass mesh on warm paper, sharp Geist-tight
// type, double-bezel hardware cards, ghost numbers, scroll-driven timeline.
// ────────────────────────────────────────────────────────────────────────────

type Step = {
  n: string;
  kicker: string;
  icon: typeof PlugZap;
  title: string;
  description: string;
  bullets: string[];
};

const steps: Step[] = [
  {
    n: "01",
    kicker: "02 min  •  3 sources",
    icon: PlugZap,
    title: "Connect your business",
    description:
      "Link bank, customers, and suppliers. Xenboox maps your chart of accounts and entity structure in minutes — not weeks.",
    bullets: [
      "Bank PDF or live feed  •  Wave, Orange Money",
      "Customers & suppliers import",
      "Entity-scoped chart auto-learned",
    ],
  },
  {
    n: "02",
    kicker: "19 agents  •  24/7",
    icon: Workflow,
    title: "Agents do the work",
    description:
      "Specialized agents handle invoicing, reconciliation, payroll, compliance, and month-end close. Every action logged and scored.",
    bullets: [
      "Invoicing → reconciliation → payroll",
      "Compliance & month-end close",
      "Confidence-scored · 99.7% auto-post",
    ],
  },
  {
    n: "03",
    kicker: "1 click  •  reversible",
    icon: CheckCheck,
    title: "You make the decisions",
    description:
      "Nothing material posts without you. Review briefs, approve in one click, or ask the AI to explain before you decide.",
    bullets: [
      "Decision briefs with evidence",
      "Approve / explain / rollback",
      "Full audit trail, entity-scoped",
    ],
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      className="relative overflow-hidden bg-background py-20 sm:py-24 lg:py-28"
    >
      {/* Ambient */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.03]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_85%_75%_at_50%_0%,hsl(var(--primary)/0.07),transparent_62%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header — editorial, not centered blob */}
        <FadeInUp>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                aria-hidden
              />
              How it works
            </span>
            <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              Set up in minutes.
              <br />
              <span className="text-muted-foreground">
                First close in days.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Xenboox replaces the daily grind of accounting work, not your
              judgment. Every step is logged, reversible, and entity-scoped —
              across every entity you own.
            </p>
          </div>
        </FadeInUp>

        {/* Timeline + Steps — graph: product steps × design craft × engineering perf */}
        <div className="relative mt-12 sm:mt-16 lg:mt-20">
          {/* Desktop connector — track + progress fill */}
          <div
            className="pointer-events-none absolute left-[calc(16.666%+1rem)] right-[calc(16.666%+1rem)] top-[44px] hidden h-px lg:block"
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60" />
          </div>
          {/* Mobile spine */}
          <div
            className="pointer-events-none absolute left-[22px] top-6 bottom-6 w-px bg-gradient-to-b from-border via-border to-transparent sm:left-7 lg:hidden"
            aria-hidden
          />

          <ol
            className="relative grid gap-5 sm:gap-6 lg:grid-cols-3 lg:gap-6"
            aria-label="How Xenboox works in three steps"
          >
            {steps.map((step, i) => (
              <li key={step.n} className="relative">
                <FadeInUp delay={i * 0.12} className="h-full">
                  {/* Double-bezel outer */}
                  <div className="group relative flex h-full flex-col rounded-[1.65rem] border border-border/40 bg-border/20 p-[5px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/60 hover:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.18)]">
                    {/* Inner hardware */}
                    <div className="relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-card p-6 sm:p-7">
                      {/* Ghost number — outline, editorial luxury */}
                      <span
                        className="pointer-events-none absolute -right-1 -top-1 select-none text-[5.2rem] font-semibold leading-none tracking-tighter text-foreground/[0.05] sm:text-[5.6rem]"
                        aria-hidden
                      >
                        {step.n}
                      </span>

                      {/* Top row */}
                      <div className="relative flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                          <step.icon
                            className="h-5 w-5"
                            aria-hidden="true"
                            strokeWidth={1.75}
                          />
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            aria-hidden
                          />
                          {step.n}
                        </span>
                      </div>

                      {/* Kicker */}
                      <p className="relative mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                        {step.kicker}
                      </p>

                      <h3 className="relative mt-2 text-[17px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                        {step.title}
                      </h3>
                      <p className="relative mt-2 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[14.5px]">
                        {step.description}
                      </p>

                      {/* Proof bullets — premium utilitarian */}
                      <ul className="relative mt-5 space-y-2 border-t border-border/40 pt-5">
                        {step.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Check
                                className="h-3 w-3 text-primary"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            </span>
                            <span className="text-[13.5px]">{b}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Micro metric footer */}
                      <div className="relative mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1 font-mono text-[11px]">
                          {i === 0
                            ? "avg 2 min"
                            : i === 1
                              ? "99.7% auto"
                              : "reversible"}
                        </span>
                        <span
                          className="h-1 w-1 rounded-full bg-border"
                          aria-hidden
                        />
                        <span className="text-[11px] tracking-wide">
                          {i === 0
                            ? "No CSV wrangling"
                            : i === 1
                              ? "Confidence > 0.7"
                              : "Entity-scoped"}
                        </span>
                      </div>
                    </div>
                  </div>
                </FadeInUp>

                {/* Mobile step connector dot */}
                <span
                  className="absolute left-[18px] top-8 hidden h-2 w-2 rounded-full border-2 border-background bg-primary shadow-sm sm:left-[24px] lg:hidden"
                  aria-hidden
                />
              </li>
            ))}
          </ol>

          {/* Proof bar — closes the loop */}
          <FadeInUp delay={0.4}>
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/50 bg-muted/20 px-4 py-4 sm:flex-row sm:px-6 lg:mt-10">
              <div className="flex flex-wrap items-center justify-center gap-6 text-center sm:justify-start sm:text-left">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    Audit trail on every action
                  </span>
                </div>
                <span
                  className="hidden h-4 w-px bg-border sm:block"
                  aria-hidden
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    19
                  </span>{" "}
                  agents
                </div>
                <span
                  className="hidden h-4 w-px bg-border sm:block"
                  aria-hidden
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    3 days
                  </span>{" "}
                  to first close
                </div>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Start free <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </div>
    </Section>
  );
}
