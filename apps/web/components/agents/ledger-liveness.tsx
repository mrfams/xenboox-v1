"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Activity,
  Clock,
  BarChart3,
  Unlock,
  Sparkles,
  ScrollText,
  Eye,
  Hash,
  CalendarDays,
  Building2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export interface JournalEntryLine {
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
}

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  status: "passed" | "running" | "pending" | "rejected" | "blocked";
  confidence: number;
  detail: string;
  icon: React.ElementType;
}

export interface LedgerLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showRejection?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const DEFAULT_ENTRY: JournalEntryLine[] = [
  { account: "Office Supplies", accountCode: "5010", debit: 1250.0, credit: 0 },
  {
    account: "Accounts Payable",
    accountCode: "2010",
    debit: 0,
    credit: 1250.0,
  },
];

const DEFAULT_PIPELINE: PipelineStage[] = [
  {
    id: "double-entry",
    label: "Double-Entry Check",
    description: "Validates that total debits equal total credits",
    status: "passed",
    confidence: 1.0,
    detail: "Debits: GMD 1,250.00 = Credits: GMD 1,250.00 ✓",
    icon: BarChart3,
  },
  {
    id: "period-validation",
    label: "Period Validation",
    description: "Verifies the target fiscal period is open for posting",
    status: "passed",
    confidence: 0.98,
    detail: "Period Q2 2026 is open. Lock date: Jul 31, 2026.",
    icon: CalendarDays,
  },
  {
    id: "account-validation",
    label: "Account Validation",
    description: "Confirms all referenced accounts exist and are active",
    status: "passed",
    confidence: 0.96,
    detail: "2/2 accounts found. Active in Chart of Accounts.",
    icon: Hash,
  },
  {
    id: "entity-scope",
    label: "Entity Scoping",
    description: "Ensures the entry is scoped to the correct entity",
    status: "passed",
    confidence: 0.99,
    detail: "Entity: Xenboox HQ (ID: ent_2f8a1c). Scope verified.",
    icon: Building2,
  },
  {
    id: "posting-execution",
    label: "Posting Execution",
    description: "Executes the posting and updates account balances",
    status: "running",
    confidence: 0.92,
    detail: "Inserting journal entry #JE-2026-0842...",
    icon: ScrollText,
  },
];

