"use client";

import { PayrollManagerLiveness } from "@/components/agents/payroll-manager-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  ClipboardCheck,
  UserPlus,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function PayrollManagerAgentLivenessPage() {
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
            Payroll Manager Agent Liveness
          </span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-fuchsia-500" />
              Payroll Manager Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Exceptions (new starter, leaver, salary change, bonus) are exactly
              the cases most likely to get silently folded into a standard run
              if not given their own explicit flow — this management-tier agent
              catches and handles them deliberately, not automatically.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-500 mb-1">
                <UserPlus className="h-3 w-3" />
                Two Parallel Tracks
              </div>
              <p className="text-[10px] text-muted-foreground">
                Standard staff run as a simple progress count; exceptions as
                individual cards requiring explicit review — never blended.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <RefreshCw className="h-3 w-3" />
                Exceptions Never Bundled
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pro-rated pay, salary changes, and bonuses each show their own
                calculation basis with their own confirmation step — a critical
                rule, never silently absorbed.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <ShieldCheck className="h-3 w-3" />
                Statutory Rule-Table Check
              </div>
              <p className="text-[10px] text-muted-foreground">
                Statutory deductions confirmed via deterministic rule-table
                check — a jurisdiction gap flags the run held, never guessed.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Payroll Manager Agent about this run..."
            suggestions={[
              "Which exceptions are in this run?",
              "How was the new starter's pay pro-rated?",
              "Has statutory confirmation passed?",
              "Was the run approved for posting?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <PayrollManagerLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Payroll Manager Liveness Spec —
                they let you simulate different agent states to verify
                transparency at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Reviewing Exceptions</p>
                <p className="text-[8px] text-muted-foreground">
                  2 exceptions — individual review required
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Incomplete Exception</p>
                <p className="text-[8px] text-muted-foreground">
                  Missing effective date — blocking for that individual
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Jurisdiction Gap</p>
                <p className="text-[8px] text-muted-foreground">
                  No rule table for Guinea-Bissau — run held
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Approved</p>
                <p className="text-[8px] text-muted-foreground">
                  Handed to Controller Agent — terminal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
