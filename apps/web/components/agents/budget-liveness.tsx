"use client";

import React from "react";
import { useState } from "react";
import {
  PiggyBank,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Bell,
  ChevronDown,
  Eye,
  ListChecks,
  ArrowRight,
  Receipt,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type BudgetState =
  | "BUDGET_LINE_TRACKED"
  | "ACTUAL_UPDATED"
  | "VARIANCE_CALCULATED"
  | "EXPLAINABLE"
  | "UNEXPLAINED"
  | "ALERT_CHECK";

export interface StateTransition {
  state: BudgetState;
  timestamp: string;
  detail: string;
}

export interface BudgetLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showUnexplained?: boolean;
  showUnbudgeted?: boolean;
  showAlert?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: BudgetState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "BUDGET_LINE_TRACKED",
    label: "BUDGET_LINE_TRACKED",
    description: "Budget lines established for the period",
    icon: PiggyBank,
  },
  {
    id: "ACTUAL_UPDATED",
    label: "ACTUAL_UPDATED",
    description: "Latest actual pulled from Ledger Agent per tracked line",
    icon: TrendingUp,
  },
  {
    id: "VARIANCE_CALCULATED",
    label: "VARIANCE_CALCULATED",
    description: "Variance computed in $ and % against budget",
    icon: BarChart3,
  },
  {
    id: "EXPLAINABLE",
    label: "EXPLAINABLE",
    description: "Variance traced to identifiable transactions",
    icon: CheckCircle2,
  },
  {
    id: "UNEXPLAINED",
    label: "UNEXPLAINED",
    description: "Fork — no single driver identified, labeled honestly",
    icon: HelpCircle,
  },
  {
    id: "ALERT_CHECK",
    label: "ALERT_CHECK",
    description: "Variance compared against the alert threshold",
    icon: Bell,
  },
];

const BARS: Array<{
  name: string;
  budgetLabel: string;
  actualLabel: string;
  badge: string;
  status: "over" | "under" | "on";
  pct: number;
}> = [
  {
    name: "Marketing",
    budgetLabel: "GMD 3,000.00",
    actualLabel: "GMD 3,450.00",
    badge: "GMD 450 over (12%)",
    status: "over",
    pct: 115,
  },
  {
    name: "Travel",
    budgetLabel: "GMD 2,000.00",
    actualLabel: "GMD 2,200.00",
    badge: "GMD 200 over (10%)",
    status: "over",
    pct: 110,
  },
  {
    name: "Office Supplies",
    budgetLabel: "GMD 1,500.00",
    actualLabel: "GMD 1,400.00",
    badge: "GMD 100 under (7%)",
    status: "under",
    pct: 93,
  },
  {
    name: "Salaries",
    budgetLabel: "GMD 10,000.00",
    actualLabel: "GMD 10,000.00",
    badge: "On budget",
    status: "on",
    pct: 100,
  },
];

const CITED_TRANSACTIONS = [
  {
    ref: "INV #4471",
    vendor: "Cloudline Ltd",
    date: "June 14",
    amount: "GMD 300.00",
  },
  {
    ref: "Recurring spend",
    vendor: "OfficeWorld",
    date: "June",
    amount: "GMD 150.00",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "BUDGET_LINE_TRACKED",
    timestamp: "09:15:00.104",
    detail:
      "lines tracked: marketing, travel, office supplies, salaries (period Q2 2026, entity Xenboox HQ)",
  },
  {
    state: "ACTUAL_UPDATED",
    timestamp: "09:15:01.217",
    detail: "pulled actual marketing: GMD 3,450.00 from Ledger Agent snapshot",
  },
  {
    state: "VARIANCE_CALCULATED",
    timestamp: "09:15:01.482",
    detail: "marketing variance: +GMD 450.00 (+12%) vs budget GMD 3,000.00",
  },
  {
    state: "EXPLAINABLE",
    timestamp: "09:15:02.011",
    detail:
      "explanation basis: driver cited — INV #4471 Cloudline Ltd (GMD 300.00), remaining spread across recurring spend",
  },
  {
    state: "UNEXPLAINED",
    timestamp: "09:15:02.133",
    detail: "travel: no single driver identified — labeled not yet explainable",
  },
  {
    state: "ALERT_CHECK",
    timestamp: "09:15:02.300",
    detail:
      "alert threshold 10% — marketing 12% breached, alert surfaced to Department Manager",
  },
  {
    state: "ACTUAL_UPDATED",
    timestamp: "09:16:00.000",
    detail:
      "recurring pull: office supplies actual GMD 1,400.00 — GMD 100 under budget",
  },
];

