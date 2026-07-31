"use client";

import React from "react";
import { useState } from "react";
import {
  Route,
  Link2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Activity,
  Clock,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Building2,
  Waves,
  CircleDollarSign,
  Zap,
  Smartphone,
  GitFork,
  FileWarning,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type MobileMoneyState =
  | "STATEMENT_OR_API_PULLED"
  | "PARSING_BY_RAIL"
  | "MATCHING_TO_LEDGER"
  | "MATCHED"
  | "TIMING_GAP_FLAGGED"
  | "UNMATCHED"
  | "RECONCILED";

export type RailId = "wave" | "orange_money" | "mtn_momo";

export type MatchKind = "exact" | "fuzzy" | "timing_gap" | "unmatched";

export interface MobileMoneyTxn {
  rail: RailId;
  ref: string;
  amount: number;
  date: string;
  kind: MatchKind;
  detail: string;
  confidence?: number;
}

export interface MobileMoneyLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showApiFailure?: boolean;
  showAnomalousLag?: boolean;
  showReconciled?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: MobileMoneyState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "STATEMENT_OR_API_PULLED",
    label: "STATEMENT_OR_API_PULLED",
    description: "Retrieving transaction data from the specific rail",
    icon: Route,
  },
  {
    id: "PARSING_BY_RAIL",
    label: "PARSING_BY_RAIL",
    description:
      "Normalizing per-rail format — never assuming one rail's schema fits another",
    icon: GitFork,
  },
  {
    id: "MATCHING_TO_LEDGER",
    label: "MATCHING_TO_LEDGER",
    description:
      "Matching mobile money lines to ledger/AP/AR entries (exact then fuzzy)",
    icon: Link2,
  },
  {
    id: "RECONCILED",
    label: "RECONCILED",
    description: "All lines resolved — matched, timing-explained, or bucketed",
    icon: CheckCircle2,
  },
];

const RAILS: Record<
  RailId,
  { name: string; icon: React.ElementType; color: string }
> = {
  wave: {
    name: "Wave",
    icon: Waves,
    color: "text-signal-indigo",
  },
  orange_money: {
    name: "Orange Money",
    icon: CircleDollarSign,
    color: "text-orange-500",
  },
  mtn_momo: {
    name: "MTN MoMo",
    icon: Zap,
    color: "text-yellow-500",
  },
};

const TXNS: MobileMoneyTxn[] = [
  {
    rail: "wave",
    ref: "WV-9928",
    amount: 85.0,
    date: "June 14",
    kind: "exact",
    detail:
      "Matched: Wave confirmation GMD 85.00 June 14 ↔ ledger entry GMD 85.00 — reference WV-9928 identical. Deterministic — no confidence score needed.",
  },
  {
    rail: "wave",
    ref: "WV-8841",
    amount: 45.0,
    date: "June 18",
    kind: "fuzzy",
    confidence: 0.82,
    detail:
      "Fuzzy matched (82% confidence): Wave confirmation GMD 45.00 (June 18) ↔ ledger entry GMD 45.00 (June 15) — amount exact, date within 3-day window, no reference on bank side.",
  },
  {
    rail: "wave",
    ref: "WV-7792",
    amount: 120.0,
    date: "June 14",
    kind: "timing_gap",
    detail:
      "TIMING_GAP_FLAGGED — Wave confirms GMD 120.00 June 14, bank settlement expected June 16 — normal 2-day lag for this rail, not an error. Never treated as a match failure.",
  },
  {
    rail: "orange_money",
    ref: "OM-2210",
    amount: 200.0,
    date: "June 20",
    kind: "timing_gap",
    detail:
      "TIMING_GAP_FLAGGED — Orange Money shows GMD 200.00 confirmed June 20, bank statement shows settlement June 22 — 2-day lag is typical for this rail, not an error. Typical range for Orange Money: 1-2 days.",
  },
  {
    rail: "mtn_momo",
    ref: "MTN-3345",
    amount: 40.0,
    date: "June 25",
    kind: "unmatched",
    detail:
      "Unmatched: MTN MoMo transaction GMD 40.00 June 25 — no corresponding ledger entry found. Bucketed as 'no matching ledger entry', rail reference kept. Blocking for reconciliation close.",
  },
];

