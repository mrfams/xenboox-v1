import { CheckCheck, PlugZap, Workflow } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const steps = [
  {
    icon: PlugZap,
    title: "Connect your business",
    description:
      "Link your bank, customers, and suppliers. Xenboox learns your chart of accounts, entity structure, and workflows in minutes — not weeks.",
  },
  {
    icon: Workflow,
    title: "Agents do the work",
    description:
      "Specialized AI agents handle invoicing, reconciliation, payroll, compliance, and month-end close around the clock. Every action is logged and confidence-scored.",
  },
  {
    icon: CheckCheck,
    title: "You make the decisions",
    description:
      "Nothing material posts without your approval. Review decision briefs, approve in one click, or ask the AI to explain anything before you decide.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      className="relative overflow-hidden bg-paper-2/60"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgba(15,113,89,0.06),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            eyebrow="From zero to close in one kickoff"
            title="Set up in minutes. First close in days."
            lead="Xenboox replaces the daily grind of accounting work, not your judgment. Every step is logged, reversible, and entity-scoped."
          />
        </FadeInUp>

        <div className="relative mt-10 sm:mt-14">
          {/* premium connector — gradient not dashed */}
          <div
            className="absolute inset-x-16 top-[2.2rem] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
            aria-hidden="true"
          />
          <ol className="relative grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                <FadeInUp delay={index * 0.12}>
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)]">
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-white">
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold tracking-wider text-muted-foreground tabular-nums">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-primary"
                          aria-hidden
                        />{" "}
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="relative mt-5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px] text-pretty">
                      {step.description}
                    </p>
                  </div>
                </FadeInUp>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
