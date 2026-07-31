"use client";

import { LedgerLiveness } from "@/components/agents/ledger-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Shield,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function LedgerAgentLivenessPage() {
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
          <span className="text-foreground/80">Ledger Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-signal-indigo" />
              Ledger Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the Ledger Agent&apos;s decision
              pipeline. Every validation gate, confidence score, and constraint
              check is visible.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Shield className="h-3 w-3" />
                No Black Boxes
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every decision is decomposed into visible, verifiable steps with
                individual confidence scores.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <BarChart3 className="h-3 w-3" />
                Honest Uncertainty
              </div>
              <p className="text-[10px] text-muted-foreground">
                Confidence below 0.7 escalates to Controller. Below 0.4
                escalates to human. Never fakes certainty.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <FileText className="h-3 w-3" />
                Constraint Enforcement
              </div>
              <p className="text-[10px] text-muted-foreground">
                Double-entry, period locks, account validation — all enforced as
                hard mathematical constraints, not AI promises.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Ledger Agent about a journal entry..."
            suggestions={[
              "Show me pending journal entries",
              "Post entry #JE-2026-0842",
              "What entries were rejected today?",
              "Explain the double-entry validation process",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <LedgerLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Liveness Spec — they let you
                simulate different agent states to verify transparency at every
                stage.
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Processing</p>
                <p className="text-[8px] text-muted-foreground">
                  Active pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Rejected</p>
                <p className="text-[8px] text-muted-foreground">Entry failed</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Idle</p>
                <p className="text-[8px] text-muted-foreground">No entry</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
