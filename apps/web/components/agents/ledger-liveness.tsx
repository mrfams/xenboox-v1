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
  Lock,
  Sparkles,
  ScrollText,
  Eye,
  Hash,
  CalendarDays,
  Building2,
  ArrowRight,
  ListChecks,
  Layers,
  Route,
  FileSearch,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export interface JournalEntryLine {
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
}

export type PostingState =
  | "RECEIVED"
  | "VALIDATING_ACCOUNTS"
  | "VALIDATING_BALANCE"
  | "CHECKING_PERIOD"
  | "POSTING"
  | "POSTED"
  | "REJECTED_UNBALANCED"
  | "REJECTED_INVALID_ACCOUNT"
  | "REJECTED_PERIOD_CLOSED";

export interface StateTransition {
  state: PostingState;
  timestamp: string;
  detail: string;
}

export interface LedgerLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showRejection?: PostingState | false;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const DEFAULT_ENTRY: JournalEntryLine[] = [
  { account: "Office Supplies", accountCode: "5010", debit: 1240.0, credit: 0 },
  {
    account: "Accounts Payable",
    accountCode: "2010",
    debit: 0,
    credit: 1240.0,
  },
];

const PIPELINE_STATES: Array<{
  id: PostingState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "RECEIVED",
    label: "RECEIVED",
    description: "Entry queued from source agent",
    icon: Route,
  },
  {
    id: "VALIDATING_ACCOUNTS",
    label: "VALIDATING_ACCOUNTS",
    description: "Confirming every account code exists in chart of accounts",
    icon: Hash,
  },
  {
    id: "VALIDATING_BALANCE",
    label: "VALIDATING_BALANCE",
    description: "Summing debits, summing credits, comparing equality",
    icon: BarChart3,
  },
  {
    id: "CHECKING_PERIOD",
    label: "CHECKING_PERIOD",
    description: "Confirming the accounting period is open (not closed/locked)",
    icon: CalendarDays,
  },
  {
    id: "POSTING",
    label: "POSTING",
    description: "Writing to ledger table, updating running trial balance",
    icon: ScrollText,
  },
];

const STATE_TRANSITIONS: StateTransition[] = [
  {
    state: "RECEIVED",
    timestamp: "09:42:01",
    detail: "Entry received from AP Agent for txn AP-2026-0412",
  },
  {
    state: "VALIDATING_ACCOUNTS",
    timestamp: "09:42:01",
    detail: "Account codes: [5010, 2010] — both found in COA",
  },
  {
    state: "VALIDATING_BALANCE",
    timestamp: "09:42:02",
    detail: "Debits: GMD 1,240.00 = Credits: GMD 1,240.00 ✓",
  },
  {
    state: "CHECKING_PERIOD",
    timestamp: "09:42:02",
    detail: "Period Q2 2026 is open. Lock date: Jul 31, 2026.",
  },
  {
    state: "POSTING",
    timestamp: "09:42:03",
    detail: "Writing 2 lines to journal entry #JE-2026-0842...",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "RECEIVED",
    timestamp: "09:42:01.042",
    detail:
      "posting_id: pst_b8f3, entity: Xenboox HQ, source: AP Agent, txn: AP-2026-0412",
  },
  {
    state: "VALIDATING_ACCOUNTS",
    timestamp: "09:42:01.187",
    detail: "accounts: [5010✓, 2010✓], result: pass",
  },
  {
    state: "VALIDATING_BALANCE",
    timestamp: "09:42:02.031",
    detail: "debits: 1240.00, credits: 1240.00, delta: 0.00, result: pass",
  },
  {
    state: "CHECKING_PERIOD",
    timestamp: "09:42:02.512",
    detail: "period: Q2_2026, status: open, result: pass",
  },
  {
    state: "POSTING",
    timestamp: "09:42:03.104",
    detail: "writing lines: 2, atomic: true",
  },
];

