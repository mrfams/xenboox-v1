"use client";

import { PayrollWorkerLiveness } from "@/components/agents/payroll-worker-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Users,
  Shield,
  BarChart3,
  ExternalLink,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function PayrollWorkerLivenessPage() {
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
            Payroll Worker Agent Liveness
          </span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-signal-indigo" />
              Payroll Worker Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the Payroll Worker Agent&apos;s
              per-staff processing pipeline. Every deduction is decomposed into
              its own deterministic calculation with the rule and band applied —
              never a silent lump sum.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Shield className="h-3 w-3" />
                No Lumped Deductions
              </div>
              <p className="text-[10px] text-muted-foreground">
                PAYE, social security, and loan installments each run as their
                own discrete calculation against their own stored rate table —
                never blended into one inferred number.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <BarChart3 className="h-3 w-3" />
                Every Number Explainable
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each deduction line carries a &quot;Why&quot; — the exact band,
                rate, and taxable base that produced it. Statutory formulas,
                never AI estimates.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <FileText className="h-3 w-3" />
                Exceptions Never Silent
              </div>
              <p className="text-[10px] text-muted-foreground">
                New starters, leavers, salary changes, and bonuses are each
                their own explicit sub-flow requiring Payroll Manager Agent
                sign-off.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Payroll Worker Agent about a payslip..."
            suggestions={[
              "Show me July 2026 payroll progress",
              "Why was PAYE GMD 84.20 for Awa Jallow?",
              "Which staff are exception-flagged this period?",
              "Explain the SSHFC calculation",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <PayrollWorkerLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Payroll Liveness Spec — they let
                you simulate different agent states to verify transparency at
                every stage of the per-staff state machine.
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
                <p className="text-[10px] font-medium">Run In Progress</p>
                <p className="text-[8px] text-muted-foreground">
                  DEDUCTIONS_CALCULATED active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Exception Flagged</p>
                <p className="text-[8px] text-muted-foreground">
                  Payroll Manager sign-off
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Idle</p>
                <p className="text-[8px] text-muted-foreground">
                  No run in progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
