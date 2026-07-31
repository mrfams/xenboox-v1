"use client";

import { ReconciliationLiveness } from "@/components/agents/reconciliation-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Landmark,
  Shield,
  BarChart3,
  ExternalLink,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function ReconciliationAgentLivenessPage() {
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
          <span className="text-foreground/80">
            Reconciliation Agent Liveness
          </span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Landmark className="h-5 w-5 text-signal-indigo" />
              Reconciliation Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the Reconciliation Agent&apos;s
              matching engine. Every matched line shows its criteria — exact
              matches with solid certainty, fuzzy matches with labeled
              confidence. Unmatched lines are grouped by reason, never dumped in
              one flat list.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Shield className="h-3 w-3" />
                Exact ≠ Fuzzy Weight
              </div>
              <p className="text-[10px] text-muted-foreground">
                A fuzzy match is never displayed with the same visual weight as
                an exact match — dashed connector + confidence badge, or it
                hasn&apos;t actually been matched.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <BarChart3 className="h-3 w-3" />
                Every Match Explainable
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each line carries a &quot;Why&quot; — the criteria used (amount,
                date, reference) and the confidence, so you can catch weak
                matches before they close.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <FileText className="h-3 w-3" />
                Never Auto-Closes
              </div>
              <p className="text-[10px] text-muted-foreground">
                Any unresolved item structurally blocks CLOSED. Only Treasury
                Agent — with human visibility — can confirm closure.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Reconciliation Agent about a match..."
            suggestions={[
              "Show me June 2026 reconciliation progress",
              "Why was the $450.00 consulting fee fuzzy-matched?",
              "Which items still need Treasury review?",
              "Explain the duplicate flag on the POS withdrawals",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ReconciliationLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Reconciliation Liveness Spec —
                they let you simulate different agent states to verify
                transparency at every stage of the state machine.
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Matching In Progress</p>
                <p className="text-[8px] text-muted-foreground">
                  BUCKETING_UNMATCHED active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Treasury Review</p>
                <p className="text-[8px] text-muted-foreground">
                  Unresolved items block close
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Closed</p>
                <p className="text-[8px] text-muted-foreground">
                  Confirmed by Treasury Agent
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
