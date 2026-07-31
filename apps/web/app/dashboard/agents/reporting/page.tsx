"use client";

import { ReportingLiveness } from "@/components/agents/reporting-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Fingerprint,
  Database,
  PenLine,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ReportingAgentLivenessPage() {
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
          <span className="text-foreground/80">Reporting Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-signal-indigo" />
              Reporting Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Reports are often the only artifact a non-technical owner ever
              looks at directly — if a P&amp;L just &quot;appears,&quot; the
              entire agent workforce underneath it is invisible at exactly the
              moment it matters most for trust.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Fingerprint className="h-3 w-3" />
                Progressive Assembly
              </div>
              <p className="text-[10px] text-muted-foreground">
                The report builds section by section on screen — headers
                populate in sequence, never as a finished document appearing
                instantly.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Database className="h-3 w-3" />
                Never a Source of Truth
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every figure is pulled from its owning agent (Ledger, Budget,
                Analytics, Tax) with a snapshot reference — never independently
                re-derived.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <PenLine className="h-3 w-3" />
                Sourced Narrative
              </div>
              <p className="text-[10px] text-muted-foreground">
                The plain-English summary sits adjacent to the numbers it
                describes and cites each specific figure — no unsourced claims.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Reporting Agent about a report..."
            suggestions={[
              "Show how the P&L was assembled",
              "Which agents supplied the figures?",
              "Is the narrative sourced from the numbers?",
              "What happens if the trial balance isn't closed?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ReportingLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Reporting Liveness Spec — they
                let you simulate different agent states to verify transparency
                at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Assembling</p>
                <p className="text-[8px] text-muted-foreground">
                  ASSEMBLING active — section by section
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Missing Input</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking — trial balance not closed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Dependency Wait</p>
                <p className="text-[8px] text-muted-foreground">
                  Visible — elapsed time, never silent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Delivered</p>
                <p className="text-[8px] text-muted-foreground">
                  Terminal — sent via dashboard/email
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
