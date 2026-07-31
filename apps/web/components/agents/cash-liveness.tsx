"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Activity,
  Building2,
  ArrowRight,
  ListChecks,
  Eye,
  ShieldAlert,
  FileText,
  Sparkles,
  TrendingUp,
  Clock,
  FileSearch,
  Layers,
  Banknote,
  HandCoins,
  UserCheck,
  Receipt,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export type TillState =
  | "TRANSACTION_RECORDED"
  | "TILL_BALANCE_UPDATED"
  | "MATCHES_EXPECTED"
  | "DISCREPANCY_FLAGGED";

export type ImprestState =
  | "ISSUED"
  | "IN_USE"
  | "RETIREMENT_SUBMITTED"
  | "RECEIPT_MATCHING"
  | "BALANCED"
  | "VARIANCE_FLAGGED"
  | "RETIRED";

export type ReceiptKind = "matched" | "unreadable";

export interface CashLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showDiscrepancy?: boolean;
  showVariance?: boolean;
  showNegativeBalance?: boolean;
  showRetired?: boolean;
}

// ─── Active Stages ─────────────────────────────────────────────────────

const ACTIVE_TILL_STATE: TillState = "TILL_BALANCE_UPDATED";
const ACTIVE_IMPREST_STATE: ImprestState = "RECEIPT_MATCHING";

// ─── Demo Data ─────────────────────────────────────────────────────────

const TILL_PIPELINE: Array<{
  id: TillState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "TRANSACTION_RECORDED",
    label: "TRANSACTION_RECORDED",
    description:
      "Cashier logs a cash movement — amount, till/location, purpose",
    icon: Banknote,
  },
  {
    id: "TILL_BALANCE_UPDATED",
    label: "TILL_BALANCE_UPDATED",
    description:
      "Recalculating running till balance — arithmetic, no confidence score",
    icon: Wallet,
  },
];

const IMPREST_PIPELINE: Array<{
  id: ImprestState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "ISSUED",
    label: "ISSUED",
    description: "Float given to staff member — who, amount, purpose, due date",
    icon: HandCoins,
  },
  {
    id: "IN_USE",
    label: "IN_USE",
    description: "Tracking days outstanding",
    icon: Clock,
  },
  {
    id: "RETIREMENT_SUBMITTED",
    label: "RETIREMENT_SUBMITTED",
    description: "Receiving receipt batch",
    icon: FileText,
  },
  {
    id: "RECEIPT_MATCHING",
    label: "RECEIPT_MATCHING",
    description:
      "Matching each receipt to float total — per-receipt OCR confidence",
    icon: FileSearch,
  },
  {
    id: "RETIRED",
    label: "RETIRED",
    description: "Closing the imprest record — terminal for this imprest",
    icon: CheckCircle2,
  },
];

const TICKER_FEED = [
  {
    amount: "GMD 150.00",
    where: "recorded at Front Desk till",
    why: "cash sale",
  },
  {
    amount: "GMD 40.00",
    where: "recorded at Field Office till",
    why: "imprest disbursement",
  },
  {
    amount: "GMD 25.00",
    where: "recorded at Front Desk till",
    why: "taxi reimbursement",
  },
];

const IMPREST_CARDS = [
  {
    label: "Issued",
    detail: "GMD 100.00 to Fatou Jallow · field fuel · due Jul 24, 2026",
    active: false,
  },
  { label: "In Use", detail: "In use — 3 of 7 days", active: true },
  {
    label: "Retirement Pending",
    detail: "RETIREMENT_SUBMITTED · receipts submitted Jul 21",
    active: false,
  },
  { label: "Retired", detail: "GMD 50.00 · closed Jul 5, 2026", active: false },
];

const RECEIPTS: Array<{
  id: string;
  kind: ReceiptKind;
  label: string;
  amount?: string;
  confidence?: number;
  detail: string;
}> = [
  {
    id: "RCP-1",
    kind: "matched",
    label: "RCP-1",
    amount: "GMD 45.00",
    confidence: 0.92,
    detail: "Fuel receipt — amount legible, OCR confidence 92%.",
  },
  {
    id: "RCP-2",
    kind: "matched",
    label: "RCP-2",
    amount: "GMD 35.00",
    confidence: 0.87,
    detail: "Field supplies — amount legible, OCR confidence 87%.",
  },
  {
    id: "RCP-3",
    kind: "matched",
    label: "RCP-3",
    amount: "GMD 15.00",
    confidence: 0.96,
    detail: "Printing costs — amount legible, OCR confidence 96%.",
  },
  {
    id: "RCP-4",
    kind: "unreadable",
    label: "RCP-4",
    detail:
      "Couldn't read RCP-4 — amount illegible on the scan. Flagged for manual entry, never silently excluded from the retirement sum.",
  },
];

