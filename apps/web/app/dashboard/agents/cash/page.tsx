"use client";

import { CashLiveness } from "@/components/agents/cash-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Wallet,
  Shield,
  Layers,
  Timer,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function CashAgentLivenessPage() {
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
          <span className="text-foreground/80">Cash Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-5 w-5 text-signal-indigo" />
              Cash Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the Cash Agent&apos;s dual lifecycles
              — till balance and imprest. Cash is physical, not digital: a float
              handed to a field officer has a real lifecycle (issued → spent →
              retired → reconciled). Discrepancies need same-day attention, not
              month-end discovery — every count is a direct comparison with the
              exact amount shown, and variance is never silently absorbed.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <Layers className="h-3 w-3" />
                Two Parallel Lifecycles
              </div>
              <p className="text-[10px] text-muted-foreground">
                Till/cash position runs alongside imprest — a transaction feed
                with live balance updates, and a card-based imprest tracker
                (issued / in-use / retirement-pending / retired).
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Shield className="h-3 w-3" />
                Exact Discrepancies, Never Absorbed
              </div>
              <p className="text-[10px] text-muted-foreground">
                Counted vs expected is a direct comparison with the exact
                short/over amount shown. Unaccounted variance appears on its own
                line — never folded into &quot;misc expense.&quot;
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Timer className="h-3 w-3" />
                Same-Day Flags, Hard Stops
              </div>
              <p className="text-[10px] text-muted-foreground">
                Discrepancies flag the same day — not batched to month-end.
                Negative till balance is a hard stop, never silently posted. OCR
                confidence shown per receipt, arithmetic sum deterministic.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Cash Agent about a till or imprest..."
            suggestions={[
              "What is the current cash position?",
              "Show me the imprest lifecycle for the field officers",
              "Why was this discrepancy flagged?",
              "Show the retirement receipt matching",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <CashLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Cash Liveness Spec — they let you
                simulate different agent states to verify transparency at every
                stage of both state machines.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Receipt Matching</p>
                <p className="text-[8px] text-muted-foreground">
                  RECEIPT_MATCHING active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Till Discrepancy</p>
                <p className="text-[8px] text-muted-foreground">
                  Same-day flag, blocking for that till
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Imprest Variance</p>
                <p className="text-[8px] text-muted-foreground">
                  GMD 5.00 unaccounted — never absorbed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Negative Balance</p>
                <p className="text-[8px] text-muted-foreground">
                  Hard stop, never posted silently
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
