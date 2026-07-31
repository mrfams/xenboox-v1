"use client";

import { BudgetLiveness } from "@/components/agents/budget-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  PiggyBank,
  TrendingUp,
  Receipt,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function BudgetAgentLivenessPage() {
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
          <span className="text-foreground/80">Budget Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Budget Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Variance explanations are where this agent is most likely to
              hallucinate a cause (&quot;marketing overspend due to increased ad
              activity&quot;) without actually checking the underlying
              transactions. Every explanation must trace to real data or be
              explicitly labeled as not yet explainable.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 mb-1">
                <TrendingUp className="h-3 w-3" />
                Variance Shown Live
              </div>
              <p className="text-[10px] text-muted-foreground">
                Budget vs actual bars update live per category as transactions
                post — the actual figure ticks against the budget line, never a
                batch-refreshed report.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Receipt className="h-3 w-3" />
                Explanations Cite Transactions
              </div>
              <p className="text-[10px] text-muted-foreground">
                An explained variance shows the specific driver — e.g. GMD 300
                of a GMD 450 overage traces to one invoice (Cloudline Ltd, June
                14) — never a plausible-sounding but unverified narrative.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <PiggyBank className="h-3 w-3" />
                Honest &quot;Not Yet Explainable&quot;
              </div>
              <p className="text-[10px] text-muted-foreground">
                If no single driver is identified, the variance is labeled
                honestly — never guessed. Unbudgeted spend is flagged, not
                silently ignored or forced into the nearest category.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Budget Agent about a variance..."
            suggestions={[
              "Why is Marketing over budget?",
              "Show the transactions behind this variance",
              "What happens when a variance has no single driver?",
              "How are alerts surfaced?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <BudgetLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Budget Liveness Spec — they let
                you simulate different agent states to verify transparency at
                every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Explaining Variance</p>
                <p className="text-[8px] text-muted-foreground">
                  EXPLAINABLE active — driver cited
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Unexplained</p>
                <p className="text-[8px] text-muted-foreground">
                  Honest label — never guessed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Unbudgeted Spend</p>
                <p className="text-[8px] text-muted-foreground">
                  Flagged — never forced into a category
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Alert Breach</p>
                <p className="text-[8px] text-muted-foreground">
                  Proactive — non-blocking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
