"use client";

import type { ComponentType } from "react";
import { Check, CheckCheck, PlugZap, Workflow } from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTION NOTES
// Graph fan-in: Product (clarity of job-to-be-done) × Design (Linear/Stripe
// high-contrast + whitespace + monochrome+1 accent) × Engineering (perf/a11y).
// Vibe: Editorial Tech — ethereal glass mesh on warm paper, sharp Geist-tight
// type, double-bezel hardware cards, ghost numbers, scroll-driven timeline.
// ────────────────────────────────────────────────────────────────────────────

type Step = Required<Pick<HowItWorksStep, "title" | "description">> & {
  n: string;
  kicker: string;
  icon: NonNullable<HowItWorksStep["icon"]>;
  bullets: string[];
};

// Public step shape — accepts both the editorial internal shape (n, kicker,
// bullets) and the simpler page-level shape (step number, optional icon).
export type HowItWorksStep = {
  n?: string;
  step?: string;
  kicker?: string;
  icon?: ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
    strokeWidth?: number;
  }>;
  title: string;
  description: string;
  bullets?: string[];
};

type HowItWorksProps = {
  id?: string;
  title?: string;
  subtitle?: string;
  steps?: HowItWorksStep[];
};

const defaults: Step[] = [
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
    kicker: "Autonomous  •  24/7",
    icon: Workflow,
    title: "Agents do the work",
    description:
      "Specialized agents handle invoicing, reconciliation, payroll, compliance, and month-end close. Every action logged and scored.",
    bullets: [
      "Invoicing → reconciliation → payroll",
      "Compliance & month-end close",
      "Routine work posts itself · you approve the rest",
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

export function HowItWorks({
  id = "how-it-works",
  title,
  subtitle,
  steps: customSteps,
}: HowItWorksProps = {}) {
  const active: Step[] =
    customSteps?.map((s, i) => ({
      n: s.n ?? s.step ?? String(i + 1),
      kicker: s.kicker ?? "",
      icon: s.icon ?? PlugZap,
      title: s.title,
      description: s.description,
      bullets: s.bullets ?? [],
    })) ?? defaults;

  return (
    <Section
      id={id}
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
            <h2 className="text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              {title ?? (
                <>
                  Set up in minutes.
                  <br />
                  <span className="text-muted-foreground">
                    First close in days.
                  </span>
                </>
              )}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {subtitle ??
                "Xenboox replaces the daily grind of accounting work, not your judgment. Every step is logged, reversible, and entity-scoped — across every entity you own."}
            </p>
          </div>
        </FadeInUp>

        {/* Timeline + Steps */}
        <div className="relative mt-12 sm:mt-16 lg:mt-20">
          <ol
            className="relative grid gap-5 sm:gap-6 lg:grid-cols-3 lg:gap-6"
            aria-label="How Xenboox works in three steps"
          >
            {active.map((step, i) => (
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

                      {/* Top row — icon + title same row */}
                      <div className="relative flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-colors duration-300 group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
                          <step.icon
                            className="h-5 w-5"
                            aria-hidden="true"
                            strokeWidth={1.75}
                          />
                        </span>
                        <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                          {step.title}
                        </h3>
                      </div>

                      {/* Kicker */}
                      {step.kicker ? (
                        <p className="relative mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                          {step.kicker}
                        </p>
                      ) : null}
                      <p className="relative mt-2 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[14.5px]">
                        {step.description}
                      </p>

                      {/* Proof bullets — premium utilitarian */}
                      {step.bullets.length > 0 ? (
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
                      ) : null}

                      {/* Micro metric footer */}
                      <div className="relative mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1 font-mono text-[11px]">
                          {i === 0
                            ? "avg 2 min"
                            : i === 1
                              ? "auto-posts"
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
                              ? "You approve the rest"
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
        </div>
      </div>
    </Section>
  );
}
