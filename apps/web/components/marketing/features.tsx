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
  },
  {
    icon: TrendingUp,
    title: "Cash flow & forecasting",
    description: "See where your cash is headed — not just where it has been.",
    bullets: ["Rolling 14-day cash forecast", "Scenario planning in minutes"],
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
  },
  {
    icon: BarChart3,
    title: "Insights & reporting",
    description: "Board-ready reports generated the moment you ask for them.",
    bullets: [
      "P&L, balance sheet, and cash flow on demand",
      "Variance analysis in plain English",
    ],
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
            title="Everything a finance team does. Done by agents."
            lead="All 20 modules work together as one system — no spreadsheets, no plugins, no patchwork. Built for how SMEs actually operate."
          />
        </FadeInUp>

        {/* Asymmetric bento — breaks generic 3-equal-cols */}
        <div className="mt-10 sm:mt-14 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-12">
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
                className={`${span} feature-card-enter`}
              >
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-7 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_60px_-20px_rgba(20,33,61,0.15)]">
                  <div className="relative flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
                      {feature.title}
                    </h3>
                  </div>
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
      </div>
    </Section>
  );
}
