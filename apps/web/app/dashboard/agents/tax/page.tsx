"use client";

import { TaxLiveness } from "@/components/agents/tax-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Scale,
  Ban,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function TaxAgentLivenessPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link
            href="/dashboard/agents"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to AI Team
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground/80">Tax Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-signal-indigo" />
              Tax Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tax calculations are legally consequential and the one place where
              &quot;the AI decided&quot; is least acceptable as an answer —
              every rate applied must trace to a specific, named rule, not an
              inferred figure, because these numbers eventually go to a
              government authority under the organization&apos;s name. Each
              return line cites its rate, rule name, jurisdiction, and rule
              version.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Scale className="h-3 w-3" />
                Rule Cited Per Line
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every return line shows rate %, rule name, jurisdiction, and
                effective date — each calculation cites an exact rule version,
                not just a current rate.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <Ban className="h-3 w-3" />
                Never Guess a Rule
              </div>
              <p className="text-[10px] text-muted-foreground">
                If a transaction type has no matching rule, the agent stops and
                flags it — it never applies the &quot;closest&quot; rule as a
                silent guess.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <CalendarDays className="h-3 w-3" />
                Deadline Tracked
              </div>
              <p className="text-[10px] text-muted-foreground">
                Filing deadline countdown shown persistently, escalating in
                urgency as it approaches — never surfaced only at generation
                time.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Tax Agent about a rule application..."
            suggestions={[
              "Which rule version applied to Sale #1042?",
              "Why was TXN-XBORDER-0417 excluded?",
              "When is the VAT return due?",
              "Show the audit trail for this run",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <TaxLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Tax Liveness Spec — they let you
                simulate different agent states to verify transparency at every
                stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Rule Applying</p>
                <p className="text-[8px] text-muted-foreground">
                  RATE_RULE_APPLIED active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Rule Gap</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking for that line only
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Deadline Urgent</p>
                <p className="text-[8px] text-muted-foreground">
                  Non-blocking but urgent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Stale Rules</p>
                <p className="text-[8px] text-muted-foreground">
                  Informational — verify current
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Handed Off</p>
                <p className="text-[8px] text-muted-foreground">
                  Compliance review — 0 meters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
