"use client";

import React from "react";
import { useState } from "react";
import {
  FileSearch,
  Scale,
  FileText,
  CalendarDays,
  Send,
  AlertTriangle,
  Activity,
  ChevronDown,
  Building2,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  Landmark,
  Ban,
  Hourglass,
  ShieldQuestion,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type TaxState =
  | "TRANSACTIONS_SCANNED"
  | "RATE_RULE_APPLIED"
  | "RETURN_LINE_ASSEMBLED"
  | "DEADLINE_CHECKED"
  | "HANDED_TO_COMPLIANCE_REVIEW";

export interface ReturnLine {
  source: string;
  basis: string;
  tax: number;
  ruleName: string;
  jurisdiction: string;
  ruleVersion: string;
  effective: string;
}

export interface TaxLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showNoRule?: boolean;
  showDeadlineUrgent?: boolean;
  showStaleRules?: boolean;
  showMissingData?: boolean;
  showHandedOff?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: TaxState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "TRANSACTIONS_SCANNED",
    label: "TRANSACTIONS_SCANNED",
    description: "Tax-relevant transactions identified (rule-based filtering)",
    icon: FileSearch,
  },
  {
    id: "RATE_RULE_APPLIED",
    label: "RATE_RULE_APPLIED",
    description: "Specific jurisdiction rate/rule applied — cited per line",
    icon: Scale,
  },
  {
    id: "RETURN_LINE_ASSEMBLED",
    label: "RETURN_LINE_ASSEMBLED",
    description: "Return built line by line, each traceable to source",
    icon: FileText,
  },
  {
    id: "DEADLINE_CHECKED",
    label: "DEADLINE_CHECKED",
    description: "Filing deadline confirmed — persistent countdown",
    icon: CalendarDays,
  },
  {
    id: "HANDED_TO_COMPLIANCE_REVIEW",
    label: "HANDED_TO_COMPLIANCE_REVIEW",
    description: "Return draft passed to Compliance Agent for review",
    icon: Send,
  },
];

const RETURN_LINES: ReturnLine[] = [
  {
    source: "Sale #1042",
    basis: "GMD 500.00 × 15%",
    tax: 75.0,
    ruleName: "GRA Gambia standard VAT rate",
    jurisdiction: "Gambia",
    ruleVersion: "rule v2.1",
    effective: "Jan 1 2026",
  },
  {
    source: "Purchase #PO-2088",
    basis: "GMD 300.00 × 15%",
    tax: 45.0,
    ruleName: "GRA Gambia input VAT credit",
    jurisdiction: "Gambia",
    ruleVersion: "rule v2.1",
    effective: "Jan 1 2026",
  },
];

const NO_RULE_TXN = {
  source: "TXN-XBORDER-0417",
  type: "cross-border digital service fee",
  note: "No rule found for transaction type under current Gambia rule set",
  action: "flagged for Compliance Agent, not calculated",
};

const STEPS = [
  {
    title: "Scan Transactions for Tax Relevance",
    detail:
      "Input: period transactions. Output: flagged tax-relevant list (VAT-able sales/purchases, withholding-triggering payments). No confidence score — rule-based filtering, not judgment.",
  },
  {
    title: "Apply Rate/Rule per Transaction",
    detail:
      "Input: transaction + jurisdiction. Output: tax amount + exact rule/rate cited (rate %, rule name, jurisdiction, effective date). No confidence score — if no matching rule exists this must fail explicitly, never default to a guessed rate.",
  },
  {
    title: "Assemble Return Line by Line",
    detail:
      "Input: per-line rule applications. Output: structured return draft. No confidence score — structural assembly, each line traceable to source transactions.",
  },
  {
    title: "Check Deadline",
    detail:
      "Input: jurisdiction/period. Output: filing deadline + days remaining. No confidence score — calendar lookup, countdown shown persistently.",
  },
  {
    title: "Hand to Compliance Agent",
    detail:
      "Structural handoff — return draft passed to Compliance Agent for review before any external submission package. Terminal for Tax Agent's scope.",
  },
];

const CONSTRAINTS = [
  { label: "Rule Cited Per Line", icon: Scale },
  { label: "Never Guess a Rule", icon: Ban },
  { label: "Rule Versioned", icon: ShieldQuestion },
  { label: "Deadline Tracked", icon: CalendarDays },
];