const STEPS = [
  {
    step: "Step 1",
    title: "Receive Entry",
    detail:
      "Approved journal entry arrives from Controller Agent via state channel",
  },
  {
    step: "Step 2",
    title: "Validate Constraints",
    detail:
      "5 deterministic checks run in parallel: double-entry balance, period open, account exists, entity scope, no duplicates",
  },
  {
    step: "Step 3",
    title: "Score Confidence",
    detail:
      "Each gate assigns a confidence score. Below 0.7 escalates to Controller. Below 0.4 escalates to human.",
  },
  {
    step: "Step 4",
    title: "Record in Ledger",
    detail:
      "Entry written to journal_entries + journal_entry_lines tables. Account balances updated atomically.",
  },
  {
    step: "Step 5",
    title: "Confirm & Audit",
    detail:
      "Posting confirmation returned to Controller. Full audit trail written (who, what, when, confidence).",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStageStatusIcon(status: PipelineStage["status"]) {
  switch (status) {
    case "passed":
      return CheckCircle2;
    case "running":
      return Activity;
    case "pending":
      return Clock;
    case "rejected":
      return XCircle;
    case "blocked":
      return AlertTriangle;
  }
}

function getStageStatusColor(status: PipelineStage["status"]): string {
  switch (status) {
    case "passed":
      return "text-balanced-green";
    case "running":
      return "text-signal-indigo";
    case "pending":
      return "text-muted-foreground/40";
    case "rejected":
      return "text-error-clay";
    case "blocked":
      return "text-attention-amber";
  }
}

function getStageBgColor(status: PipelineStage["status"]): string {
  switch (status) {
    case "passed":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "running":
      return "bg-signal-indigo/5 border-signal-indigo/20";
    case "pending":
      return "bg-muted/30 border-border/50";
    case "rejected":
      return "bg-error-clay/5 border-error-clay/20";
    case "blocked":
      return "bg-attention-amber/5 border-attention-amber/20";
  }
}

function getConfidenceBarColor(confidence: number): string {
  if (confidence >= 0.9) return "bg-balanced-green";
  if (confidence >= 0.7) return "bg-attention-amber";
  return "bg-error-clay";
}

// ─── Sub-components ────────────────────────────────────────────────────

function ConfidenceBar({
  confidence,
  label,
}: {
  confidence: number;
  label?: string;
}) {
  const pct = Math.min(Math.max(Math.round(confidence * 100), 0), 100);
  return (
    <div
      className="flex items-center gap-2"
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Confidence: ${pct}%`}
    >
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            getConfidenceBarColor(confidence),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-medium tabular-nums min-w-[2.5rem] text-right",
          getConfidenceBarColor(confidence).replace("bg-", "text-"),
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function StageCard({ stage }: { stage: PipelineStage }) {
  const StatusIcon = getStageStatusIcon(stage.status);
  const StageIcon = stage.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-300",
        getStageBgColor(stage.status),
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              getStageStatusColor(stage.status),
            )}
          >
            {stage.status === "running" ? (
              <StageIcon className="h-4 w-4 animate-pulse" />
            ) : (
              <StageIcon className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              {stage.label}
              <StatusIcon
                className={cn("h-3 w-3", getStageStatusColor(stage.status))}
              />
            </p>
            <p className="text-[10px] text-muted-foreground">
              {stage.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pl-9">
        <p className="text-[10px] text-muted-foreground/80">{stage.detail}</p>
        <ConfidenceBar
          confidence={stage.confidence}
          label={`${stage.label} confidence: ${Math.round(stage.confidence * 100)}%`}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function LedgerLiveness({
  className,
  showEmptyState = false,
  showRejection = false,
}: LedgerLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);

  // ── Empty State ───────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ledger Agent</h2>
              <p className="text-[10px] text-muted-foreground">
                General Ledger — Posting Authority
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <BookOpen className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No entry being processed
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            The Ledger Agent is idle, waiting for approved journal entries from
            the Controller Agent.
          </p>
        </div>
      </div>
    );
  }

  // ── Rejection State ──────────────────────────────────────────────
  if (showRejection) {
    const rejectedPipeline: PipelineStage[] = DEFAULT_PIPELINE.map((stage) =>
      stage.id === "double-entry"
        ? {
            ...stage,
            status: "rejected" as const,
            confidence: 0.0,
            detail:
              "Debits: GMD 1,250.00 ≠ Credits: GMD 1,000.00. Difference: GMD 250.00",
          }
        : stage.id === "period-validation" || stage.id === "account-validation"
          ? {
              ...stage,
              status: "blocked" as const,
              confidence: 0.0,
              detail: "Blocked — prior stage failed",
            }
          : stage.id === "entity-scope"
            ? {
                ...stage,
                status: "blocked" as const,
                confidence: 0.0,
                detail: "Blocked — prior stage failed",
              }
            : { ...stage, status: "pending" as const, confidence: 0 },
    );

    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="border-b bg-gradient-to-r from-error-clay/5 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-error-clay to-red-600">
              <XCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ledger Agent</h2>
              <p className="text-[10px] text-muted-foreground">
                General Ledger — Posting Authority
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-error-clay/20 bg-error-clay/10 px-2 py-0.5 text-[9px] font-medium text-error-clay">
              <AlertTriangle className="h-2.5 w-2.5" />
              Rejected
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Rejection Banner */}
          <div className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-error-clay mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-error-clay">
                  Rejection Reason
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Double-entry constraint violation: total debits (GMD 1,250.00)
                  do not equal total credits (GMD 1,000.00). Difference of GMD
                  250.00. Entry #JE-2026-0842 has been rejected and returned to
                  Controller Agent.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Pipeline */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Validation Pipeline
            </p>
            <div className="space-y-2">
              {" "}
              {rejectedPipeline.map((stage) => (
                <StageCard key={stage.id} stage={stage} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Active State ──────────────────────────────────────────
  const totalDebit = DEFAULT_ENTRY.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = DEFAULT_ENTRY.reduce((sum, line) => sum + line.credit, 0);
  const balanced = totalDebit === totalCredit;
  const avgConfidence =
    DEFAULT_PIPELINE.reduce((sum, s) => sum + s.confidence, 0) /
    DEFAULT_PIPELINE.length;

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Ledger Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                General Ledger — Posting Authority
              </p>
            </div>
          </div>

          {/* Agent Confidence Summary */}
          <div className="hidden sm:block text-right">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Agent Confidence
            </p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                avgConfidence >= 0.9
                  ? "text-balanced-green"
                  : avgConfidence >= 0.7
                    ? "text-attention-amber"
                    : "text-error-clay",
              )}
            >
              {Math.round(avgConfidence * 100)}%
            </p>
            <p className="text-[9px] text-muted-foreground/60">
              across {DEFAULT_PIPELINE.length} gates
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4" role="region" aria-label="Agent Status">
        {/* Status + Period Info */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="region"
          aria-label="Status Information"
        >
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-balanced-green animate-pulse" />
              <span className="text-xs font-medium text-balanced-green">
                Processing
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Fiscal Period
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Unlock className="h-3 w-3 text-balanced-green" />
              <span className="text-xs font-medium">Q2 2026</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Entity
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3 w-3 text-signal-indigo" />
              <span className="text-xs font-medium truncate">Xenboox HQ</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Entry
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Hash className="h-3 w-3 text-signal-indigo" />
              <span className="text-xs font-medium font-mono">
                JE-2026-0842
              </span>
            </div>
          </div>
        </div>
        {/* Journal Entry Display */}
        <div role="region" aria-label="Journal Entry Details">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Journal Entry{" "}
              <span className="font-mono text-[9px] normal-case">
                #JE-2026-0842
              </span>
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium border",
                balanced
                  ? "bg-balanced-green/10 text-balanced-green border-balanced-green/20"
                  : "bg-error-clay/10 text-error-clay border-error-clay/20",
              )}
            >
              {balanced ? (
                <>
                  <CheckCircle2 className="h-2.5 w-2.5" /> Balanced
                </>
              ) : (
                <>
                  <XCircle className="h-2.5 w-2.5" /> Unbalanced
                </>
              )}
            </span>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-[10px]" role="table">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Account
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                    Debit
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_ENTRY.map((line, idx) => (
                  <tr
                    key={idx}
                    className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                    role="row"
                  >
                    <td className="px-3 py-2 font-medium">{line.account}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {line.accountCode}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium">
                  <td colSpan={2} className="px-3 py-2 text-xs">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        {/* Validation Pipeline */}
        <div role="region" aria-label="Validation Pipeline">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Validation Pipeline
          </h3>
          <div className="space-y-2">
            {" "}
            {DEFAULT_PIPELINE.map((stage) => (
              <StageCard key={stage.id} stage={stage} />
            ))}
          </div>
        </div>
        {/* How It Works Toggle */}
        <div className="rounded-lg border bg-accent/20 overflow-hidden">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                How It Works — Step-by-Step Decomposition
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showSteps && "rotate-180",
              )}
            />
          </button>

          {showSteps && (
            <div className="border-t px-3 py-3 space-y-2.5 animate-in slide-in-from-top-1 duration-200">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-indigo/10 text-[8px] font-bold text-signal-indigo">
                      {idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[10px] font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Constraint Enforcement Badges */}
        <div role="region" aria-label="Constraint Enforcement">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Constraint Enforcement
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                label: "Double-Entry",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
              {
                label: "Period Lock",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
              {
                label: "Account Valid",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
              {
                label: "Entity Scope",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
              {
                label: "No Duplicates",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
              {
                label: "Controller Approval",
                status: "Passed",
                color:
                  "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
              },
            ].map((badge) => (
              <span
                key={badge.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium",
                  badge.color,
                )}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {badge.label}
              </span>
            ))}
          </div>
        </div>{" "}
        {/* Liveness Footer */}
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-2.5"
          role="region"
          aria-label="Liveness Transparency"
        >
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 text-signal-indigo" />
            <span>
              Liveness transparency: All decisions shown with confidence scores.
              No black boxes. Below 0.7 confidence escalates to Controller
              Agent. Below 0.4 confidence escalates to human.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