const ESCALATION_TRIGGERS = [
  {
    trigger: "Any cash discrepancy detected",
    to: "Treasury Agent / human, immediately",
    effect:
      "Same-day flag, not batched to month-end. Blocking for that till's close, non-blocking to other tills.",
  },
  {
    trigger: "Imprest variance on retirement",
    to: "Treasury Agent, department manager",
    effect:
      "Variance shown with resolution options. Blocking on that imprest's closure.",
  },
  {
    trigger: "Imprest overdue (past expected retirement date)",
    to: "Cash Agent auto-reminder → Treasury Agent",
    effect: "Reminder surfaced proactively. Non-blocking.",
  },
];

const STEPS = [
  {
    title: "Record Cash Movement",
    detail:
      "Input: amount, direction, till/location, purpose. Output: transaction record. No confidence score — direct entry, not inferred.",
  },
  {
    title: "Update Till Balance",
    detail:
      "Input: running balance + new transaction. Output: new balance. No confidence score — arithmetic.",
  },
  {
    title: "Compare Physical Count",
    detail:
      "Input: counted + system balance. Output: match or exact discrepancy amount. No confidence score — a direct comparison. Example: counted GMD 480 vs expected GMD 500 — GMD 20 short.",
  },
  {
    title: "Record Imprest Issuance",
    detail:
      "Input: staff member, amount, purpose, expected retirement date. Output: issuance record with all required fields. No confidence score.",
  },
  {
    title: "Match Retirement Receipts",
    detail:
      "Input: receipt images/amounts, float total. Output: matched sum, unaccounted amount if any. Confidence score per receipt match — OCR-derived amounts may be uncertain (per-receipt OCR confidence), but the arithmetic sum itself is not probabilistic.",
  },
  {
    title: "Flag Variance",
    detail:
      "Never silently absorbed into 'misc expense' — always shown as its own line requiring explicit resolution: repayment, write-off with a named reason, or escalation.",
  },
];

const CONSTRAINTS = [
  { label: "Variance Never Absorbed", icon: ShieldAlert },
  { label: "Exact Discrepancy Shown", icon: Eye },
  { label: "Receipts Never Silently Excluded", icon: FileSearch },
  { label: "Hard Stop on Negative Balance", icon: AlertTriangle },
  { label: "Arithmetic ≠ Probabilistic", icon: Layers },
  { label: "Same-Day Flags", icon: TrendingUp },
];