const ESCALATIONS = [
  {
    condition: "No matching tax rule for a transaction",
    to: "Compliance Agent, human",
    effect:
      "Explicit gap flagged, transaction excluded from return until resolved. Blocking for that line only.",
  },
  {
    condition: "Filing deadline within [X] days and return incomplete",
    to: "Compliance Agent, human, escalating urgency",
    effect: "Countdown turns to alert. Non-blocking but urgent.",
  },
  {
    condition: "Rule set potentially outdated (no recent update recorded)",
    to: "Compliance Agent",
    effect:
      "Rate table last confirmed [date] — verify current. Non-blocking, informational.",
  },
];

const AUDIT_TRAIL = [
  {
    event: "Transaction scan",
    detail: "Q2 2026 · 214 transactions · 12 VAT-relevant",
    conf: "—",
  },
  {
    event: "Rule applied",
    detail: "Sale #1042 · GRA Gambia standard VAT · 15% · v2.1",
    conf: "—",
  },
  {
    event: "Rule applied",
    detail: "Purchase #PO-2088 · input VAT credit · 15% · v2.1",
    conf: "—",
  },
  {
    event: "Rule gap flagged",
    detail: "TXN-XBORDER-0417 · cross-border digital service fee",
    conf: "—",
  },
  {
    event: "Return assembled",
    detail: "2 lines · GMD 120.00 net VAT",
    conf: "—",
  },
  {
    event: "Deadline checked",
    detail: "Aug 15 2026 · 12 days remaining",
    conf: "—",
  },
  {
    event: "Handed to Compliance",
    detail: "draft return · pre-submission review",
    conf: "—",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStateColor(state: TaxState): string {
  switch (state) {
    case "TRANSACTIONS_SCANNED":
    case "RETURN_LINE_ASSEMBLED":
    case "DEADLINE_CHECKED":
    case "HANDED_TO_COMPLIANCE_REVIEW":
      return "text-balanced-green";
    case "RATE_RULE_APPLIED":
      return "text-signal-indigo";
  }
}

function getStateBg(state: TaxState): string {
  switch (state) {
    case "TRANSACTIONS_SCANNED":
    case "RETURN_LINE_ASSEMBLED":
    case "DEADLINE_CHECKED":
    case "HANDED_TO_COMPLIANCE_REVIEW":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "RATE_RULE_APPLIED":
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: TaxState }) {
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

// ─── Main Component ────────────────────────────────────────────────────

export function TaxLiveness({
  className,
  showEmptyState = false,
  showNoRule = false,
  showDeadlineUrgent = false,
  showStaleRules = false,
  showMissingData = false,
  showHandedOff = false,
}: TaxLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Landmark className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Tax Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Tax — transactions to compliance review
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          Live
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          Q2 2026 · Gambia
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: scan, rule lookup, assembly, deadline, handoff
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <Scale className="h-3 w-3" />
        Rule cited per line — a guessed rate is never applied
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Landmark className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No tax run being processed
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Tax runs appear here with every rule cited per line and rule version
            shown explicitly.
          </p>
        </div>
      </div>
    );
  }

  // ── No Matching Rule Branch (Spec §3/§6 — blocking for that line) ────
  if (showNoRule) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Tax Rule Gap Flagged
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                TXN-XBORDER-0417 is a cross-border digital service fee — no
                matching rule under the current Gambia rule set. Never guessed.
                Flagged for Compliance Agent, not calculated, and excluded from
                the return until resolved. Blocking for that line only.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Deadline Urgent Branch (Spec §6 — non-blocking but urgent) ───────
  if (showDeadlineUrgent) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Filing Deadline — Urgent
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                VAT return due Aug 15 2026 — 3 days remaining and the return is
                incomplete. Escalating urgency to Compliance Agent and human.
                Non-blocking but urgent — not auto-filed, never silent.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Stale Rule Set Branch (Spec §6 — non-blocking, informational) ────
  if (showStaleRules) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Rule Set Stale — Verify Current
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Rate table last confirmed Jul 1 2026 — no update recorded since.
                Shown for verification with Compliance Agent. Informational,
                non-blocking — the rule version is surfaced, not silently
                assumed current.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Missing Data Branch (Spec §7) ────────────────────────────────────
  if (showMissingData) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Missing Transaction Data
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Sale #1055 lacks a line-item breakdown needed for VAT treatment.
                Flagged, not estimated — no guessed amount is ever used for a
                tax line.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Handed Off Branch (terminal for Tax Agent scope) ─────────────────
  if (showHandedOff) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 p-3">
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Handed to Compliance Agent for review
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Q2 2026 VAT draft return (GMD 120.00 net) passed to Compliance
                Agent for pre-submission review. Terminal for Tax Agent's scope
                — submission is not this agent's action.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 1; // RATE_RULE_APPLIED

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
            <StateBadge state="RATE_RULE_APPLIED" />
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
              Jurisdiction
            </p>
            <p className="text-[10px] font-semibold">Gambia · GRA</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Period
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Q2 2026
            </p>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div
          role="region"
          aria-label="Tax State Machine"
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
                    <FileSearch className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Transaction Scan */}
        <div
          role="region"
          aria-label="Transaction Scan"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Transaction Scan
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <FileSearch className="h-3.5 w-3.5 text-balanced-green" />
            <span className="text-[10px] font-medium">
              Scanning Q2 2026 transactions for VAT relevance — 12 of 214
              flagged
            </span>
            <span className="ml-auto text-[9px] text-muted-foreground/70">
              Rule-based filtering — no confidence score
            </span>
          </div>
        </div>

        {/* Rule Application — the critical rule */}
        <div
          data-step="rule"
          role="region"
          aria-label="Rule Application"
          className="rounded-lg border border-signal-indigo/20 bg-signal-indigo/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-signal-indigo">
            <Scale className="h-3 w-3" />
            Rule Application — every rate traced to a named rule, never a guess
          </p>
          <div className="mt-2 space-y-1.5">
            {RETURN_LINES.map((line, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/50 bg-card/60 px-2 py-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-muted-foreground">
                    VAT on {line.source}: {line.basis} ={" "}
                    {formatCurrency(line.tax)} — {line.ruleName}, effective
                    since {line.effective}
                  </span>
                  <span className="text-[9px] font-bold text-signal-indigo">
                    {line.ruleVersion}
                  </span>
                </div>
                <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                  {line.ruleName} · {line.jurisdiction} jurisdiction · effective{" "}
                  {line.effective} · {line.ruleVersion}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] text-muted-foreground/70">
            Deterministic rule lookup — no confidence score. The rule citation
            is the answer.
          </p>
        </div>

        {/* No-Rule Gap Flag */}
        <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-2.5">
          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-attention-amber" />
          <div>
            <p className="text-[9px] font-medium text-attention-amber">
              No rule found for transaction type {NO_RULE_TXN.type} —{" "}
              {NO_RULE_TXN.action}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground/70">
              {NO_RULE_TXN.source} excluded from the return until resolved.
              Blocking for that line only — never a silent closest-rule guess.
            </p>
          </div>
        </div>

        {/* Return Lines */}
        <div role="region" aria-label="Return Lines" className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Return Lines
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Source
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Basis
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Tax
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Rule / Version
                  </th>
                </tr>
              </thead>
              <tbody>
                {RETURN_LINES.map((line, idx) => (
                  <tr
                    key={idx}
                    className={cn(idx > 0 && "border-t border-border/50")}
                  >
                    <td className="px-2.5 py-1.5 text-[9px] font-medium">
                      {line.source}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {line.basis}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {formatCurrency(line.tax)}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {line.ruleName} · {line.ruleVersion}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border/50 bg-muted/30">
                  <td className="px-2.5 py-1.5 text-[9px] font-semibold">
                    Net VAT
                  </td>
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5 text-[9px] font-bold text-balanced-green">
                    GMD 120.00
                  </td>
                  <td className="px-2.5 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deadline */}
        <div role="region" aria-label="Deadline" className="space-y-1.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <CalendarDays className="h-3 w-3" />
            Deadline
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <Clock className="h-3 w-3 text-signal-indigo" />
            <span className="text-[9px] font-medium text-muted-foreground">
              VAT return due Aug 15 2026 — 12 days remaining. Countdown shown
              persistently.
            </span>
          </div>
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
              Audit Trail — Every Rule Application
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
                      Rule / Event
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Version / Detail
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Effective
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
                        {row.event}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.detail}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.conf}
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
              Ledger Agent (transaction data)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              This agent (rule application)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Compliance Agent (rule sets + review)
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
