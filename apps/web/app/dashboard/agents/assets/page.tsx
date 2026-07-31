"use client";

import { AssetLiveness } from "@/components/agents/asset-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Calculator,
  CalendarDays,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function AssetAgentLivenessPage() {
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
          <span className="text-foreground/80">Asset Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5 text-signal-indigo" />
              Asset Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Depreciation is a recurring, silent background calculation most
              users never watch happen — but it directly affects the balance
              sheet every period. Showing the actual formula, not just the
              number, is what separates &quot;AI-native&quot; from &quot;the
              number just changed.&quot; Every period&apos;s depreciation amount
              is shown with the formula that produced it.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Calculator className="h-3 w-3" />
                Formula Always Shown
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every depreciation amount is rendered with its formula — (cost −
                salvage) ÷ useful life — never a bare number with no visible
                derivation.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <CalendarDays className="h-3 w-3" />
                Schedule Per-Period
              </div>
              <p className="text-[10px] text-muted-foreground">
                The depreciation schedule is one row per period across the
                useful life — not a single computed field — with the current
                period&apos;s row highlighted.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <AlertTriangle className="h-3 w-3" />
                Never Auto-Disposed
              </div>
              <p className="text-[10px] text-muted-foreground">
                Fully depreciated or failed verification flags for review —
                disposal always requires an explicit human decision, never
                auto-closed.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Asset Agent about an asset..."
            suggestions={[
              "Show the depreciation formula for FG-14",
              "Which assets are due for verification?",
              "What is fully depreciated but still in use?",
              "Show the per-period schedule for Q2 2026",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <AssetLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Asset Liveness Spec — they let
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
                <p className="text-[10px] font-medium">Depreciation Running</p>
                <p className="text-[8px] text-muted-foreground">
                  DEPRECIATION_CALCULATED active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Disposal Flagged</p>
                <p className="text-[8px] text-muted-foreground">
                  Never auto-disposed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Ambiguous Class</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking — confirm class
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Incomplete Record</p>
                <p className="text-[8px] text-muted-foreground">
                  Cannot schedule-set
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Posted</p>
                <p className="text-[8px] text-muted-foreground">
                  Ledger handoff — 0 meters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
