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
    <Section id="features" className="bg-paper-2/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            title="Everything a finance team does. Done by agents."
            lead="All 20 modules work together as one system — no spreadsheets, no plugins, no patchwork."
          />
        </FadeInUp>

        <div className="mt-10 sm:mt-14 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FadeInUp key={feature.title} delay={(index % 3) * 0.1}>
              <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 sm:p-8 transition-shadow hover:shadow-elevated">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-balanced-green"
                        aria-hidden="true"
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            </FadeInUp>
          ))}
        </div>
      </div>
    </Section>
  );
}