const STEPS = [
  {
    title: "Pull Per-Rail Data",
    detail:
      "Input: rail API credentials or uploaded statement. Output: raw transaction list. No confidence score — deterministic retrieval, flagged explicitly on failure (never silently skipped).",
  },
  {
    title: "Parse Per-Rail Format",
    detail:
      "Input: raw data. Output: normalized {date, amount, reference, counterparty, rail}. No confidence score — but the rail whose format was used is always named; never assume one rail's schema fits another.",
  },
  {
    title: "Match to Ledger",
    detail:
      "Input: normalized lines + open ledger entries. Output: exact pairs (no score) then fuzzy candidates (labeled confidence, e.g. 82%). Same criteria pattern as Reconciliation Agent.",
  },
  {
    title: "Detect Timing Gap",
    detail:
      "Input: mobile confirmation date vs bank settlement date (when both known). Output: lag in days, classified expected-normal or anomalous against the rail's typical range. Its own classification — not folded into standard matching.",
  },
  {
    title: "Bucket True Unmatched",
    detail:
      "Input: still-unmatched lines. Output: reason-tagged buckets (timing / missing entry / duplicate / amount mismatch) with the rail-specific reference kept visible. Blocking for close until resolved.",
  },
];

const CONSTRAINTS = [
  { label: "Per-Rail Parsing", icon: GitFork },
  { label: "Timing Gaps Labeled", icon: Clock },
  { label: "Exact Then Fuzzy", icon: Link2 },
  { label: "Rail Ref Kept", icon: Smartphone },
];

const ESCALATIONS = [
  {
    condition: "Timing gap exceeds typical range for that rail",
    to: "Treasury Agent",
    effect:
      "Flagged as anomalous, not just informational. Non-blocking but surfaced.",
  },
  {
    condition: "Genuine unmatched item after matching passes",
    to: "Treasury Agent",
    effect: "Same bucket pattern as Reconciliation Agent. Blocking for close.",
  },
  {
    condition: "API pull fails / credentials expired",
    to: "Treasury Agent, human",
    effect: "Blocking for that rail's data until resolved.",
  },
];

