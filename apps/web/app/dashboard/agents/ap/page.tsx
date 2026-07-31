"use client";

import { ApLiveness } from "@/components/agents/ap-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Receipt,
  Shield,
  BarChart3,
  ExternalLink,
  FileSearch,
} from "lucide-react";
import Link from "next/link";

export default function ApAgentLivenessPage() {
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
          <span className="text-foreground/80">AP Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-signal-indigo" />
              AP Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the AP Agent&apos;s invoice pipeline —
              the first value moment in onboarding. Every vendor match shows its
              basis (exact tax ID vs similar name), duplicate checks are always
              visible even when clean, and no vendor is ever auto-merged on
              fuzzy name similarity alone.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Shield className="h-3 w-3" />
                Never Auto-Merge
              </div>
              <p className="text-[10px] text-muted-foreground">
                A fuzzy vendor match never silently merges a new vendor into an
                existing one on name similarity alone — human confirmation is
                always required before it proceeds.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <BarChart3 className="h-3 w-3" />
                Basis Always Shown
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each vendor match carries its basis and confidence — matched on
                tax ID, matched on similar name, or no match found. No silent
                matching, ever.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <FileSearch className="h-3 w-3" />
                Duplicate Always Checked
              </div>
              <p className="text-[10px] text-muted-foreground">
                The duplicate check result is always shown — even when clean
                (&quot;checked against 340 records — no duplicate&quot;).
                Near-duplicates are flagged with the prior record shown.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the AP Agent about an invoice..."
            suggestions={[
              "Show me the current invoice pipeline",
              "Why was Westlink Consulting matched to Westlink Group?",
              "Which invoices are blocked waiting on confirmation?",
              "Show the audit trail for invoice AP-2026-0317",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ApLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the AP Liveness Spec — they let you
                simulate different agent states to verify transparency at every
                stage of the state machine.
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
                <p className="text-[10px] font-medium">Invoice Processing</p>
                <p className="text-[8px] text-muted-foreground">
                  VENDOR_MATCHING active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Needs Input</p>
                <p className="text-[8px] text-muted-foreground">
                  Unreadable field blocks invoice
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
                  Terminal for AP Agent scope
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
