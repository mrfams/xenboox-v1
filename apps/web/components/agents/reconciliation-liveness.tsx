"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Activity,
  FileSearch,
  CalendarDays,
  Building2,
  ArrowRight,
  ListChecks,
  Layers,
  Eye,
  Link2,
  Unlink,
  ShieldAlert,
  Percent,
  Banknote,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export type ReconState =
  | "STATEMENT_INGESTED"
  | "MATCHING_PASS_1"
  | "MATCHING_PASS_2"
  | "BUCKETING_UNMATCHED"
  | "AWAITING_TREASURY_REVIEW"
  | "CLOSED";

export type MatchKind = "exact" | "fuzzy" | "unmatched";

export type UnmatchedBucket =
  | "timing"
  | "missing_entry"
  | "duplicate"
  | "amount_mismatch"
  | "unclassified";

export interface MatchLine {
  id: string;
  kind: MatchKind;
  bankDate: string;
  bankAmount: number;
  bankDescription: string;
  reference?: string;
  ledgerDate?: string;
  ledgerEntry?: string;
  confidence?: number; // fuzzy only
  criteria: string[];
  why: string;
  bucket?: UnmatchedBucket;
  bucketLabel?: string;
}

export interface ReconciliationLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showParseError?: boolean;
  showTreasuryReview?: boolean;
  showClosed?: boolean;
}

// ─── Active Stage ──────────────────────────────────────────────────────

const ACTIVE_STATE: ReconState = "BUCKETING_UNMATCHED";

// ─── Demo Data ─────────────────────────────────────────────────────────

const MATCH_LINES: MatchLine[] = [
  {
    id: "ln_01",
    kind: "exact",
    bankDate: "June 14",
    bankAmount: 1240.0,
    bankDescription: "Supplier payment — WV Enterprises",
    reference: "#WV-88213",
    ledgerDate: "June 14",
    ledgerEntry: "JE-2026-0311",
    criteria: ["amount", "date", "reference"],
    why: "Matched: bank line GMD 1,240.00 (June 14) ↔ ledger entry GMD 1,240.00 (June 14), reference #WV-88213 identical on both.",
  },
  {
    id: "ln_02",
    kind: "fuzzy",
    bankDate: "June 18",
    bankAmount: 450.0,
    bankDescription: "Consulting fee — J. Mendy",
    ledgerDate: "June 15",
    ledgerEntry: "JE-2026-0318",
    confidence: 0.82,
    criteria: [
      "amount",
      "date within 3-day window",
      "no reference on bank side",
    ],
    why: "Fuzzy matched (82% confidence): bank line GMD 450.00 (June 18) ↔ ledger entry GMD 450.00 (June 15) — amount exact, date within 3-day window, no reference on bank side.",
  },
  {
    id: "ln_03",
    kind: "unmatched",
    bankDate: "June 30",
    bankAmount: 200.0,
    bankDescription: "Client refund",
    bucket: "timing",
    bucketLabel: "Likely timing difference",
    criteria: ["no candidate within window"],
    why: "Unmatched, bucketed as 'likely timing difference': GMD 200.00 appears on bank statement June 30 with no corresponding ledger entry — may post next period.",
  },
  {
    id: "ln_04",
    kind: "unmatched",
    bankDate: "June 5",
    bankAmount: 75.0,
    bankDescription: "Bank charges",
    bucket: "missing_entry",
    bucketLabel: "No matching ledger entry",
    criteria: ["no candidate within window"],
    why: "No matching ledger entry found for GMD 75.00 bank charges — verify the charge was posted to the general ledger.",
  },
  {
    id: "ln_05",
    kind: "unmatched",
    bankDate: "June 12",
    bankAmount: 150.0,
    bankDescription: "POS withdrawal ×2",
    bucket: "duplicate",
    bucketLabel: "Duplicate suspected",
    criteria: ["two bank lines match one ledger entry"],
    why: "Duplicate suspected: two statement lines of GMD 75.00 (June 12) both point at the same GMD 150.00 ledger entry. Flagged for Treasury Agent — not silently resolved.",
  },
];

