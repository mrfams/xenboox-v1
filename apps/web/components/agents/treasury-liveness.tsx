"use client";

import React from "react";
import { useState } from "react";
import {
  Inbox,
  Calculator,
  ShieldCheck,
  Landmark,
  Wallet,
  Smartphone,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type TreasuryState =
  | "DATA_ARRIVING"
  | "ROLLUP_UPDATING"
  | "RECONCILIATION_REVIEW"
  | "DAILY_POSITION_CONFIRMED";

export interface StateTransition {
  state: TreasuryState;
  timestamp: string;
  detail: string;
}

export interface TreasuryLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showStaleSource?: boolean;
  showUnresolved?: boolean;
  showPositionAlert?: boolean;
  showConfirmed?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: TreasuryState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "DATA_ARRIVING",
    label: "DATA_ARRIVING",
    description:
      "Continuous multi-source ingestion — Cash, Mobile Money, Reconciliation, Expense report new data",
    icon: Inbox,
  },
  {
    id: "ROLLUP_UPDATING",
    label: "ROLLUP_UPDATING",
    description:
      "Recalculating total cash position across all tills, banks, and mobile rails",
    icon: Calculator,
  },
  {
    id: "RECONCILIATION_REVIEW",
    label: "RECONCILIATION_REVIEW",
    description:
      "Reviewing unresolved items before allowing closure — a hard gate, not a judgment call",
    icon: ShieldCheck,
  },
  {
    id: "DAILY_POSITION_CONFIRMED",
    label: "DAILY_POSITION_CONFIRMED",
    description:
      "Producing the daily treasury position report once every source reconciles",
    icon: Landmark,
  },
];

const SOURCES: Array<{
  id: string;
  label: string;
  amount: string;
  status: string;
  timestamp: string;
  icon: React.ElementType;
  statusClass: string;
}> = [
  {
    id: "bank",
    label: "Bank",
    amount: "GMD 8,200.00",
    status: "reconciled",
    timestamp: "last updated 09:42",
    icon: Landmark,
    statusClass: "text-balanced-green",
  },
  {
    id: "tills",
    label: "Cash Tills",
    amount: "GMD 2,100.00",
    status: "reconciled",
    timestamp: "last updated 09:40",
    icon: Wallet,
    statusClass: "text-balanced-green",
  },
  {
    id: "mobile",
    label: "Mobile Money",
    amount: "GMD 2,100.00",
    status: "1 timing gap, expected",
    timestamp: "last updated 09:38",
    icon: Smartphone,
    statusClass: "text-signal-indigo",
  },
];

const UNRESOLVED_ITEMS: Array<{
  source: string;
  detail: string;
}> = [
  {
    source: "Mobile Money Agent",
    detail: "MTN MoMo txn GMD 40.00 — no matching ledger entry",
  },
  {
    source: "Reconciliation Agent",
    detail: "bank line GMD 200.00 — likely timing difference",
  },
  {
    source: "Cash Agent",
    detail: "till variance GMD 20.00 — short, unresolved",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "ROLLUP_UPDATING",
    timestamp: "09:20:00.112",
    detail:
      "recalculated total position: bank 8,200.00 + tills 2,100.00 + mobile 2,100.00 = GMD 12,400.00 (source timestamps 09:42/09:40/09:38)",
  },
  {
    state: "DATA_ARRIVING",
    timestamp: "09:38:12.400",
    detail:
      "mobile money: 214 Wave transactions parsed (source timestamp 09:38)",
  },
  {
    state: "DATA_ARRIVING",
    timestamp: "09:40:03.221",
    detail: "cash tills: till-01 balance reconciled (source timestamp 09:40)",
  },
  {
    state: "DATA_ARRIVING",
    timestamp: "09:42:41.030",
    detail: "bank: GTBank statement reconciled (source timestamp 09:42)",
  },
  {
    state: "ROLLUP_UPDATING",
    timestamp: "09:42:41.885",
    detail:
      "total recalculated: GMD 12,400.00 across 3 sources — arithmetic, never inferred",
  },
  {
    state: "RECONCILIATION_REVIEW",
    timestamp: "09:43:00.512",
    detail:
      "3 unresolved items flagged (mobile 1, recon 1, cash 1) — closure blocked, hard gate (PRD §6.4)",
  },
  {
    state: "DAILY_POSITION_CONFIRMED",
    timestamp: "09:45:00.000",
    detail:
      "daily position confirmed: GMD 12,400.00 across 3 accounts/rails (prior day)",
  },
];

const STEPS = [
  {
    title: "Ingest from Each Source Agent",
    detail:
      "Input: reports from Cash Agent, Mobile Money Agent, Reconciliation Agent, Expense Agent. Output: per-source balances + last-updated timestamps. No confidence score — structural aggregation.",
  },
  {
    title: "Recalculate Rollup",
    detail:
      "Input: per-source balances. Output: total position broken down by source. No confidence score — arithmetic, never inferred.",
  },
  {
    title: "Review Unresolved Items",
    detail:
      "Output: block or clear. No confidence score — this agent enforces a hard rule (never close a reconciliation with unresolved items), it doesn't judge case by case. PRD §6.4.",
  },
  {
    title: "Confirm Daily Position",
    detail:
      "Output: signed-off position report. No confidence score — deterministic confirmation once every source reconciles.",
  },
];