const AUDIT_TRAIL = [
  {
    ref: "TXN-2026-0511",
    event: "cash movement",
    detail: "cash movement · GMD 150.00 in · Front Desk till · cash sale",
    confidence: "—",
    ts: "08:41:12.104",
  },
  {
    ref: "TXN-2026-0512",
    event: "cash movement",
    detail:
      "cash movement · GMD 40.00 out · Field Office till · imprest disbursement",
    confidence: "—",
    ts: "09:03:44.221",
  },
  {
    ref: "COUNT-2026-0211",
    event: "physical count",
    detail:
      "physical count · counted GMD 480 vs expected GMD 500 · delta -GMD 20.00",
    confidence: "—",
    ts: "14:15:00.502",
  },
  {
    ref: "IMP-2026-0887",
    event: "imprest issued",
    detail:
      "imprest issued · GMD 100.00 to Fatou Jallow · field fuel · due Jul 24",
    confidence: "—",
    ts: "10:02:11.003",
  },
  {
    ref: "RCP-1",
    event: "receipt matched",
    detail: "receipt matched · RCP-1 · GMD 45.00 · OCR confidence 92%",
    confidence: "92%",
    ts: "11:20:33.710",
  },
  {
    ref: "RCP-2",
    event: "receipt matched",
    detail: "receipt matched · RCP-2 · GMD 35.00 · OCR confidence 87%",
    confidence: "87%",
    ts: "11:20:34.118",
  },
  {
    ref: "RCP-4",
    event: "receipt unreadable",
    detail:
      "receipt unreadable · RCP-4 · flagged for manual entry — never silently excluded",
    confidence: "—",
    ts: "11:21:02.450",
  },
  {
    ref: "IMP-2026-0887",
    event: "variance flagged",
    detail: "variance flagged · GMD 5.00 unaccounted · pending resolution",
    confidence: "—",
    ts: "11:21:05.003",
  },
  {
    ref: "IMP-2026-0887",
    event: "human",
    detail:
      "confirmed by human · variance repaid · Fatou Jallow · A. Jammeh (Treasury)",
    confidence: "—",
    ts: "11:52:00.410",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getTillColor(state: TillState): string {
  switch (state) {
    case "DISCREPANCY_FLAGGED":
      return "text-error-clay";
    case "MATCHES_EXPECTED":
      return "text-balanced-green";
    default:
      return "text-signal-indigo";
  }
}

function getTillBg(state: TillState): string {
  switch (state) {
    case "DISCREPANCY_FLAGGED":
      return "bg-error-clay/5 border-error-clay/20";
    case "MATCHES_EXPECTED":
      return "bg-balanced-green/5 border-balanced-green/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

function getImprestColor(state: ImprestState): string {
  switch (state) {
    case "BALANCED":
      return "text-balanced-green";
    case "VARIANCE_FLAGGED":
      return "text-attention-amber";
    case "RETIRED":
      return "text-balanced-green";
    default:
      return "text-signal-indigo";
  }
}

function getImprestBg(state: ImprestState): string {
  switch (state) {
    case "BALANCED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "VARIANCE_FLAGGED":
      return "bg-attention-amber/5 border-attention-amber/20";
    case "RETIRED":
      return "bg-balanced-green/5 border-balanced-green/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function TillBadge({ state }: { state: TillState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getTillColor(state),
        getTillBg(state),
      )}
    >
      {state === "DISCREPANCY_FLAGGED" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "MATCHES_EXPECTED" && (
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      )}
      {state}
    </span>
  );
}

function ImprestBadge({ state }: { state: ImprestState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getImprestColor(state),
        getImprestBg(state),
      )}
    >
      {state === "BALANCED" && (
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "VARIANCE_FLAGGED" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "RETIRED" && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
      {state}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function CashLiveness({
  className,
  showEmptyState = false,
  showDiscrepancy = false,
  showVariance = false,
  showNegativeBalance = false,
  showRetired = false,
}: CashLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Wallet className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Cash Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Cash & Imprest Management
          </p>
        </div>
      </div>
    </div>
  );

  // ── Empty State ───────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No active cash activity
          </p>
          <p className="mx-auto mt-1 max-w-md text-[10px] text-muted-foreground/60">
            The Cash Agent is idle — no till transactions or imprests in flight.
            Live transaction recording, till balances, count comparisons, and
            imprest retirement matching appear here the moment activity starts.
          </p>
        </div>
      </div>
    );
  }

  // ── Discrepancy State ─────────────────────────────────────────────
  if (showDiscrepancy) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-error-clay/30 bg-error-clay/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error-clay">
                  Discrepancy Flagged
                </span>
                <span className="rounded-full border border-error-clay/20 bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-medium text-error-clay">
                  DISCREPANCY_FLAGGED
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Discrepancy flagged: physical count GMD 480 vs system balance
                GMD 500 at Front Desk till, 2:15pm — GMD 20 short, unresolved.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] font-medium text-error-clay/80">
                  Escalated to Treasury Agent immediately — same-day flag, not
                  batched to month-end
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Flagged Discrepancy">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Count vs System
            </h3>
            <div
              className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3"
              data-till-state="discrepancy"
            >
              <p className="text-[10px] font-medium text-error-clay">
                Counted GMD 480 vs expected GMD 500 — GMD 20 short
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Direct comparison, not a judgment — no confidence score.
                Blocking for that till&apos;s close; non-blocking to other
                tills.
              </p>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">
                  Same-day rule:
                </strong>{" "}
                discrepancies are flagged immediately, not batched to month-end
                — blocking for that till&apos;s close, non-blocking to other
                tills.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Imprest Variance State ────────────────────────────────────────
  if (showVariance) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Attention Strip */}
        <div className="border-b-2 border-attention-amber/30 bg-attention-amber/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-amber/10">
              <AlertTriangle className="h-4 w-4 text-attention-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-attention-amber">
                  Variance Flagged
                </span>
                <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                  VARIANCE_FLAGGED
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Imprest retirement: GMD 100.00 issued, GMD 95.00 in matched
                receipts, GMD 5.00 unaccounted — flagged for Fatou Jallow to
                explain or repay.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                <span className="text-[9px] font-medium text-attention-amber/80">
                  Escalated to Treasury Agent + department manager — blocking on
                  that imprest&apos;s closure
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Variance">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Variance — Never Absorbed
            </h3>
            <div className="rounded-lg border border-attention-amber/20 bg-attention-amber/5 p-3">
              <p
                className="text-[10px] font-semibold text-attention-amber"
                data-variance-amount
              >
                GMD 5.00 unaccounted
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Never silently absorbed into &quot;misc expense.&quot; Always
                shown as its own line requiring explicit resolution: repay,
                write off with a named reason, or escalate to Treasury Agent.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                  repay
                </span>
                <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                  write off with a named reason
                </span>
                <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                  escalate to Treasury Agent
                </span>
              </div>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">
                  Variance rule:
                </strong>{" "}
                never silently absorbed into &quot;misc expense&quot; — shown
                explicitly and blocking on that imprest&apos;s closure until
                resolved.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Negative Balance Hard-Stop State ──────────────────────────────
  if (showNegativeBalance) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Hard Stop Strip */}
        <div className="border-b-2 border-error-clay/30 bg-error-clay/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error-clay">
                  Negative Till Balance — Hard Stop
                </span>
                <span className="rounded-full border border-error-clay/20 bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-medium text-error-clay">
                  BLOCKED
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Transaction of GMD 40.00 at Field Office till would push the
                running balance to -GMD 20.00. Recorded expenditure exceeds
                recorded cash on hand — not allowed to post silently.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] font-medium text-error-clay/80">
                  Hard stop — flagged immediately, transaction parked until
                  resolved
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Hard Stop">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hard Stop — Never Posts Silently
            </h3>
            <div className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3">
              <p className="text-[10px] font-medium text-error-clay">
                Negative till balance: GMD 520.00 expenditure vs GMD 500.00 cash
                on hand — would post -GMD 20.00
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Blocked immediately. The transaction cannot post until cash is
                added or the amount is corrected — never silently clamps to
                zero, never silently posts negative.
              </p>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">Hard stop:</strong>{" "}
                a negative till balance is not allowed to post silently — it is
                flagged immediately and parked until resolved.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Terminal Retired State ────────────────────────────────────────
  if (showRetired) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Cash Agent</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    RETIRED
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cash & Imprest Management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Retired summary */}
        <div className="space-y-3 p-4" role="region" aria-label="Agent Status">
          <div className="rounded-lg border border-balanced-green/25 bg-balanced-green/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              <p className="text-xs font-semibold text-balanced-green">
                Imprest retired
              </p>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Imprest IMP-2026-0887 · GMD 100.00 to Fatou Jallow · closed after
              variance resolved (repaid GMD 5.00). Imprest closed — terminal for
              this record. Journal entries handed to Ledger Agent.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[9px]">
              <ArrowRight className="h-2.5 w-2.5 text-balanced-green/60" />
              <span className="font-medium text-balanced-green/80">
                Ledger Agent — posting follows retirement
              </span>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">Audit:</strong>{" "}
                every cash movement, count/discrepancy event, and the full
                imprest lifecycle — including the variance resolution method
                (repaid, written off with reason + approver) — are logged and
                preserved.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Active Run State ──────────────────────────────────────
  const tillActiveIdx = TILL_PIPELINE.findIndex(
    (s) => s.id === ACTIVE_TILL_STATE,
  );
  const imprestActiveIdx = IMPREST_PIPELINE.findIndex(
    (s) => s.id === ACTIVE_IMPREST_STATE,
  );

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Cash Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Physical cash, live
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Cash & Imprest Management
              </p>
            </div>
          </div>

          {/* Till attribution */}
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Till
            </p>
            <p className="text-xs font-medium">Front Desk till</p>
            <p className="text-[9px] text-muted-foreground/60">
              Xenboox HQ · GMD
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4" role="region" aria-label="Agent Status">
        {/* Status Info Grid */}
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="region"
          aria-label="Status Information"
        >
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
              <span className="text-xs font-medium text-signal-indigo">
                RECEIPT_MATCHING
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Till
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Wallet className="h-3 w-3 text-signal-indigo" />
              <span className="truncate text-xs font-medium">
                Front Desk till
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Entity
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-signal-indigo" />
              <span className="truncate text-xs font-medium">Xenboox HQ</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Source
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">
                Cashier / Field Officer
              </span>
            </div>
          </div>
        </div>

        {/* Cash Position Ticker */}
        <div
          className="rounded-lg border border-border/60 bg-accent/20 p-2.5"
          role="region"
          aria-label="Cash Position Ticker"
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cash Position Ticker — updating live, not a static end-of-day number
          </p>
          <div className="mt-1.5 space-y-1">
            {TICKER_FEED.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-[10px]"
                data-step="ticker"
              >
                <Banknote className="h-3 w-3 shrink-0 text-balanced-green" />
                <span className="font-medium text-foreground">{t.amount}</span>
                <span className="text-muted-foreground/70">
                  {t.where} — {t.why}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[8px] text-muted-foreground/60">
            Running balance recalculation is arithmetic — no confidence score.
          </p>
        </div>

        {/* Cross-Agent Handoff */}
        <div className="rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cross-Agent Handoff Chain
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-medium">Cashier</span>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-medium">Field Officer</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Cash Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Ledger Agent</span>
            <span className="ml-1 text-muted-foreground/70">
              — Treasury Agent pulls Cash Agent&apos;s live data for the daily
              position roll-up
            </span>
          </div>
        </div>

        {/* Till State Machine */}
        <div role="region" aria-label="Till State Machine">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Till / Cash Position — one lifecycle
          </h3>
          <div className="space-y-1.5" role="list">
            {TILL_PIPELINE.map((state, idx) => (
              <div
                key={state.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  idx === tillActiveIdx &&
                    "border-signal-indigo/30 bg-signal-indigo/5 shadow-sm",
                  idx < tillActiveIdx &&
                    "border-balanced-green/20 bg-balanced-green/5",
                  idx > tillActiveIdx &&
                    "border-border/50 bg-muted/30 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    idx === tillActiveIdx && "text-signal-indigo",
                    idx < tillActiveIdx && "text-balanced-green",
                    idx > tillActiveIdx && "text-muted-foreground/40",
                  )}
                >
                  {idx === tillActiveIdx ? (
                    <Activity className="h-4 w-4 animate-pulse" />
                  ) : idx < tillActiveIdx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <state.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <TillBadge state={state.id} />
                    {idx === tillActiveIdx && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-indigo" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[9px]",
                      idx <= tillActiveIdx
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {state.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Till outcome branch */}
          <div className="mt-1.5 flex items-start gap-3 rounded-lg border border-border/60 bg-accent/20 p-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-signal-indigo">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[8px] text-muted-foreground/70">
                <span>
                  count outcome — direct comparison, exact discrepancy
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <TillBadge state="MATCHES_EXPECTED" />
                <TillBadge state="DISCREPANCY_FLAGGED" />
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-error-clay" />
              </div>
              <p className="mt-0.5 text-[8px] text-muted-foreground/60">
                Any discrepancy is flagged same-day, never batched to month-end.
              </p>
            </div>
          </div>

          {/* Discrepancy example */}
          <div
            className="mt-1.5 rounded-lg border border-error-clay/25 bg-error-clay/5 p-2.5"
            data-till-state="discrepancy"
          >
            <p className="text-[9px] font-medium text-error-clay">
              Discrepancy flagged: physical count GMD 480 vs system balance GMD
              500 at Front Desk till, 2:15pm — GMD 20 short, unresolved.
            </p>
            <p className="mt-0.5 text-[8px] text-muted-foreground/70">
              Same-day flag — not batched to month-end. Blocking for that
              till&apos;s close; non-blocking to other tills.
            </p>
          </div>

          {/* Negative balance hard stop */}
          <div className="mt-1.5 rounded-lg border border-error-clay/25 bg-error-clay/5 p-2.5">
            <p className="text-[9px] font-bold text-error-clay">
              Negative Till Balance — Hard Stop
            </p>
            <p className="mt-0.5 text-[8px] text-muted-foreground/70">
              Recorded expenditure GMD 520.00 exceeds recorded cash on hand GMD
              500.00 — not allowed to post silently. Hard stop, flagged
              immediately, parked until resolved.
            </p>
          </div>
        </div>

        {/* Imprest State Machine */}
        <div role="region" aria-label="Imprest State Machine">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Imprest — float lifecycle
          </h3>
          <div className="space-y-1.5" role="list">
            {IMPREST_PIPELINE.map((state, idx) => (
              <div
                key={state.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  idx === imprestActiveIdx &&
                    "border-signal-indigo/30 bg-signal-indigo/5 shadow-sm",
                  idx < imprestActiveIdx &&
                    "border-balanced-green/20 bg-balanced-green/5",
                  idx > imprestActiveIdx &&
                    "border-border/50 bg-muted/30 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    idx === imprestActiveIdx && "text-signal-indigo",
                    idx < imprestActiveIdx && "text-balanced-green",
                    idx > imprestActiveIdx && "text-muted-foreground/40",
                  )}
                >
                  {idx === imprestActiveIdx ? (
                    <Activity className="h-4 w-4 animate-pulse" />
                  ) : idx < imprestActiveIdx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <state.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImprestBadge state={state.id} />
                    {idx === imprestActiveIdx && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-indigo" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[9px]",
                      idx <= imprestActiveIdx
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {state.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Imprest outcome branch */}
          <div className="mt-1.5 flex items-start gap-3 rounded-lg border border-border/60 bg-accent/20 p-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-signal-indigo">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[8px] text-muted-foreground/70">
                <span>matching outcome — variance never absorbed</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <ImprestBadge state="BALANCED" />
                <ImprestBadge state="VARIANCE_FLAGGED" />
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-attention-amber" />
              </div>
              <p className="mt-0.5 text-[8px] text-muted-foreground/60">
                A variance is shown as its own line requiring explicit
                resolution — never folded into a rounded total.
              </p>
            </div>
          </div>
        </div>

        {/* Imprest Card-Based Lifecycle Tracker */}
        <div role="region" aria-label="Imprest Lifecycle">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Imprest Lifecycle — Card Tracker
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {IMPREST_CARDS.map((card) => (
              <div
                key={card.label}
                className={cn(
                  "rounded-lg border p-2.5",
                  card.active
                    ? "border-signal-indigo/30 bg-signal-indigo/5"
                    : "border-border/60 bg-accent/20",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {card.active ? (
                    <Activity className="h-3 w-3 text-signal-indigo" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-semibold text-foreground">
                    {card.label}
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Receipt Matching */}
        <div role="region" aria-label="Receipt Matching">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Receipt Matching — Per-Receipt OCR Confidence
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              receipts carry OCR confidence · the sum is arithmetic
            </span>
          </div>
          <div className="space-y-1.5">
            {RECEIPTS.map((r) => (
              <div
                key={r.id}
                data-receipt-kind={r.kind}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2.5",
                  r.kind === "unreadable"
                    ? "border-attention-amber/25 bg-attention-amber/5"
                    : "border-border/60 bg-accent/20",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    r.kind === "unreadable"
                      ? "bg-attention-amber/10 text-attention-amber"
                      : "bg-balanced-green/10 text-balanced-green",
                  )}
                >
                  {r.kind === "unreadable" ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <Receipt className="h-3 w-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-medium text-foreground">
                      {r.id}
                    </span>
                    {r.amount && (
                      <span className="text-[10px] font-semibold text-foreground">
                        {r.amount}
                      </span>
                    )}
                    {r.kind === "unreadable" && (
                      <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                        flagged for manual entry
                      </span>
                    )}
                    {r.confidence !== undefined && (
                      <span
                        role="meter"
                        aria-label={`OCR confidence ${Math.round(
                          r.confidence * 100,
                        )}% for ${r.id}`}
                        aria-valuenow={Math.round(r.confidence * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="shrink-0 rounded-full border border-signal-indigo/30 bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-bold text-signal-indigo"
                      >
                        OCR {Math.round(r.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                    {r.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Sum + variance — deterministic arithmetic, no meters */}
          <div
            className="mt-2 rounded-lg border border-border/60 bg-accent/20 p-2.5"
            data-step="sum"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-foreground">
                Matched: GMD 95.00 matched of GMD 100.00 issued
              </span>
              <span className="text-[8px] text-muted-foreground/60">
                arithmetic — no confidence score
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-md border border-attention-amber/30 bg-attention-amber/10 px-2 py-1.5">
              <span
                className="text-[10px] font-bold text-attention-amber"
                data-variance-amount
              >
                GMD 5.00 unaccounted
              </span>
              <span className="text-[8px] text-attention-amber/80">
                never hidden in a rounded total
              </span>
            </div>
          </div>
        </div>

        {/* Variance Resolution */}
        <div
          className="rounded-lg border bg-accent/20"
          role="region"
          aria-label="Variance Resolution"
        >
          <div className="flex items-center gap-1.5 border-b bg-accent/30 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Variance Resolution — Never Absorbed
            </span>
          </div>
          <div className="space-y-1.5 px-3 py-2">
            <p className="text-[9px] text-muted-foreground">
              GMD 5.00 unaccounted — flagged for Fatou Jallow to explain or
              repay. Blocking on that imprest&apos;s closure.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                repay
              </span>
              <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                write off with a named reason
              </span>
              <span className="rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber">
                escalate to Treasury Agent
              </span>
            </div>
            <p className="text-[8px] text-muted-foreground/70">
              Never silently absorbed into &quot;misc expense&quot; — always its
              own line requiring explicit resolution.
            </p>
          </div>
        </div>

        {/* Escalation & Human-in-the-Loop Triggers */}
        <div
          className="rounded-lg border bg-accent/20"
          role="region"
          aria-label="Escalation & Human-in-the-Loop Triggers"
        >
          <div className="flex items-center gap-1.5 border-b bg-accent/30 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Escalation &amp; Human-in-the-Loop Triggers
            </span>
          </div>
          <div className="space-y-1 px-3 py-2">
            {ESCALATION_TRIGGERS.map((t, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-card p-2 text-[9px]"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.trigger}</p>
                  <p className="mt-0.5 text-signal-indigo">
                    Escalates to: {t.to}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{t.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
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
            <div className="space-y-2.5 border-t px-3 py-3">
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
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-attention-amber/30 bg-attention-amber/5 p-2">
                <p className="text-[9px] leading-relaxed text-attention-amber">
                  Critical rule: a variance is never silently absorbed into
                  &quot;misc expense&quot; — it is always shown as its own line
                  requiring explicit resolution, and a negative till balance is
                  a hard stop, never posted silently.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Constraint Enforcement Badges */}
        <div role="region" aria-label="Constraint Enforcement">
          <h3 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deterministic Constraints Enforced
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => {
              const Icon = c.icon;
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border border-balanced-green/20 bg-balanced-green/10 px-2 py-0.5 text-[9px] font-medium text-balanced-green"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                Audit Trail — Every Event Logged
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
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Reference
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Event
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Detail
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Confidence
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_TRAIL.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 transition-colors hover:bg-accent/30"
                        role="row"
                      >
                        <td className="px-3 py-1.5 font-medium">{entry.ref}</td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              entry.event === "human"
                                ? "text-balanced-green"
                                : entry.event === "variance flagged"
                                  ? "text-attention-amber"
                                  : entry.event === "physical count"
                                    ? "text-error-clay"
                                    : "text-muted-foreground",
                            )}
                          >
                            {entry.event}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/80">
                          {entry.detail}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/70">
                          {entry.confidence}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {entry.ts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-muted/20 px-3 py-1.5 text-[8px] text-muted-foreground/60">
                entity: ent_2f8a1c · actor: Cash Agent · source: Cashier / Field
                Officer · every cash movement, count/discrepancy event, and
                imprest lifecycle stage logged · variance resolutions preserved
                (repaid / written off with reason + approver), never overwritten
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
            <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
            <span>
              <strong className="text-muted-foreground/80">
                Layer 1 — Deterministic:
              </strong>{" "}
              cash movement recording, till balance arithmetic, count
              comparison, imprest issuance, and receipt sums carry no confidence
              score of their own.{" "}
              <strong className="text-muted-foreground/80">
                Layer 2 — Probabilistic:
              </strong>{" "}
              per-receipt OCR confidence (92% / 87% / 96%) is labeled on each
              matched receipt — but the arithmetic sum itself is not
              probabilistic. Variances are never absorbed into misc expense;
              negative balances are a hard stop.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