const BUCKET_META: Record<
  UnmatchedBucket,
  { label: string; confidence: number }
> = {
  timing: { label: "Likely timing difference", confidence: 0.78 },
  missing_entry: { label: "No matching ledger entry", confidence: 0.88 },
  duplicate: { label: "Duplicate suspected", confidence: 0.72 },
  amount_mismatch: { label: "Amount mismatch", confidence: 0.64 },
  unclassified: { label: "Unclassified", confidence: 0.5 },
};

const PIPELINE_STATES: Array<{
  id: ReconState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "STATEMENT_INGESTED",
    label: "STATEMENT_INGESTED",
    description:
      "Bank statement uploaded or pulled — 214 lines parsed and normalized",
    icon: FileText,
  },
  {
    id: "MATCHING_PASS_1",
    label: "MATCHING_PASS_1",
    description:
      "Exact matches: amount + date + reference all agree — deterministic",
    icon: Link2,
  },
  {
    id: "MATCHING_PASS_2",
    label: "MATCHING_PASS_2",
    description:
      "Fuzzy matches: amount + date window (±3 days) or payee similarity — probabilistic",
    icon: Percent,
  },
  {
    id: "BUCKETING_UNMATCHED",
    label: "BUCKETING_UNMATCHED",
    description:
      "Remaining unmatched grouped by reason — timing / missing entry / duplicate / amount mismatch",
    icon: FileSearch,
  },
  {
    id: "AWAITING_TREASURY_REVIEW",
    label: "AWAITING_TREASURY_REVIEW",
    description: "Waiting — never auto-closes with unresolved items",
    icon: ShieldAlert,
  },
  {
    id: "CLOSED",
    label: "CLOSED",
    description:
      "Treasury Agent confirms all items resolved (matched or explicitly written off)",
    icon: CheckCircle2,
  },
];

const UNMATCHED_LINE_COUNT = MATCH_LINES.filter(
  (l) => l.kind === "unmatched",
).length;

const ESCALATION_TRIGGERS = [
  {
    trigger: "Any unmatched item remains after both passes",
    to: "Treasury Agent",
    effect: `Blocking — reconciliation cannot reach CLOSED state. ${UNMATCHED_LINE_COUNT} items currently unresolved.`,
  },
  {
    trigger: "Fuzzy match confidence below threshold",
    to: "Treasury Agent + human",
    effect:
      "Shown as 'needs confirmation' rather than auto-accepted. Blocking for that line.",
  },
  {
    trigger: "Duplicate bank line suspected (two lines → one ledger entry)",
    to: "Treasury Agent",
    effect: "Explicit duplicate flag — never silently resolved. Blocking.",
  },
];

const STEPS = [
  {
    title: "Parse Statement",
    detail:
      "Input: raw file/API data. Output: normalized line array {date, amount, reference, description}. No confidence score — deterministic parsing; parse failures flagged explicitly.",
  },
  {
    title: "Exact Match Pass",
    detail:
      "Input: statement lines + open ledger entries. Output: matched pairs where amount, date, and reference all agree exactly. Confidence: 100% by definition — still shown with criteria, not just 'matched'.",
  },
  {
    title: "Fuzzy Match Pass",
    detail:
      "Input: remaining unmatched lines. Output: candidate matches on amount + date-window OR amount + payee similarity. Confidence score attached — genuinely probabilistic and labeled as such (e.g. 82%).",
  },
  {
    title: "Bucket Remaining Unmatched",
    detail:
      "Input: still-unmatched lines. Output: reason-tagged buckets (timing / missing entry / duplicate / amount mismatch). A classification step — gets its own confidence score, never silently assumed.",
  },
  {
    title: "Never Auto-Close",
    detail:
      "Structural rule, not a step: this agent is not permitted to transition to CLOSED on its own. Only Treasury Agent (with human visibility) can confirm closure.",
  },
];

