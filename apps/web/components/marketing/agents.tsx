import {
  Bot,
  ChevronDown,
  FileCheck2,
  Landmark,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Section, SectionHeading } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const departmentHeads = [
  {
    icon: Scale,
    name: "Controller",
    line: "Books, reconciliation, close",
  },
  {
    icon: Landmark,
    name: "Treasury",
    line: "Cash, funding, FX",
  },
  {
    icon: Users,
    name: "Payroll Manager",
    line: "Salaries, statutory, benefits",
  },
  {
    icon: ShieldCheck,
    name: "Compliance",
    line: "Tax, filings, controls",
  },
];

const workerAgents = [
  "Ledger",
  "Accounts Payable",
  "Accounts Receivable",
  "Fixed Assets",
  "Inventory",
  "Reconciliation",
  "Cash",
  "Mobile Money",
  "Payroll Worker",
  "Audit",
  "Expense",
];

function Connector() {
  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      <div className="flex h-10 w-px flex-col items-center justify-between bg-border">
        <span className="h-2 w-2 -translate-y-1 rounded-full border-2 border-primary bg-card" />
        <span className="h-2 w-2 translate-y-1 rounded-full border-2 border-border bg-card" />
      </div>
      <ChevronDown className="h-4 w-4 -translate-x-3 text-muted-foreground" />
    </div>
  );
}

export function Agents() {
  return (
    <Section id="agents">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SectionHeading
            eyebrow="The team"
            title="A finance team of 20 agents. Three tiers of guardrails."
            lead="Workers execute, managers review, the CFO decides. Every posting is attributed, logged, and reversible."
          />
        </FadeInUp>

        <div className="mx-auto mt-16 max-w-3xl">
          <FadeInUp>
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.03] px-8 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                CFO Agent
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Strategy, decisions, and the only agent that talks to you.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                Tier 1 · Strategic
              </span>
            </div>
          </FadeInUp>

          <Connector />

          <FadeInUp delay={0.1}>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {departmentHeads.map((head) => (
                <div
                  key={head.name}
                  className="rounded-xl border border-border bg-card px-5 py-5 text-center"
                >
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <head.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {head.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {head.line}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tier 2 · Management
            </p>
          </FadeInUp>

          <Connector />

          <FadeInUp delay={0.2}>
            <div className="rounded-2xl border border-border bg-card px-8 py-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-semibold text-foreground">
                  11 worker agents
                </h3>
                <span className="rounded-full bg-balanced-green/10 px-2.5 py-1 text-xs font-semibold text-balanced-green">
                  Tier 3 · Execution
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {workerAgents.map((agent) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-sm text-foreground"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    {agent}
                  </span>
                ))}
                <span className="inline-flex items-center rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm text-muted-foreground">
                  + 5 more
                </span>
              </div>
              <p className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
                <FileCheck2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                The Ledger Agent is the single point of entry into the general
                ledger — no worker posts directly, so the books stay clean by
                construction.
              </p>
            </div>
          </FadeInUp>
        </div>
      </div>
    </Section>
  );
}