const CONSTRAINTS = [
  { label: "Never Close With Unresolved", icon: ShieldCheck },
  { label: "Per-Source Timestamps", icon: Clock },
  { label: "Stale Source Shown Never Excluded", icon: AlertTriangle },
  { label: "Rollup Broken Down by Source", icon: BarChart3 },
  { label: "Arithmetic Not Inference", icon: Calculator },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: TreasuryState): React.ElementType {
  switch (state) {
    case "DATA_ARRIVING":
      return Inbox;
    case "ROLLUP_UPDATING":
      return Calculator;
    case "RECONCILIATION_REVIEW":
      return ShieldCheck;
    case "DAILY_POSITION_CONFIRMED":
      return Landmark;
  }
}

function getStateColor(state: TreasuryState): string {
  switch (state) {
    case "DATA_ARRIVING":
      return "text-muted-foreground/70";
    case "ROLLUP_UPDATING":
      return "text-signal-indigo";
    case "RECONCILIATION_REVIEW":
      return "text-attention-amber";
    case "DAILY_POSITION_CONFIRMED":
      return "text-balanced-green";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
      Layer 1 — {label}
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

export function TreasuryLiveness({
  className,
  showEmptyState,
  showStaleSource,
  showUnresolved,
  showPositionAlert,
  showConfirmed,
}: TreasuryLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No source data awaiting rollup</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Treasury Agent aggregates Cash, Mobile Money, Reconciliation, and
            Expense agents for real-time position awareness. Nothing to roll up
            right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Stale source (Spec §7) — never silently excluded ─────────
  if (showStaleSource) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Smartphone className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Source Not Reporting</h2>
              <p className="text-[10px] text-muted-foreground">
                Wave API down — mobile money source unreachable (Spec §7)
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking for confirmation
          </span>
        </div>
        <BranchCard
          icon={Smartphone}
          title="Mobile money balance marked stale"
          tone="amber"
        >
          <p>
            The Wave API has been unreachable since 09:38. Mobile money balance
            marked stale — last received 09:38. Shown explicitly as a
            stale/missing source — never silently excluded from the total.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Total incomplete — GMD 10,300.00 of GMD 12,400.00 expected. Shown
            explicitly as a stale/missing source, not silently excluded from the
            total.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Unresolved past reasonable window (Spec §6) — blocking ───
  if (showUnresolved) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <ShieldCheck className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Reconciliation Cannot Close
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — unresolved past a reasonable window, escalating
                urgency
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking for close
          </span>
        </div>
        <BranchCard
          icon={ShieldCheck}
          title="3 unresolved items remain past the reasonable window"
          tone="red"
        >
          <p>
            Reconciliation unresolved past a reasonable window — escalated to
            CFO Agent with escalating urgency shown. The daily position cannot
            be confirmed until every item resolves.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking for close — the hard gate holds. Never closed with
            unresolved items (PRD §6.4).
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Position needs attention (Spec §6) — non-blocking but urgent
  if (showPositionAlert) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Landmark className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Position Needs Attention
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — low runway, large scheduled payment vs position
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Non-blocking but urgent
          </span>
        </div>
        <BranchCard
          icon={Landmark}
          title="GMD 8,000.00 scheduled payment vs GMD 12,400.00 position"
          tone="amber"
        >
          <p>
            Cash position needs strategic attention — a large scheduled payment
            against the current position. Proactive alert surfaced to CFO Agent
            and human — never buried in a report.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Non-blocking but urgent — proactive alert, not a batch monthly
            report.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Daily position confirmed (terminal) ──────────────────────
  if (showConfirmed) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Daily Position Confirmed
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — all sources reconciled for the day
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="Daily position confirmed: GMD 12,400.00 across 3 accounts/rails"
          tone="green"
        >
          <p>
            Daily position report produced from its component sources — bank GMD
            8,200.00 (reconciled), cash tills GMD 2,100.00 (reconciled), mobile
            money GMD 2,100.00 (1 timing gap, expected).
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Landmark className="h-3 w-3 text-balanced-green" />
            All sources reconciled for the day — daily position report delivered
            to CFO Agent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: TreasuryState = "RECONCILIATION_REVIEW";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-700">
            <Landmark className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Treasury Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Real-time position awareness
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Treasury Agent&apos;s job is real-time position awareness across
              every cash-adjacent worker agent — its liveness shows a live
              rollup building across multiple accounts and rails simultaneously,
              not a static daily snapshot.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Reviewing
          </span>
          <span className="text-[9px] text-muted-foreground">
            Entity: Xenboox HQ
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-attention-amber animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">
          RECONCILIATION_REVIEW
        </span>{" "}
        — 3 unresolved items — reconciliation cannot close
      </div>

      {/* Pipeline */}
      <section
        aria-label="Treasury State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Treasury State Machine
          </h3>
          <LayerTag label="deterministic lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "DAILY_POSITION_CONFIRMED";
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-attention-amber/30 bg-attention-amber/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-attention-amber/15"
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
                      <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
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

      {/* Live Multi-Source Position Dashboard */}
      <section
        aria-label="Position Dashboard"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Position Dashboard
          </h3>
          <LayerTag label="live multi-source" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Live multi-source position dashboard — every cash-adjacent source
          ticking independently with per-source last-updated timestamps.
        </p>
        <div className="space-y-1.5">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            return (
              <div
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[11px] font-medium">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {source.label}
                  <span
                    className={cn(
                      "rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium",
                      source.statusClass,
                    )}
                  >
                    {source.status}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-[10px]">
                  <span className="font-semibold tabular-nums">
                    {source.amount}
                  </span>
                  <span className="text-muted-foreground/60">
                    {source.timestamp}
                  </span>
                </span>
              </div>
            );
          })}
          {/* Total */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/10 px-3 py-2">
            <span className="text-[11px] font-semibold">Total position</span>
            <span className="text-[11px] font-bold tabular-nums">
              GMD 12,400.00
            </span>
          </div>
          <p className="pt-0.5 text-[10px] text-muted-foreground">
            Broken down by source — arithmetic, never inferred. The total ticks
            live as each source reports.
          </p>
        </div>
      </section>

      {/* Reconciliation Review — hard gate */}
      <section
        aria-label="Reconciliation Review"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Reconciliation Review
          </h3>
          <LayerTag label="hard gate" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-error-clay/30 bg-error-clay/5 px-3 py-2">
          <span className="text-[11px] font-semibold">
            3 unresolved items — reconciliation cannot close
          </span>
          <span className="rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-semibold text-error-clay">
            Blocking for close
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {UNRESOLVED_ITEMS.map((item) => (
            <div
              key={item.source}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[11px] font-medium">
                <AlertTriangle className="h-3 w-3 text-attention-amber" />
                {item.source}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Every unresolved item is surfaced with the source agent that flagged
          it and why — never silently resolved.
        </p>
      </section>

      {/* Daily Position Report */}
      <section
        aria-label="Daily Position Report"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Daily Position Report
          </h3>
          <LayerTag label="builds from sources" />
        </div>
        <p className="mb-2 text-[10px] text-muted-foreground">
          Builds from its component sources — never a single one-number
          snapshot.
        </p>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <p className="text-[11px] font-medium">
            Daily position: GMD 12,400.00 total — GMD 8,200.00 bank
            (reconciled), GMD 2,100.00 cash tills (reconciled), GMD 2,100.00
            mobile money (1 timing gap, expected).
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-attention-amber/30 bg-attention-amber/5 px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Pending confirmation — 3 unresolved items block closure (hard gate).
          </div>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Treasury Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Position", value: "GMD 12,400.00" },
          { label: "Sources", value: "3" },
          { label: "Unresolved Items", value: "3" },
          { label: "Last Confirmed", value: "Pending" },
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
                  condition:
                    "Cash position needs strategic attention (low runway, large scheduled payment vs position)",
                  esc: "CFO Agent, human",
                  note: "'Proactive alert surfaced' — not buried in a report",
                  blocking: "Non-blocking but urgent",
                },
                {
                  condition:
                    "Reconciliation unresolved past a reasonable window",
                  esc: "CFO Agent",
                  note: "'Escalating urgency shown' — close stays blocked",
                  blocking: "Blocking for close",
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
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                        row.blocking.startsWith("Blocking")
                          ? "bg-error-clay/10 text-error-clay"
                          : "bg-attention-amber/10 text-attention-amber",
                      )}
                    >
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
            <Calculator className="h-3.5 w-3.5 text-signal-indigo" />
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
          The critical rule: Treasury Agent never marks a reconciliation
          complete while any worker agent under it still reports unresolved
          items — a hard gate, not a judgment call, per PRD §6.4. A source that
          fails to report is shown explicitly, never silently excluded.
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
            Audit Trail — Every Rollup &amp; Decision
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
                            entry.state === "RECONCILIATION_REVIEW"
                              ? "bg-error-clay/10 text-error-clay"
                              : entry.state === "DAILY_POSITION_CONFIRMED"
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
          {[
            "Cash Agent",
            "Mobile Money Agent",
            "Reconciliation Agent",
            "Expense Agent",
            "Treasury Agent",
            "CFO Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Treasury Agent"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {agent}
              </span>
              {i < 5 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Aggregates Cash Agent, Mobile Money Agent, Reconciliation Agent, and
          Expense Agent. Reports to CFO Agent — real-time position awareness
          across every cash-adjacent worker agent.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: ingestion, rollup arithmetic, hard-gate
          review, daily confirmation — a position is never guessed
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Calculator className="h-3 w-3 text-signal-indigo" />
          Every step carries no confidence score — structural aggregation,
          arithmetic, and a hard rule, never judgment
        </span>
      </div>
    </div>
  );
}
