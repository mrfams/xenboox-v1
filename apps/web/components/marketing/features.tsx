import {
  BarChart3,
  CalendarDays,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const features = [
  {
    icon: FileCheck,
    title: "Invoicing & receivables",
    description:
      "Send, track, and collect invoices automatically — with reminders and aging forecasts built in.",
    bullets: [
      "Auto-reminders before every due date",
      "Collections agent chases late payments",
    ],
    stat: "GMD 1.8M",
    statLabel: "overdue collected / mo",
    accent: "from-violet-500/10 via-primary/5 to-transparent",
  },
  {
    icon: Users,
    title: "Payroll",
    description:
      "Run payroll in one click — salaries, taxes, and statutory deductions computed correctly every time.",
    bullets: [
      "Gambian statutory compliance built in",
      "Payslips delivered to every employee",
    ],
    stat: "34 staff",
    statLabel: "in 2 minutes",
    accent: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Tax & compliance",
    description:
      "Returns filed on time, every time. No missed deadlines, no surprise penalties.",
    bullets: [
      "VAT, CIT, and withholding computed and filed",
      "Deadline alerts before they arrive",
    ],
    stat: "0 late",
    statLabel: "filings last 12 mo",
    accent: "from-amber-500/10 via-orange-500/5 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "Cash flow & forecasting",
    description: "See where your cash is headed — not just where it has been.",
    bullets: ["Rolling 14-day cash forecast", "Scenario planning in minutes"],
    stat: "+18%",
    statLabel: "forecast accuracy",
    accent: "from-blue-500/10 via-cyan-500/5 to-transparent",
  },
  {
    icon: CalendarDays,
    title: "Month-end close",
    description:
      "Close in days, not weeks, with a checklist that never drops a step.",
    bullets: [
      "Full audit trail on every entry",
      "Bank and vendor auto-reconciliation",
    ],
    stat: "4 days",
    statLabel: "vs 3 weeks before",
    accent: "from-indigo-500/10 via-violet-500/5 to-transparent",
  },
  {
    icon: BarChart3,
    title: "Insights & reporting",
    description: "Board-ready reports generated the moment you ask for them.",
    bullets: [
      "P&L, balance sheet, and cash flow on demand",
      "Variance analysis in plain English",
    ],
    stat: "2.3s",
    statLabel: "avg report render",
    accent: "from-rose-500/10 via-pink-500/5 to-transparent",
  },
];

export function Features() {
  return (
    <Section id="features" className="relative bg-paper-2/60 overflow-hidden">
      {/* subtle ambient spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,79,224,0.06), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            eyebrow="20 modules • 19 agents • one ledger"
            title="Everything a finance team does. Done by agents."
            lead="All 20 modules work together as one system — no spreadsheets, no plugins, no patchwork. Built for how SMEs actually operate."
          />
        </FadeInUp>

        {/* Asymmetric bento — breaks generic 3-equal-cols */}
        <div className="mt-10 sm:mt-14 grid gap-5 sm:gap-6 lg:grid-cols-12">
          {features.map((feature, index) => {
            const span =
              index === 0
                ? "lg:col-span-7"
                : index === 1
                  ? "lg:col-span-5"
                  : index === 2
                    ? "lg:col-span-5"
                    : index === 3
                      ? "lg:col-span-7"
                      : "lg:col-span-6";
            return (
              <FadeInUp
                key={feature.title}
                delay={(index % 3) * 0.08}
                className={span}
              >
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_12px_40px_-16px_rgba(20,33,61,0.12)]">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-60 group-hover:opacity-100 transition-opacity`}
                    aria-hidden
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="inline-flex flex-col items-end rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 backdrop-blur">
                      <span className="text-sm font-semibold tabular-nums tracking-tight text-foreground">
                        {feature.stat}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {feature.statLabel}
                      </span>
                    </span>
                  </div>
                  <h3 className="relative mt-4 text-[17px] font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="relative mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
                    {feature.description}
                  </p>
                  <ul className="relative mt-5 space-y-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-balanced-green/10 text-balanced-green">
                          <svg
                            viewBox="0 0 12 12"
                            className="h-3 w-3"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M3 6l2 2 4-4"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeInUp>
            );
          })}
        </div>

        <FadeInUp delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground/70">
            Every number is deterministically reconciled before it hits the
            ledger — agents are extractors and classifiers, never the final
            authority on a figure.
          </p>
        </FadeInUp>
      </div>
    </Section>
  );
}
