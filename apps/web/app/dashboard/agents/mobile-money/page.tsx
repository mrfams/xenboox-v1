"use client";

import { MobileMoneyLiveness } from "@/components/agents/mobile-money-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Smartphone,
  Clock,
  GitFork,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function MobileMoneyAgentLivenessPage() {
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
            Mobile Money Agent Liveness
          </span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-signal-indigo" />
              Mobile Money Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Mobile money is a first-class rail for Xenboox — but it has a real
              quirk competitors ignore: a confirmation can appear before bank
              settlement completes, creating a timing gap that looks like a
              discrepancy if not explained. This agent makes that lag visible
              and explained — a third, explicit outcome, never silently
              reconciled away and never wrongly flagged as an error.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Clock className="h-3 w-3" />
                Timing Gaps Are a Third Outcome
              </div>
              <p className="text-[10px] text-muted-foreground">
                A mobile money confirmation before bank settlement is a third,
                explicit outcome — distinct from matched and unmatched. The lag
                is computed and labeled against the rail&apos;s typical range,
                never silently absorbed.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <GitFork className="h-3 w-3" />
                Per-Rail Separation
              </div>
              <p className="text-[10px] text-muted-foreground">
                Wave, Orange Money, MTN MoMo, M-Pesa, and Airtel Money activity
                is kept in its own feed with its own rail identity — never
                blended into one undifferentiated &quot;mobile money&quot; list.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <ShieldAlert className="h-3 w-3" />
                Never Silently Skipped
              </div>
              <p className="text-[10px] text-muted-foreground">
                Rail API failures show &quot;couldn&apos;t pull [rail] data
                since [last successful pull]&quot; until resolved, and provider
                format changes are flagged for Document Agent review — never
                mis-parsed silently.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Mobile Money Agent about a rail..."
            suggestions={[
              "Show me the current per-rail activity",
              "Why is this item flagged as a timing gap?",
              "Which transactions are still unmatched?",
              "Show the audit trail for Wave transactions",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <MobileMoneyLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Mobile Money Liveness Spec — they
                let you simulate different agent states to verify transparency
                at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Matching</p>
                <p className="text-[8px] text-muted-foreground">
                  MATCHING_TO_LEDGER active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Anomalous Lag</p>
                <p className="text-[8px] text-muted-foreground">
                  Escalated to Treasury Agent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">API Failure</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking for that rail only
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Reconciled</p>
                <p className="text-[8px] text-muted-foreground">
                  Terminal state — 0 meters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
