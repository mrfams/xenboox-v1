"use client";

import { TreasuryLiveness } from "@/components/agents/treasury-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Landmark,
  Wallet,
  Smartphone,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function TreasuryAgentLivenessPage() {
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
          <span className="text-foreground/80">Treasury Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Landmark className="h-5 w-5 text-teal-500" />
              Treasury Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Treasury Agent&apos;s job is real-time position awareness across
              every cash-adjacent worker agent — its liveness shows a live
              rollup building across multiple accounts and rails simultaneously,
              not a static daily snapshot.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-500 mb-1">
                <Wallet className="h-3 w-3" />
                Live Multi-Source Rollup
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bank balances, till balances, and mobile money balances each
                tick independently with per-source &quot;last updated&quot;
                timestamps.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-error-clay mb-1">
                <ShieldCheck className="h-3 w-3" />
                Never Close With Unresolved
              </div>
              <p className="text-[10px] text-muted-foreground">
                A hard gate, not a judgment call — reconciliation never closes
                while any worker agent still reports unresolved items (PRD
                §6.4).
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Smartphone className="h-3 w-3" />
                Stale Sources Shown, Never Excluded
              </div>
              <p className="text-[10px] text-muted-foreground">
                A source that fails to report is shown explicitly as stale or
                missing — never silently dropped from the total.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Treasury Agent about the cash position..."
            suggestions={[
              "What is the current total cash position?",
              "Which sources are unresolved right now?",
              "Why can't the reconciliation close?",
              "Has the daily position been confirmed?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <TreasuryLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Treasury Liveness Spec — they let
                you simulate different agent states to verify transparency at
                every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Reconciliation Review</p>
                <p className="text-[8px] text-muted-foreground">
                  3 unresolved items — cannot close (hard gate)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Stale Source</p>
                <p className="text-[8px] text-muted-foreground">
                  Wave API down — never silently excluded
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Position Alert</p>
                <p className="text-[8px] text-muted-foreground">
                  Large scheduled payment vs position — non-blocking but urgent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Daily Confirmed</p>
                <p className="text-[8px] text-muted-foreground">
                  GMD 12,400.00 across 3 accounts/rails — terminal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