const STEPS = [
  {
    title: "Pull Actual",
    detail:
      "Input: ledger data for tracked category. Output: actual-to-date figure. No confidence score — deterministic lookup from Ledger Agent, never estimated.",
  },
  {
    title: "Calculate Variance",
    detail:
      "Input: actual vs budget. Output: variance in $ and %. No confidence score — pure arithmetic.",
  },
  {
    title: "Attempt to Explain Variance",
    detail:
      "Input: transactions contributing to the actual. Output: a specific traceable driver (e.g. 'GMD 300 of the GMD 450 overage is one invoice from Cloudline Ltd') OR an explicit 'no single driver identified'. Pattern-based explanations carry a confidence score but are never presented as fact without the underlying transactions cited.",
  },
  {
    title: "Check Alert Threshold",
    detail:
      "Input: variance vs configured %/$ band. Output: alert or no alert. No confidence score — deterministic comparison.",
  },
  {
    title: "Surface Alerts",
    detail:
      "Alerts surfaced proactively — not just when the budget screen is opened. No confidence score — structural escalation.",
  },
];

const CONSTRAINTS = [
  { label: "Explanations Cite Transactions", icon: Receipt },
  { label: "Unexplained Labeled, Never Guessed", icon: HelpCircle },
  { label: "Unbudgeted Spend Flagged", icon: Wallet },
  { label: "Variance Shown Live", icon: TrendingUp },
  { label: "Arithmetic, Not Inference", icon: BarChart3 },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: BudgetState): React.ElementType {
  switch (state) {
    case "BUDGET_LINE_TRACKED":
      return PiggyBank;
    case "ACTUAL_UPDATED":
      return TrendingUp;
    case "VARIANCE_CALCULATED":
      return BarChart3;
    case "EXPLAINABLE":
      return CheckCircle2;
    case "UNEXPLAINED":
      return HelpCircle;
    case "ALERT_CHECK":
      return Bell;
  }
}

function getStateColor(state: BudgetState): string {
  switch (state) {
    case "BUDGET_LINE_TRACKED":
      return "text-muted-foreground/70";
    case "ACTUAL_UPDATED":
    case "VARIANCE_CALCULATED":
      return "text-signal-indigo";
    case "EXPLAINABLE":
      return "text-balanced-green";
    case "UNEXPLAINED":
      return "text-attention-amber";
    case "ALERT_CHECK":
      return "text-attention-amber";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ layer, label }: { layer: "1"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
      Layer {layer} — {label}
    </span>
  );
}

function BranchCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: "amber" | "red" | "green";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : "border-balanced-green/30 bg-balanced-green/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : "bg-balanced-green/10 text-balanced-green";
  return (
    <div className={cn("rounded-xl border p-4", toneClasses)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconClasses,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{title}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function BudgetLiveness({
  className,
  showEmptyState,
  showUnexplained,
  showUnbudgeted,
  showAlert,
}: BudgetLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [txnsOpen, setTxnsOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <PiggyBank className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No budget tracked</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Create a budget or start a new period — Budget Agent will track
            lines, pull actuals, and surface variance explanations here.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Unexplained variance (honest label, never guessed) ───────
  if (showUnexplained) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <HelpCircle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Variance Not Yet Explainable
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Honest label — never guessed
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Not yet explainable
          </span>
        </div>
        <BranchCard
          icon={HelpCircle}
          title="Travel is GMD 200 over budget — no single driver identified"
          tone="amber"
        >
          <p>
            The agent checked this period&apos;s travel transactions and cannot
            point to a specific driver causing the variance. Per the critical
            rule, it says so rather than produce a plausible-sounding but
            unverified narrative — likely multiple small overages across
            recurring spend.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to Department Manager and CFO Agent for awareness.
            Non-blocking — never guessed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Unbudgeted spend (Spec §7) ───────────────────────────────
  if (showUnbudgeted) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Wallet className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Unbudgeted Spend Flagged
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — no budget set for a category with actual spend
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Flagged
          </span>
        </div>
        <BranchCard
          icon={Wallet}
          title="GMD 350 actual spend on 'Software Subscriptions' with no budget line"
          tone="amber"
        >
          <p>
            No budget was set for this category, but actual spend exists. The
            spend is flagged as unbudgeted spend — never silently ignored and
            never forced into the nearest category.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to Department Manager and CFO Agent to decide whether to
            add a budget line or reclassify.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Alert breach (Spec §6) ───────────────────────────────────
  if (showAlert) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Bell className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Alert Surfaced</h2>
              <p className="text-[10px] text-muted-foreground">
                Surfaced proactively — non-blocking
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Alert
          </span>
        </div>
        <BranchCard
          icon={Bell}
          title="Marketing is 12% over budget — exceeds the 10% alert threshold"
          tone="amber"
        >
          <p>
            The alert is surfaced proactively — not just when the budget screen
            is opened. Marketing variance of GMD 450 (12%) exceeds the
            configured 10% threshold.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to Department Manager and CFO Agent. Non-blocking — other
            budget lines continue tracking normally.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: BudgetState = "EXPLAINABLE";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <PiggyBank className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Budget Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Explanations cite transactions
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Variance explanations are where this agent is most likely to
              hallucinate a cause — every explanation must trace to real data or
              be explicitly labeled as not yet explainable.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <Activity className="h-3 w-3 animate-pulse" />
            Explaining variance
          </span>
          <span className="text-[9px] text-muted-foreground">
            Entity: Xenboox HQ
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        data-live-status
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-balanced-green animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">EXPLAINABLE</span> —
        Marketing is GMD 450 over budget (12%), traced to 1 invoice
      </div>

      {/* Pipeline */}
      <section
        aria-label="Budget State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Budget State Machine
          </h3>
          <LayerTag layer="1" label="deterministic" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isFork = stage.id === "UNEXPLAINED";
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "ALERT_CHECK";
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-balanced-green/30 bg-balanced-green/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-balanced-green/15"
                      : isComplete
                        ? "bg-balanced-green/10"
                        : "bg-muted",
                  )}
                >
                  {isActive ? (
                    <Activity
                      className={cn(
                        "h-3 w-3 animate-pulse",
                        getStateColor(stage.id),
                      )}
                    />
                  ) : (
                    <Icon className={cn("h-3 w-3", getStateColor(stage.id))} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums">
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && !isTerminal && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
                      </span>
                    )}
                    {isFork && (
                      <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                        FORK
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                {isTerminal && (
                  <span className="text-[9px] text-muted-foreground/60">
                    terminal
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Live Budget vs Actual bars */}
      <section
        aria-label="Live Budget vs Actual"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Live Budget vs Actual
          </h3>
          <LayerTag layer="1" label="updating live" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Budget vs actual bars updating live per category as transactions post
          — actual figures tick against budget lines in real time.
        </p>
        <div className="space-y-2">
          {BARS.map((b) => (
            <div
              key={b.name}
              className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium">{b.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                    b.status === "over"
                      ? "bg-attention-amber/10 text-attention-amber"
                      : b.status === "under"
                        ? "bg-signal-indigo/10 text-signal-indigo"
                        : "bg-balanced-green/10 text-balanced-green",
                  )}
                >
                  {b.badge}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    b.status === "over"
                      ? "bg-attention-amber"
                      : b.status === "under"
                        ? "bg-signal-indigo"
                        : "bg-balanced-green",
                  )}
                  style={{ width: `${Math.min(100, b.pct)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                <span>Budget {b.budgetLabel}</span>
                <span>Actual {b.actualLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Variance Explanations */}
      <section
        aria-label="Variance Explanations"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Variance Explanations
          </h3>
          <LayerTag layer="1" label="transactions cited or labeled" />
        </div>

        {/* Explained */}
        <div className="rounded-lg border border-balanced-green/30 bg-balanced-green/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
            <p className="text-[11px] font-semibold">
              Marketing is GMD 450 over budget (12%)
            </p>
            <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
              EXPLAINED
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            GMD 300 traces to one invoice (Cloudline Ltd, June 14) not in
            original budget assumptions. Remaining GMD 150 spread across normal
            recurring spend.
          </p>
          <button
            onClick={() => setTxnsOpen((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Receipt className="h-2.5 w-2.5" />
            Show cited transactions ({CITED_TRANSACTIONS.length})
            <ChevronDown
              className={cn(
                "h-2.5 w-2.5 transition-transform",
                txnsOpen && "rotate-180",
              )}
            />
          </button>
          {txnsOpen && (
            <div className="mt-2 space-y-1">
              {CITED_TRANSACTIONS.map((t) => (
                <div
                  key={t.ref}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-[9px]"
                >
                  <span className="font-mono text-muted-foreground">
                    {t.ref}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {t.vendor} · {t.date}
                  </span>
                  <span className="font-semibold tabular-nums">{t.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unexplained */}
        <div className="mt-2 rounded-lg border border-attention-amber/30 bg-attention-amber/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-attention-amber" />
            <p className="text-[11px] font-semibold">
              Travel is GMD 200 over budget
            </p>
            <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
              NOT YET EXPLAINABLE
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            No single driver identified across this period&apos;s transactions;
            likely multiple small overages. Labeled honestly — never guessed.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Budget Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Period", value: "Q2 2026" },
          { label: "Alert Threshold", value: "10%" },
          { label: "Tracked Lines", value: "4" },
          { label: "Explained Variances", value: "1" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Escalation & Human-in-the-Loop */}
      <section
        aria-label="Escalation & Human-in-the-Loop"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Escalation &amp; Human-in-the-Loop
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b text-muted-foreground/60">
                <th className="py-1.5 pr-2 font-medium">Condition</th>
                <th className="py-1.5 pr-2 font-medium">Escalates to</th>
                <th className="py-1.5 pr-2 font-medium">What user sees</th>
                <th className="py-1.5 font-medium">Blocking?</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  condition: "Variance exceeds alert threshold",
                  esc: "Department Manager, CFO Agent",
                  note: "'Alert surfaced' — proactively, not only when the budget screen is opened",
                  blocking: "Non-blocking",
                },
                {
                  condition:
                    "Budget line approaching full-year exhaustion early",
                  esc: "CFO Agent, human",
                  note: "Forecast-based warning surfaced",
                  blocking: "Non-blocking",
                },
              ].map((row) => (
                <tr
                  key={row.condition}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.condition}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.esc}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.note}
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {row.blocking}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section aria-label="How It Works" className="rounded-xl border bg-card">
        <button
          onClick={() => setHowItWorksOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <Eye className="h-3.5 w-3.5 text-signal-indigo" />
            How It Works — Step-by-Step
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              howItWorksOpen && "rotate-180",
            )}
          />
        </button>
        {howItWorksOpen && (
          <div className="space-y-2 border-t px-4 py-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-3 rounded-lg bg-muted/20 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-[9px] font-bold text-signal-indigo">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[11px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Constraint Enforcement */}
      <section
        aria-label="Constraint Enforcement"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Constraint Enforcement
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CONSTRAINTS.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-medium"
            >
              <c.icon className="h-3 w-3 text-balanced-green" />
              {c.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          The critical rule: plain-English explanations of significant variances
          must be grounded in actually-identified transactions. If the agent
          can&apos;t point to specific transactions causing the variance, it
          says so — labeling it &quot;not yet explainable&quot; rather than
          produce a plausible-sounding but unverified narrative.
        </p>
      </section>

      {/* Audit Trail */}
      <section aria-label="Audit Trail" className="rounded-xl border bg-card">
        <button
          onClick={() => setAuditOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
            Audit Trail — Every Variance Calculation
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              auditOpen && "rotate-180",
            )}
          />
        </button>
        {auditOpen && (
          <div className="border-t">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b text-muted-foreground/60">
                  <th className="px-4 py-2 font-medium">Timestamp</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_TRAIL.map((entry, i) => {
                  const Icon = getStateIcon(entry.state);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                        {entry.timestamp}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            entry.state === "UNEXPLAINED"
                              ? "bg-attention-amber/10 text-attention-amber"
                              : entry.state === "EXPLAINABLE"
                                ? "bg-balanced-green/10 text-balanced-green"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {entry.state}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                        {entry.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Dependencies */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {["Ledger Agent", "Budget Agent", "Reporting Agent", "CFO Agent"].map(
            (agent, i) => (
              <span key={agent} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    agent === "Budget Agent"
                      ? "bg-primary/10 font-semibold text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {agent}
                </span>
                {i < 3 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                )}
              </span>
            ),
          )}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Pulls actuals from Ledger Agent for every tracked line — never guesses
          a figure. Feeds Reporting Agent for close reports and CFO Agent for
          strategic flags.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: variance math is arithmetic, never inferred;
          every explanation either cites transactions or is honestly labeled
        </span>
      </div>
    </div>
  );
}
