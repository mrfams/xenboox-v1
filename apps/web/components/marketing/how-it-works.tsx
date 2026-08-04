import { CheckCheck, PlugZap, Workflow } from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const steps = [
  {
    icon: PlugZap,
    title: "Connect your business",
    description:
      "Securely connect your bank, customers, and suppliers. Xenboox maps your chart of accounts and entity structure in minutes — not weeks.",
  },
  {
    icon: Workflow,
    title: "Agents do the work",
    description:
      "19 specialized agents invoice, pay, reconcile, file, and close continuously. Every action is logged, confidence-scored, and attributed.",
  },
  {
    icon: CheckCheck,
    title: "You make the decisions",
    description:
      "Nothing material posts without your approval. Approve, question, or adjust from a single clean briefing — no spreadsheets required.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="bg-paper-2/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            title="Set up in minutes. Owned in days."
            lead="Xenboox replaces the daily grind of accounting work, not your judgment."
          />
        </FadeInUp>

        <div className="relative mt-16">
          <div
            className="absolute inset-x-12 top-9 hidden border-t-2 border-dashed border-border lg:block"
            aria-hidden="true"
          />
          <ol className="relative grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <FadeInUp delay={index * 0.12}>
                  <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-8">
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold tracking-wider text-muted-foreground tabular-nums">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
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
