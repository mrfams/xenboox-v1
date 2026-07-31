"use client";

import { AuditLiveness } from "@/components/agents/audit-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Fingerprint,
  Scale,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function AuditAgentLivenessPage() {
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
          <span className="text-foreground/80">Audit Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-signal-indigo" />
              Audit Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              &quot;24/7 internal audit, no competitor offers this&quot; — but a
              background process nobody can see isn&apos;t a differentiator,
              it&apos;s a marketing claim with no proof. This agent is visibly,
              continuously at work, and its comparisons against the golden
              dataset are as traceable as any other agent&apos;s reasoning.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Fingerprint className="h-3 w-3" />
                Continuously Visible
              </div>
              <p className="text-[10px] text-muted-foreground">
                A persistent, low-key activity indicator shows the agent
                sampling in the background — viewable on demand, never
                intrusive.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Scale className="h-3 w-3" />
                Golden Case Cited
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every deviation cites the specific golden dataset case and which
                agent&apos;s decision triggered it — never an unexplained
                &quot;flagged.&quot;
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <ShieldAlert className="h-3 w-3" />
                Read-Only &amp; Honest
              </div>
              <p className="text-[10px] text-muted-foreground">
                No write path to the ledger under any circumstance — and limited
                golden dataset coverage is surfaced honestly, never hidden.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Audit Agent about a sample..."
            suggestions={[
              "Show the latest deviation and its golden case",
              "What was sampled this cycle?",
              "Is the golden dataset coverage sufficient?",
              "Show the audit trail for sample AUD-2026-0182",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <AuditLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Audit Liveness Spec — they let
                you simulate different agent states to verify transparency at
                every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Comparing</p>
                <p className="text-[8px] text-muted-foreground">
                  COMPARING_AGAINST_GOLDEN_DATASET active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Deviation</p>
                <p className="text-[8px] text-muted-foreground">
                  Material — golden case cited
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Fraud Pattern</p>
                <p className="text-[8px] text-muted-foreground">
                  High urgency — distinct treatment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Low Coverage</p>
                <p className="text-[8px] text-muted-foreground">
                  Surfaced honestly, never hidden
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Package Delivered</p>
                <p className="text-[8px] text-muted-foreground">
                  Terminal — auditor portal updated
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