const CONSTRAINTS = [
  { label: "Exact ≠ Fuzzy Weight", icon: Link2 },
  { label: "Pass 1 / Pass 2 Separate", icon: Layers },
  { label: "Never Auto-Closes", icon: Lock },
  { label: "Criteria Always Shown", icon: Eye },
  { label: "Buckets Grouped", icon: FileSearch },
  { label: "Overrides Preserved", icon: ListChecks },
];

const AUDIT_TRAIL = [
  {
    line: "WV-88213 · GMD 1,240.00",
    matchType: "exact",
    pass: 1,
    confidence: "100%",
    ts: "09:00:01.104",
    detail: "match_type: exact · criteria: amount+date+reference · pass: 1",
  },
  {
    line: "J. Mendy · $450.00",
    matchType: "fuzzy",
    pass: 2,
    confidence: "82%",
    ts: "09:00:02.512",
    detail: "match_type: fuzzy · criteria: amount+date(±3d) · pass: 2",
  },
  {
    line: "Client refund · GMD 200.00",
    matchType: "unmatched",
    pass: 2,
    confidence: "78%",
    ts: "09:00:02.891",
    detail: "bucket: timing · reason: may post next period · pass: 2",
  },
  {
    line: "POS withdrawal · GMD 150.00",
    matchType: "unmatched",
    pass: 2,
    confidence: "72%",
    ts: "09:00:03.120",
    detail: "bucket: duplicate · two lines → one ledger entry · pass: 2",
  },
  {
    line: "J. Mendy · $450.00",
    matchType: "human_override",
    pass: 2,
    confidence: "—",
    ts: "09:14:22.003",
    detail: "original: fuzzy 82% · override: manual · both records preserved",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  // GMD to match the platform's Gambian currency convention (see Ledger Liveness)
  return `GMD ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStateColor(state: ReconState): string {
  switch (state) {
    case "STATEMENT_INGESTED":
    case "MATCHING_PASS_1":
    case "MATCHING_PASS_2":
    case "BUCKETING_UNMATCHED":
      return "text-signal-indigo";
    case "AWAITING_TREASURY_REVIEW":
      return "text-attention-amber";
    case "CLOSED":
      return "text-balanced-green";
  }
}

function getStateBg(state: ReconState): string {
  switch (state) {
    case "CLOSED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "AWAITING_TREASURY_REVIEW":
      return "bg-attention-amber/5 border-attention-amber/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: ReconState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state === "AWAITING_TREASURY_REVIEW" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "CLOSED" && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
      {state}
    </span>
  );
}

function MatchRow({ line }: { line: MatchLine }) {
  const isExact = line.kind === "exact";
  const isFuzzy = line.kind === "fuzzy";
  const isUnmatched = line.kind === "unmatched";

  return (
    <div
      data-match-kind={line.kind}
      className={cn(
        "rounded-lg border p-2.5",
        isExact && "border-balanced-green/25 bg-balanced-green/5",
        isFuzzy && "border-attention-amber/25 bg-attention-amber/5",
        isUnmatched && "border-border/60 bg-accent/20",
      )}
    >
      {/* Bank line */}
      <div className="flex items-center gap-2 text-[10px]">
        <Banknote className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-mono text-[9px] text-muted-foreground/60">
          bank
        </span>
        <span className="font-medium">{formatCurrency(line.bankAmount)}</span>
        <span className="text-muted-foreground/70">({line.bankDate})</span>
        <span className="truncate text-muted-foreground/70">
          {line.bankDescription}
        </span>
        {line.reference && (
          <span className="ml-auto shrink-0 rounded border border-border bg-card px-1 py-0.5 font-mono text-[8px] text-muted-foreground/70">
            {line.reference}
          </span>
        )}
      </div>

      {/* Connector */}
      <div className="my-1.5 flex items-center gap-2">
        {isUnmatched ? (
          <>
            <Unlink className="h-3 w-3 shrink-0 text-attention-amber" />
            <div className="h-px flex-1 bg-attention-amber/30" />
            <span className="text-[8px] font-medium uppercase tracking-wider text-attention-amber">
              unmatched
            </span>
          </>
        ) : (
          <>
            <Link2
              className={cn(
                "h-3 w-3 shrink-0",
                isExact ? "text-balanced-green" : "text-attention-amber",
              )}
            />
            <div
              className={cn(
                "recon-connector h-px flex-1 origin-left",
                isExact
                  ? "recon-connector--exact border-t-2 border-solid border-balanced-green/60"
                  : "recon-connector--fuzzy border-t-2 border-dashed border-attention-amber/70",
              )}
            />
            <span
              className={cn(
                "shrink-0 text-[8px] font-semibold uppercase tracking-wider",
                isExact ? "text-balanced-green" : "text-attention-amber",
              )}
            >
              {isExact ? "exact match" : "fuzzy match"}
            </span>
            {isFuzzy && line.confidence !== undefined && (
              <span
                role="meter"
                aria-label={`Fuzzy match confidence ${Math.round(line.confidence * 100)}%`}
                aria-valuenow={Math.round(line.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="shrink-0 rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber"
              >
                {Math.round(line.confidence * 100)}%
              </span>
            )}
          </>
        )}
      </div>

      {/* Ledger line (matched only) */}
      {!isUnmatched && (
        <div className="flex items-center gap-2 text-[10px]">
          <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="font-mono text-[9px] text-muted-foreground/60">
            ledger
          </span>
          <span className="font-medium">{formatCurrency(line.bankAmount)}</span>
          <span className="text-muted-foreground/70">
            ({line.ledgerDate} · {line.ledgerEntry})
          </span>
        </div>
      )}

      {/* Criteria chips */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {line.criteria.map((c) => (
          <span
            key={c}
            className={cn(
              "rounded border px-1 py-0.5 text-[8px] font-medium",
              isExact
                ? "border-balanced-green/20 bg-balanced-green/10 text-balanced-green"
                : isFuzzy
                  ? "border-attention-amber/20 bg-attention-amber/10 text-attention-amber"
                  : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Why */}
      <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Why:</span> {line.why}
      </p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function ReconciliationLiveness({
  className,
  showEmptyState = false,
  showParseError = false,
  showTreasuryReview = false,
  showClosed = false,
}: ReconciliationLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
          <Landmark className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Reconciliation Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Bank Reconciliation — Matching Engine
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
            <Landmark className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No reconciliation in progress
          </p>
          <p className="mx-auto mt-1 max-w-md text-[10px] text-muted-foreground/60">
            The Reconciliation Agent is idle, waiting for a bank statement from
            the Document Agent. Per-line matches and unmatched buckets appear
            here the moment a statement is ingested.
          </p>
        </div>
      </div>
    );
  }

  // ── Parse Error State ─────────────────────────────────────────────
  if (showParseError) {
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
                  Couldn&apos;t Read This Statement
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Parse failed — try a different export format (CSV or PDF).
                Statement routed back to Document Agent for re-ingestion. Never
                silently skipped.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] font-medium text-error-clay/80">
                  Returned to Document Agent — retry
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Parse Status">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Parse Status
            </h3>
            <div
              className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3"
              data-step="parse"
            >
              <p className="text-[10px] font-medium text-error-clay">
                Parse failed — no confidence score (deterministic step)
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Unrecognized export format for Main Operating Account — June
                2026 statement. No lines were silently dropped.
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
                  Layer 1 — Deterministic:
                </strong>{" "}
                Parsing carries zero confidence of its own. Failures are
                explicit and routed to Document Agent — never skipped.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Closed State ──────────────────────────────────────────────────
  if (showClosed) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
                <Landmark className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    Reconciliation Agent
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    CLOSED
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Bank Reconciliation — Matching Engine
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Closed summary */}
        <div className="space-y-3 p-4" role="region" aria-label="Agent Status">
          <div className="rounded-lg border border-balanced-green/25 bg-balanced-green/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              <p className="text-xs font-semibold text-balanced-green">
                Reconciliation closed — Main Operating Account, June 2026
              </p>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Confirmed by Treasury Agent — all items resolved (matched or
              explicitly written off with reason). This agent can never close
              itself; only Treasury Agent can force CLOSED.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[9px]">
              <ArrowRight className="h-2.5 w-2.5 text-balanced-green/60" />
              <span className="font-medium text-balanced-green/80">
                Closed by Treasury Agent — Jun 30, 2026
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
                Original agent matches and any human overrides are both
                preserved — never overwritten.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Treasury Review State ─────────────────────────────────────────
  if (showTreasuryReview) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-attention-amber/30 bg-attention-amber/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-amber/10">
              <AlertTriangle className="h-4 w-4 text-attention-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-attention-amber">
                  Needs Attention
                </span>
                <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                  AWAITING_TREASURY_REVIEW
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                3 items need review before this reconciliation can close. This
                agent is not permitted to transition to CLOSED on its own.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                <span className="text-[9px] font-medium text-attention-amber/80">
                  Treasury Agent review required
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Blocking items */}
        <div className="space-y-3 p-4">
          <div role="region" aria-label="Blocking Items">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blocking Items — Cannot Close
            </h3>
            <div className="space-y-1.5">
              {MATCH_LINES.filter((l) => l.kind === "unmatched").map((line) => (
                <MatchRow key={line.id} line={line} />
              ))}
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
                  Never auto-closes:
                </strong>{" "}
                unresolved items block CLOSED structurally. Only Treasury Agent
                can confirm closure.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Active Run State ──────────────────────────────────────
  const activeStateIdx = PIPELINE_STATES.findIndex(
    (s) => s.id === ACTIVE_STATE,
  );
  const unmatchedLines = MATCH_LINES.filter((l) => l.kind === "unmatched");
  const buckets = ["timing", "missing_entry", "duplicate"] as const;

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Reconciliation Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Exact deterministic · Fuzzy labeled
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bank Reconciliation — Matching Engine
              </p>
            </div>
          </div>

          {/* Run attribution */}
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Account
            </p>
            <p className="text-xs font-medium">Main Operating Account</p>
            <p className="text-[9px] text-muted-foreground/60">Ecobank · GMD</p>
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
                BUCKETING_UNMATCHED
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Period
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-balanced-green" />
              <span className="text-xs font-medium">June 2026</span>
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
              Statement
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">214 lines</span>
            </div>
          </div>
        </div>

        {/* Statement read banner */}
        <div
          className="rounded-lg border border-border/60 bg-accent/20 p-2.5"
          data-step="parse"
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Statement Read
          </p>
          <p className="mt-0.5 text-[10px] text-foreground">
            Reading statement — 214 lines found · Main Operating Account · June
            2026
          </p>
          <p className="mt-0.5 text-[8px] text-muted-foreground/60">
            Deterministic parse — no confidence score. Parse failures are routed
            to Document Agent, never silently skipped.
          </p>
        </div>

        {/* Cross-Agent Handoff */}
        <div className="rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cross-Agent Handoff Chain
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-medium">Document Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Reconciliation Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Treasury Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Ledger Agent</span>
            <span className="ml-1 text-muted-foreground/70">
              — only Treasury Agent can force CLOSED
            </span>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div role="region" aria-label="Reconciliation State Machine">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            State Machine — one pass per account, never merged
          </h3>
          <div className="space-y-1.5" role="list">
            {PIPELINE_STATES.map((state, idx) => (
              <div
                key={state.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  idx === activeStateIdx &&
                    "border-signal-indigo/30 bg-signal-indigo/5 shadow-sm",
                  idx < activeStateIdx &&
                    "border-balanced-green/20 bg-balanced-green/5",
                  idx > activeStateIdx &&
                    "border-border/50 bg-muted/30 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    idx === activeStateIdx && "text-signal-indigo",
                    idx < activeStateIdx && "text-balanced-green",
                    idx > activeStateIdx && "text-muted-foreground/40",
                  )}
                >
                  {idx === activeStateIdx ? (
                    <Activity className="h-4 w-4 animate-pulse" />
                  ) : idx < activeStateIdx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <state.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StateBadge state={state.id} />
                    {idx === activeStateIdx && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-indigo" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[9px]",
                      idx <= activeStateIdx
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
        </div>

        {/* Match Pairs */}
        <div role="region" aria-label="Match Pairs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Match Pairs — exact solid · fuzzy dashed + confidence
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              2 matched · 3 unmatched · 214 statement lines
            </span>
          </div>
          <div className="space-y-1.5">
            {MATCH_LINES.filter((l) => l.kind !== "unmatched").map((line) => (
              <MatchRow key={line.id} line={line} />
            ))}
          </div>
        </div>

        {/* Unmatched Buckets */}
        <div role="region" aria-label="Unmatched Buckets">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Unmatched — Grouped by Reason Bucket
          </h3>
          <div className="space-y-2">
            {buckets.map((bucketKey) => {
              const bucket = BUCKET_META[bucketKey];
              const lines = unmatchedLines.filter(
                (l) => l.bucket === bucketKey,
              );
              if (lines.length === 0) return null;
              return (
                <div
                  key={bucketKey}
                  className="overflow-hidden rounded-lg border border-border/60"
                >
                  <div className="flex items-center justify-between bg-accent/30 px-3 py-1.5">
                    <span className="text-[9px] font-semibold text-foreground">
                      {bucket.label} — {lines.length}{" "}
                      {lines.length === 1 ? "item" : "items"}
                    </span>
                    <span
                      role="meter"
                      aria-label={`${bucket.label} classification confidence ${Math.round(bucket.confidence * 100)}%`}
                      aria-valuenow={Math.round(bucket.confidence * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="rounded-full border border-signal-indigo/20 bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-bold text-signal-indigo"
                    >
                      {Math.round(bucket.confidence * 100)}%
                    </span>
                  </div>
                  <div className="space-y-1.5 p-2">
                    {lines.map((line) => (
                      <MatchRow key={line.id} line={line} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[8px] text-muted-foreground/60">
            3 items need review before this reconciliation can close — never
            auto-closes with unresolved items.
          </p>
        </div>

        {/* Escalation & Human-in-the-Loop Triggers */}
        <div
          className="rounded-lg border bg-accent/20"
          role="region"
          aria-label="Escalation Triggers"
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
                  Critical rule: Pass 1 (exact) and Pass 2 (fuzzy) are genuinely
                  separate steps with separate visible criteria — never combined
                  into a single match call. A fuzzy match must never be
                  displayed with the same visual weight as an exact match.
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
                Audit Trail — Every Match Logged
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
                        Line
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Match Type
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Pass
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Confidence
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Detail
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
                        <td className="px-3 py-1.5 font-medium">
                          {entry.line}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              entry.matchType === "exact"
                                ? "text-balanced-green"
                                : entry.matchType === "fuzzy"
                                  ? "text-attention-amber"
                                  : entry.matchType === "human_override"
                                    ? "text-signal-indigo"
                                    : "text-muted-foreground",
                            )}
                          >
                            {entry.matchType}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">
                          pass: {entry.pass}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/70">
                          {entry.confidence}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {entry.ts}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/80">
                          {entry.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-muted/20 px-3 py-1.5 text-[8px] text-muted-foreground/60">
                account: Main Operating Account · entity: ent_2f8a1c · actor:
                Reconciliation Agent · statement source: Document Agent ·
                overrides preserved, never overwritten
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
              Parsing and exact matches carry no confidence badge — 100% by
              definition, criteria always shown.{" "}
              <strong className="text-muted-foreground/80">
                Layer 2 — Probabilistic:
              </strong>{" "}
              Fuzzy matches and unmatched-bucket classification carry labeled
              confidence scores (e.g. 82%). This agent never auto-closes — only
              Treasury Agent can force CLOSED.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