const STEPS = [
  {
    title: "Receive Entry",
    detail:
      "Input: proposed journal entry (array of {account_code, debit/credit, amount, memo, source_agent, source_txn_id}). Output: queued request with unique posting_id. No confidence score — this is a structural intake step, not a judgment.",
  },
  {
    title: "Validate Each Account Code Exists",
    detail:
      "Input: account_code list. Output: pass/fail per code, with the specific unknown code named if fail. No confidence score — deterministic check, not probabilistic.",
  },
  {
    title: "Sum and Compare Debits vs Credits",
    detail:
      "Input: full line array. Output: exact delta if unbalanced (e.g., 'short by $12.40 on credit side'). No confidence score — deterministic math, never estimated.",
  },
  {
    title: "Check Period Status",
    detail:
      "Input: entity_id + transaction date. Output: open/closed. No confidence score — database lookup.",
  },
  {
    title: "Write Posting",
    detail:
      "Input: validated entry. Output: ledger row(s) + updated running balance. No confidence score — straight write, atomic (all lines or none).",
  },
  {
    title: "Update Trial Balance",
    detail:
      "Input: new posting. Output: refreshed trial balance snapshot. No confidence score — deterministic recalculation.",
  },
];

const CONSTRAINTS = [
  { label: "Accounts Exist", icon: Hash },
  { label: "Debits = Credits (Balanced)", icon: BarChart3 },
  { label: "Period Open", icon: CalendarDays },
  { label: "Entity Scoped", icon: Building2 },
  { label: "No Duplicates", icon: FileSearch },
  { label: "Atomic Write", icon: Layers },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStateIcon(state: PostingState): React.ElementType {
  switch (state) {
    case "RECEIVED":
      return Route;
    case "VALIDATING_ACCOUNTS":
      return Hash;
    case "VALIDATING_BALANCE":
      return BarChart3;
    case "CHECKING_PERIOD":
      return CalendarDays;
    case "POSTING":
      return ScrollText;
    case "POSTED":
      return CheckCircle2;
    case "REJECTED_UNBALANCED":
      return XCircle;
    case "REJECTED_INVALID_ACCOUNT":
      return XCircle;
    case "REJECTED_PERIOD_CLOSED":
      return Lock;
  }
}

function getStateColor(state: PostingState): string {
  switch (state) {
    case "RECEIVED":
    case "VALIDATING_ACCOUNTS":
    case "VALIDATING_BALANCE":
    case "CHECKING_PERIOD":
      return "text-signal-indigo";
    case "POSTING":
      return "text-attention-amber";
    case "POSTED":
      return "text-balanced-green";
    case "REJECTED_UNBALANCED":
    case "REJECTED_INVALID_ACCOUNT":
    case "REJECTED_PERIOD_CLOSED":
      return "text-error-clay";
  }
}

const REJECTION_DETAILS: Record<
  PostingState,
  { title: string; explanation: string; route: string }
> = {
  REJECTED_UNBALANCED: {
    title: "Unbalanced Entry",
    explanation:
      "Rejected: debits ($1,240.00) ≠ credits ($1,227.60). Short $12.40 on credit side. Returned to AP Agent for correction.",
    route: "Returned to AP Agent",
  },
  REJECTED_INVALID_ACCOUNT: {
    title: "Invalid Account Code",
    explanation:
      "Rejected: account code 9999 ('Misc Expenses') does not exist in Chart of Accounts for entity Xenboox HQ. Flagged for Controller Agent review — new account or typo?",
    route: "Flagged to Controller Agent",
  },
  REJECTED_PERIOD_CLOSED: {
    title: "Period Closed",
    explanation:
      "Rejected: Period Q1 2026 is closed (locked: Apr 15, 2026). Entry cannot be posted to a closed period. Routes into Error Recovery Flow — CFO Agent notified for reopen decision.",
    route: "Escalated to CFO Agent",
  },
  // Placeholder — not used for non-rejection states
  RECEIVED: { title: "", explanation: "", route: "" },
  VALIDATING_ACCOUNTS: { title: "", explanation: "", route: "" },
  VALIDATING_BALANCE: { title: "", explanation: "", route: "" },
  CHECKING_PERIOD: { title: "", explanation: "", route: "" },
  POSTING: { title: "", explanation: "", route: "" },
  POSTED: { title: "", explanation: "", route: "" },
};

// ─── Sub-components ────────────────────────────────────────────────────

function StageIndicator({
  state,
  isActive,
  isCompleted,
}: {
  state: (typeof PIPELINE_STATES)[number];
  isActive: boolean;
  isCompleted: boolean;
}) {
  const Icon = state.icon;
  return (
    <div
      role="listitem"
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
        isActive && "bg-signal-indigo/5 border-signal-indigo/30 shadow-sm",
        isCompleted && "bg-balanced-green/5 border-balanced-green/20",
        !isActive && !isCompleted && "bg-muted/30 border-border/50 opacity-60",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
          isActive && "text-signal-indigo",
          isCompleted && "text-balanced-green",
          !isActive && !isCompleted && "text-muted-foreground/40",
        )}
      >
        {isActive ? (
          <Activity className="h-4 w-4 animate-pulse" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-mono font-semibold tracking-tight",
              isActive && "text-signal-indigo",
              isCompleted && "text-balanced-green",
              !isActive && !isCompleted && "text-muted-foreground/40",
            )}
          >
            {state.label}
          </span>
          {isCompleted && (
            <CheckCircle2 className="h-2.5 w-2.5 text-balanced-green shrink-0" />
          )}
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo animate-pulse shrink-0" />
          )}
        </div>
        <p
          className={cn(
            "text-[9px] truncate",
            (isActive || isCompleted) && "text-muted-foreground/80",
            !isActive && !isCompleted && "text-muted-foreground/40",
          )}
        >
          {state.description}
        </p>
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
  const [showAudit, setShowAudit] = useState(false);

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
          <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-md mx-auto">
            The Ledger Agent is idle, waiting for entries from worker agents
            (AP, AR, Asset, Payroll, etc.). The Ledger Agent never initiates
            work — it only receives.
          </p>
        </div>
      </div>
    );
  }

  // ── Rejection States ─────────────────────────────────────────────
  if (showRejection) {
    const rejectionType = showRejection;
    const rejection = REJECTION_DETAILS[rejectionType];

    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
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

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-error-clay/30 bg-error-clay/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10 shrink-0">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-error-clay uppercase tracking-wider">
                  Needs Attention
                </span>
                <span className="rounded-full border border-error-clay/20 bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-medium text-error-clay">
                  {rejectionType.replace("REJECTED_", "")}
                </span>
              </div>
              <p className="text-[10px] text-foreground mt-1">
                {rejection.explanation}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] text-error-clay/80 font-medium">
                  {rejection.route}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* State feed */}
        <div className="p-4 space-y-3">
          <div role="region" aria-label="Validation Pipeline">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Validation Pipeline
            </h3>
            <div className="space-y-1.5">
              {PIPELINE_STATES.map((state) => {
                const hasFailed =
                  (rejectionType === "REJECTED_UNBALANCED" &&
                    state.id === "VALIDATING_BALANCE") ||
                  (rejectionType === "REJECTED_INVALID_ACCOUNT" &&
                    state.id === "VALIDATING_ACCOUNTS") ||
                  (rejectionType === "REJECTED_PERIOD_CLOSED" &&
                    state.id === "CHECKING_PERIOD");
                const isBlocked = !hasFailed && state.id !== "RECEIVED";
                const isCompleted =
                  state.id === "RECEIVED" &&
                  rejectionType === "REJECTED_UNBALANCED";

                return (
                  <div
                    key={state.id}
                    role="listitem"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      hasFailed && "bg-error-clay/5 border-error-clay/20",
                      isBlocked && "bg-muted/30 border-border/50 opacity-50",
                      isCompleted &&
                        "bg-balanced-green/5 border-balanced-green/20",
                      !hasFailed &&
                        !isBlocked &&
                        !isCompleted &&
                        "bg-muted/30 border-border/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                        hasFailed && "text-error-clay",
                        isBlocked && "text-muted-foreground/40",
                        isCompleted && "text-balanced-green",
                      )}
                    >
                      {hasFailed ? (
                        <XCircle className="h-4 w-4" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isBlocked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Route className="h-4 w-4 text-signal-indigo" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "text-[10px] font-mono font-semibold",
                          hasFailed && "text-error-clay",
                          isBlocked && "text-muted-foreground/40 line-through",
                          isCompleted && "text-balanced-green",
                        )}
                      >
                        {state.label}
                      </span>
                      {hasFailed && (
                        <p className="text-[9px] text-error-clay/80 mt-0.5">
                          Failed — see reason above
                        </p>
                      )}
                      {isBlocked && (
                        <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                          Blocked — prior stage failed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
  const activeStateIdx = 4; // POSTING

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
                  Layer 1 — Deterministic
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                General Ledger — Posting Authority
              </p>
            </div>
          </div>

          {/* Source Agent Attribution */}
          <div className="hidden sm:block text-right">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Source Judgment
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-xs font-medium">from AP Agent</span>
              <span className="text-[9px] text-muted-foreground/60 border-l pl-1.5 ml-1.5">
                confidence: 96%
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground/60">
              Ledger Agent&apos;s own actions: 0% probabilistic
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4" role="region" aria-label="Agent Status">
        {/* Status Info Grid */}
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
              <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo animate-pulse" />
              <span className="text-xs font-medium text-signal-indigo">
                POSTING
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

        {/* Source Agent Attribution (mobile) */}
        <div className="sm:hidden rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Source
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">AP Agent</span>
            <span className="text-[9px] text-muted-foreground/60">
              confidence: 96%
            </span>
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
            <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 text-balanced-green border border-balanced-green/20 px-2 py-0.5 text-[9px] font-medium">
              <CheckCircle2 className="h-2.5 w-2.5" /> Balanced
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
                    className={cn(
                      "border-b last:border-b-0 hover:bg-accent/30 transition-colors",
                      "animate-[highlight_2.5s_ease-out]",
                    )}
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

        {/* "Why" Explanation */}
        <div
          className="rounded-lg border border-balanced-green/20 bg-balanced-green/5 p-3"
          role="region"
          aria-label="Posting Explanation"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-balanced-green mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Posted because:
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                2 lines, debits (GMD 1,240.00) = credits (GMD 1,240.00), period
                Q2 2026 is open, all account codes valid.
              </p>
              <p className="text-[9px] text-muted-foreground/60 mt-1">
                Deterministic check — no AI judgment involved in the posting
                decision. All checks are mathematical or database lookups.
              </p>
            </div>
          </div>
        </div>

        {/* Validation Pipeline */}
        <div role="region" aria-label="Validation Pipeline">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Validation Pipeline
          </h3>
          <div className="space-y-1.5">
            {PIPELINE_STATES.map((state, idx) => (
              <StageIndicator
                key={state.id}
                state={state}
                isActive={idx === activeStateIdx}
                isCompleted={idx < activeStateIdx}
              />
            ))}
          </div>
        </div>

        {/* State Transition Feed */}
        <div
          className="rounded-lg border bg-accent/20 overflow-hidden"
          role="region"
          aria-label="State Transitions Feed"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-accent/30">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-signal-indigo" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                State Transitions
              </span>
            </div>
            <span className="text-[8px] text-muted-foreground/60">
              Live feed
            </span>
          </div>
          <div className="px-3 py-2 space-y-1">
            {STATE_TRANSITIONS.map((t, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[9px]">
                <span className="text-muted-foreground/50 font-mono tabular-nums shrink-0 w-14 text-right">
                  {t.timestamp}
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold shrink-0",
                    getStateColor(t.state),
                  )}
                >
                  {t.state}
                </span>
                <span className="text-muted-foreground/70 truncate">
                  {t.detail}
                </span>
              </div>
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
            <div className="border-t px-3 py-3 space-y-2.5">
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
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
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
            Deterministic Constraints Enforced
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => {
              const Icon = c.icon;
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border bg-balanced-green/10 text-balanced-green border-balanced-green/20 px-2 py-0.5 text-[9px] font-medium"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Toggle */}
        <div className="rounded-lg border bg-accent/20 overflow-hidden">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                Audit Trail — Every State Transition Logged
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showAudit && "rotate-180",
              )}
            />
          </button>

          {showAudit && (
            <div className="border-t">
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]" role="table">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        State
                      </th>
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_TRAIL.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                        role="row"
                      >
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              getStateColor(entry.state),
                            )}
                          >
                            {entry.state}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {entry.timestamp}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/80">
                          {entry.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-1.5 border-t bg-muted/20 text-[8px] text-muted-foreground/60">
                posting_id: pst_b8f3 · entity: ent_2f8a1c · actor: Ledger Agent
              </div>
            </div>
          )}
        </div>

        {/* Liveness Footer */}
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-2.5"
          role="region"
          aria-label="Liveness Transparency"
        >
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 text-signal-indigo shrink-0" />
            <span>
              <strong className="text-muted-foreground/80">
                Layer 1 — Deterministic:
              </strong>{" "}
              The Ledger Agent carries{" "}
              <strong className="text-muted-foreground/80">
                zero confidence scores of its own
              </strong>
              . All checks are mathematical or database lookups, not AI
              judgments. Any confidence shown on posted entries belongs to the{" "}
              <strong className="text-muted-foreground/80">
                originating agent
              </strong>{" "}
              (e.g., AP Agent&apos;s vendor classification). The Ledger Agent
              never initiates work — it only receives. Rejected entries are
              permanent audit records, never deleted.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