const AUDIT_TRAIL = [
  {
    rail: "Wave",
    ref: "WV-9928",
    match: "matched (exact)",
    confidence: "—",
    lag: "—",
  },
  {
    rail: "Orange Money",
    ref: "OM-2210",
    match: "timing_gap",
    confidence: "—",
    lag: "2-day lag · typical 1-2",
  },
  {
    rail: "Wave",
    ref: "WV-8841",
    match: "matched (fuzzy)",
    confidence: "82%",
    lag: "—",
  },
  {
    rail: "MTN MoMo",
    ref: "MTN-3345",
    match: "unmatched",
    confidence: "—",
    lag: "—",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStateColor(state: MobileMoneyState): string {
  switch (state) {
    case "MATCHED":
      return "text-balanced-green";
    case "TIMING_GAP_FLAGGED":
      return "text-signal-indigo";
    case "UNMATCHED":
      return "text-attention-amber";
    case "RECONCILED":
      return "text-balanced-green";
    default:
      return "text-signal-indigo";
  }
}

function getStateBg(state: MobileMoneyState): string {
  switch (state) {
    case "MATCHED":
    case "RECONCILED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "TIMING_GAP_FLAGGED":
      return "bg-signal-indigo/5 border-signal-indigo/20";
    case "UNMATCHED":
      return "bg-attention-amber/5 border-attention-amber/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

function getMatchIcon(kind: MatchKind): React.ElementType {
  switch (kind) {
    case "exact":
      return CheckCircle2;
    case "fuzzy":
      return Activity;
    case "timing_gap":
      return Clock;
    case "unmatched":
      return AlertTriangle;
  }
}

function getMatchColor(kind: MatchKind): string {
  switch (kind) {
    case "exact":
      return "text-balanced-green";
    case "fuzzy":
      return "text-attention-amber";
    case "timing_gap":
      return "text-signal-indigo";
    case "unmatched":
      return "text-error-clay";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: MobileMoneyState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state}
    </span>
  );
}

function MatchRow({ txn }: { txn: MobileMoneyTxn }) {
  const rail = RAILS[txn.rail];
  const RailIcon = rail.icon;
  const Icon = getMatchIcon(txn.kind);
  const isTimingGap = txn.kind === "timing_gap";
  const isFuzzy = txn.kind === "fuzzy";
  const isExact = txn.kind === "exact";
  const isUnmatched = txn.kind === "unmatched";

  return (
    <div
      data-match-kind={
        isExact ? "exact" : isUnmatched ? "unmatched" : undefined
      }
      data-timing-gap={isTimingGap ? "true" : undefined}
      className={cn(
        "rounded-lg border p-2.5",
        isTimingGap
          ? "border-signal-indigo/30 bg-signal-indigo/5"
          : isFuzzy
            ? "border-dashed border-attention-amber/40 bg-card"
            : isUnmatched
              ? "border-attention-amber/30 bg-attention-amber/5"
              : "border-balanced-green/20 bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <RailIcon className={cn("h-3 w-3", rail.color)} />
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {txn.ref}
        </span>
        <span className="text-[10px] font-bold">
          {formatCurrency(txn.amount)}
        </span>
        <span className="text-[9px] text-muted-foreground/60">{txn.date}</span>
        <span className="ml-auto flex items-center gap-1">
          <Icon className={cn("h-3 w-3", getMatchColor(txn.kind))} />
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide",
              getMatchColor(txn.kind),
            )}
          >
            {txn.kind === "timing_gap"
              ? "Timing Gap"
              : txn.kind === "fuzzy"
                ? "Fuzzy match"
                : txn.kind === "exact"
                  ? "Exact match"
                  : "Unmatched"}
          </span>
          {isFuzzy && txn.confidence !== undefined && (
            <span
              role="meter"
              aria-label={`${txn.ref} fuzzy match confidence`}
              aria-valuenow={Math.round(txn.confidence * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="ml-1 inline-flex items-center gap-1 rounded-md bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-bold text-attention-amber"
            >
              {Math.round(txn.confidence * 100)}%
            </span>
          )}
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[9px] leading-relaxed",
          isTimingGap ? "text-signal-indigo/90" : "text-muted-foreground",
        )}
      >
        {txn.detail}
      </p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function MobileMoneyLiveness({
  className,
  showEmptyState = false,
  showApiFailure = false,
  showAnomalousLag = false,
  showReconciled = false,
}: MobileMoneyLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Smartphone className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Mobile Money Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Mobile money reconciliation — timing gaps explained
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          Live
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          Wave | Orange Money | MTN MoMo
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: pull, parse, lag arithmetic
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-attention-amber" />
        Layer 2 — probabilistic: fuzzy matching, gap classification
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <Sparkles className="h-3 w-3" />
        Shares matching pattern with Reconciliation Agent
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Smartphone className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No active mobile money reconciliation
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Scheduled pulls will appear here per rail — Wave, Orange Money, MTN
            MoMo, M-Pesa, Airtel Money — each kept in its own feed.
          </p>
        </div>
      </div>
    );
  }

  // ── Rail API Failure (Spec §7) ───────────────────────────────────────
  if (showApiFailure) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Wave connection needs reauthorization
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Couldn't pull Wave data since Jul 28 — last successful pull.
                Blocking for that rail's data until resolved. Other rails
                continue.
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                Provider format change detected — flagged for Document Agent
                review, never mis-parsed silently.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Never silently skipped — explicit &quot;couldn&apos;t pull [rail]
            data since [last successful pull date]&quot; shown until resolved.
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Anomalous Timing Gap (Spec §6) ───────────────────────────────────
  if (showAnomalousLag) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Anomalous Timing Gap
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Wave confirms GMD 200.00 on June 14 but bank settlement is
                expected June 19 — a 5-day lag is unusual for this rail,
                investigate. Typical range for Wave is 1-2 days.
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-attention-amber">
                Escalated to Treasury Agent — flagged as anomalous, not just
                informational. Non-blocking but surfaced.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Terminal State: RECONCILED ───────────────────────────────────────
  if (showReconciled) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Mobile money reconciled for Q2 2026
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Treasury Agent confirmed all lines resolved — matched,
                timing-explained, or bucketed with rail references kept. No
                unresolved items remain.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <ArrowRight className="h-3 w-3 text-balanced-green" />
            Implied postings handed to Ledger Agent for the matched lines.
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 2; // MATCHING_TO_LEDGER
  const railIds = Object.keys(RAILS) as RailId[];

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="p-4">{header}</div>

      <div className="border-t p-4 space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              State
            </p>
            <StateBadge state="MATCHING_TO_LEDGER" />
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Entity
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              Xenboox HQ
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Rails
            </p>
            <p className="text-[10px] font-semibold">
              Wave · Orange · MTN MoMo
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Source
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Wallet className="h-3 w-3 text-muted-foreground" />
              Per-rail API pull
            </p>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div
          role="region"
          aria-label="Mobile Money State Machine"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            State Machine
          </p>
          <ol className="space-y-1.5">
            {PIPELINE_STATES.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeIdx;
              const isDone = idx < activeIdx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                    isActive
                      ? "border-signal-indigo/30 bg-signal-indigo/5"
                      : isDone
                        ? "border-balanced-green/20 bg-balanced-green/5"
                        : "border-border/50 bg-muted/20 opacity-70",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground/70">
                    {s.description}
                  </span>
                  {isActive && (
                    <Activity className="h-3 w-3 animate-pulse text-signal-indigo" />
                  )}
                  {isDone && (
                    <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Match Outcomes Branch — three explicit outcomes */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] font-medium text-muted-foreground/60">
              Outcomes:
            </span>
            {(
              [
                { state: "MATCHED" as MobileMoneyState },
                { state: "TIMING_GAP_FLAGGED" as MobileMoneyState },
                { state: "UNMATCHED" as MobileMoneyState },
              ] as const
            ).map(({ state }) => (
              <span
                key={state}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
                  getStateColor(state),
                  getStateBg(state),
                )}
              >
                {state}
              </span>
            ))}
          </div>
        </div>

        {/* Timing Gap Policy — the defining rule */}
        <div
          role="region"
          aria-label="Timing Gap Policy"
          className="rounded-lg border border-signal-indigo/20 bg-signal-indigo/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-signal-indigo">
            <Clock className="h-3 w-3" />
            Why Timing Gaps Are a Third Outcome
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-signal-indigo/90">
            A mobile money confirmation can appear before bank settlement
            completes. A timing gap is a third, explicit outcome — it must never
            be silently treated as a match failure, and must never be silently
            reconciled without being labeled a gap. The lag is computed and
            explained against the rail&apos;s typical range.
          </p>
        </div>

        {/* Per-Rail Activity */}
        <div role="region" aria-label="Per-Rail Activity" className="space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Per-Rail Activity — never blended into one feed
          </p>
          {railIds.map((railId) => {
            const rail = RAILS[railId];
            const RailIcon = rail.icon;
            const railTxns = TXNS.filter((t) => t.rail === railId);
            return (
              <div key={railId} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <RailIcon className={cn("h-3.5 w-3.5", rail.color)} />
                  <h3 className="text-[11px] font-bold">{rail.name}</h3>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {railTxns.length} transactions
                  </span>
                </div>
                <div className="space-y-1.5">
                  {railTxns.map((txn) => (
                    <MatchRow key={txn.ref} txn={txn} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unmatched Buckets */}
        <div
          role="region"
          aria-label="Unmatched Buckets"
          className="rounded-lg border border-attention-amber/20 bg-attention-amber/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-attention-amber">
            <AlertTriangle className="h-3 w-3" />
            Unmatched Buckets — rail references kept
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            &quot;No matching ledger entry — 1 item&quot; (MTN-3345). A genuine
            unmatched item is blocking for close and follows the same bucket
            pattern as the Reconciliation Agent.
          </p>
        </div>

        {/* Escalation & Human-in-the-Loop */}
        <div
          role="region"
          aria-label="Escalation & Human-in-the-Loop"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Escalation &amp; Human-in-the-Loop
          </p>
          <div className="overflow-hidden rounded-lg border">
            {ESCALATIONS.map((esc, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 px-2.5 py-2",
                  idx > 0 && "border-t border-border/50",
                )}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {esc.condition}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    → {esc.to}. {esc.effect}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div role="region" aria-label="How It Works" className="space-y-1.5">
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <Eye className="h-3 w-3 text-signal-indigo" />
              How It Works — Step-by-Step
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showSteps && "rotate-180",
              )}
            />
          </button>
          {showSteps && (
            <div className="space-y-1.5">
              {STEPS.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
                >
                  <p className="text-[10px] font-semibold text-signal-indigo">
                    Step {idx + 1} — {s.title}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Constraint Enforcement */}
        <div
          role="region"
          aria-label="Constraint Enforcement"
          className="space-y-1.5"
        >
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ShieldAlert className="h-3 w-3" />
            Constraint Enforcement
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-1 rounded-md border border-balanced-green/20 bg-balanced-green/5 px-1.5 py-0.5 text-[9px] font-medium text-balanced-green"
              >
                <c.icon className="h-3 w-3" />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Audit Trail */}
        <div role="region" aria-label="Audit Trail" className="space-y-1.5">
          <button
            onClick={() => setShowAudit((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <ListChecks className="h-3 w-3 text-signal-indigo" />
              Audit Trail — Every Transaction
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showAudit && "rotate-180",
              )}
            />
          </button>
          {showAudit && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Rail
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Match Type
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Confidence
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Lag Basis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_TRAIL.map((row, idx) => (
                    <tr
                      key={idx}
                      className={cn(idx > 0 && "border-t border-border/50")}
                    >
                      <td className="px-2.5 py-1.5 text-[9px] font-medium">
                        {row.rail}{" "}
                        <span className="text-muted-foreground/60">
                          ({row.ref})
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.match}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.confidence}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.lag}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cross-Agent Chain */}
        <div
          role="region"
          aria-label="Cross-Agent Chain"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Cross-Agent Chain
          </p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-2">
            <span className="text-[9px] font-medium text-muted-foreground">
              Shares matching engine pattern with Reconciliation Agent
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Escalation → Treasury Agent
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Format changes → Document Agent / engineering review
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
