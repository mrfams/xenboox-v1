"use client";

import { ExpenseLiveness } from "@/components/agents/expense-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Receipt,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ExpenseAgentLivenessPage() {
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
          <span className="text-foreground/80">Expense Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-signal-indigo" />
              Expense Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              The module most non-finance employees touch directly — a
              department manager approving a claim needs to see exactly why a
              claim passed or failed policy, not just a total. Policy-check
              logic silently applied is where an agent could quietly approve
              something borderline without the specific rule being named. Every
              rule is checked and shown individually.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <ShieldCheck className="h-3 w-3" />
                Itemized Policy Checks
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each policy rule (category limit, receipt threshold, duplicate)
                is checked and shown individually with a pass/fail marker —
                never collapsed into a single &quot;policy ok&quot; badge.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <FileText className="h-3 w-3" />
                OCR Never Guesses
              </div>
              <p className="text-[10px] text-muted-foreground">
                Extracted fields carry per-field confidence shown against the
                receipt. On OCR failure the agent never guesses an amount — it
                routes to manual entry or resubmission.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <AlertTriangle className="h-3 w-3" />
                Blocking Escalations
              </div>
              <p className="text-[10px] text-muted-foreground">
                Any policy rule failure, possible duplicate, or unreadable
                receipt blocks that claim until an explicit approval override,
                side-by-side comparison, or resubmission resolves it.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Expense Agent about a claim..."
            suggestions={[
              "Why was this claim escalated?",
              "Show the itemized policy checks",
              "Which claim is awaiting approval?",
              "Show the audit trail for EXP-2026-0142",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ExpenseLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Expense Liveness Spec — they let
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
                <p className="text-[10px] font-medium">Policy Checking</p>
                <p className="text-[8px] text-muted-foreground">
                  POLICY_CHECKING active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Escalated</p>
                <p className="text-[8px] text-muted-foreground">
                  Limit exceeded — exception approval
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">OCR Unreadable</p>
                <p className="text-[8px] text-muted-foreground">
                  Never guesses an amount
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Rejected</p>
                <p className="text-[8px] text-muted-foreground">
                  Hard policy fail — not waived
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Paid</p>
                <p className="text-[8px] text-muted-foreground">
                  Terminal — 0 meters
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
