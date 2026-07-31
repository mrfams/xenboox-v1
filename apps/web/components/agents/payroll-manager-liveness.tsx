"use client";

import React from "react";
import { useState } from "react";
import {
  PlayCircle,
  CheckSquare,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  FileWarning,
  Calculator,
  ClipboardCheck,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type PayrollManagerState =
  | "RUN_INITIATED"
  | "REVIEWING_STANDARD_CALCULATIONS"
  | "REVIEWING_EXCEPTIONS"
  | "STATUTORY_CONFIRMATION"
  | "APPROVED_FOR_POSTING";

export interface StateTransition {
  state: PayrollManagerState;
  timestamp: string;
  detail: string;
}

export interface PayrollManagerLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showIncompleteException?: boolean;
  showJurisdictionGap?: boolean;
  showApproved?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: PayrollManagerState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "RUN_INITIATED",
    label: "RUN_INITIATED",
    description:
      "Monthly payroll run started — coordinating the Payroll Worker Agent across all staff",
    icon: PlayCircle,
  },
  {
    id: "REVIEWING_STANDARD_CALCULATIONS",
    label: "REVIEWING_STANDARD_CALCULATIONS",
    description:
      "Confirming each standard calculation against the Worker Agent's per-step breakdown",
    icon: CheckSquare,
  },
  {
    id: "REVIEWING_EXCEPTIONS",
    label: "REVIEWING_EXCEPTIONS",
    description:
      "Handling each exception as its own explicit case — never bundled into the standard run",
    icon: UserPlus,
  },
  {
    id: "STATUTORY_CONFIRMATION",
    label: "STATUTORY_CONFIRMATION",
    description:
      "Confirming statutory deductions correct for the jurisdiction — deterministic rule-table check",
    icon: ShieldCheck,
  },
  {
    id: "APPROVED_FOR_POSTING",
    label: "APPROVED_FOR_POSTING",
    description:
      "Approving journal posting — handed to Controller Agent for review",
    icon: CheckCircle2,
  },
];

const EXCEPTIONS: Array<{
  id: string;
  type: string;
  reason: string;
  name: string;
  detail: string;
  calculation: string;
}> = [
  {
    id: "new-starter",
    type: "New Starter",
    reason: "New starter — joined mid-period",
    name: "Awa Jallow",
    detail: "Joined June 15 — pro-rated for 15 of 30 days this period.",
    calculation: "Standard monthly salary GMD 600.00 → GMD 300.00 this period",
  },
  {
    id: "salary-change",
    type: "Salary Change",
    reason: "Salary change — rate updated",
    name: "Lamin Touray",
    detail: "GMD 500.00 → GMD 550.00 effective June 1, per HR update.",
    calculation: "New rate applied for full period",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "RUN_INITIATED",
    timestamp: "09:30:00.000",
    detail: "payroll run started for June 2026 — 36 staff, entity Xenboox HQ",
  },
  {
    state: "REVIEWING_STANDARD_CALCULATIONS",
    timestamp: "09:31:12.400",
    detail:
      "standard review: 34 of 36 staff confirmed against Worker Agent breakdown",
  },
  {
    state: "REVIEWING_EXCEPTIONS",
    timestamp: "09:32:41.030",
    detail:
      "exception handled: Awa Jallow (new starter) — pro-rated 15 of 30 days, basis cited",
  },
  {
    state: "REVIEWING_EXCEPTIONS",
    timestamp: "09:33:05.221",
    detail:
      "exception handled: Lamin Touray (salary change) — GMD 500.00 → GMD 550.00 effective June 1, basis cited",
  },
  {
    state: "STATUTORY_CONFIRMATION",
    timestamp: "09:34:12.885",
    detail:
      "statutory deductions confirmed for Gambia (GRA/SSHFC) — deterministic rule-table check",
  },
  {
    state: "APPROVED_FOR_POSTING",
    timestamp: "10:02:14.000",
    detail: "payroll approved — handed to Controller Agent for journal review",
  },
];

const STEPS = [
  {
    title: "Initiate Run",
    detail:
      "Input: monthly run trigger. Output: run coordinated across Payroll Worker Agent. No confidence score — structural.",
  },
  {
    title: "Review Standard Calculations",
    detail:
      "Output: confirmed per staff member. No confidence score — review against the Worker Agent's per-step breakdown.",
  },
  {
    title: "Handle Each Exception Individually",
    detail:
      "New starter (pro-rated calc shown), leaver (final pay + any severance shown separately), salary change (effective date + old/new rate shown), bonus (separate line, not blended into base) — each its own confirmed sub-decision, never bundled.",
  },
  {
    title: "Confirm Statutory Correctness",
    detail:
      "Output: pass or jurisdiction gap flagged. No confidence score — deterministic rule-table check.",
  },
  {
    title: "Approve for Posting",
    detail:
      "Output: approved run handed to Controller Agent. No confidence score — deterministic approval.",
  },
];

const CONSTRAINTS = [
  { label: "Exceptions Never Bundled", icon: UserPlus },
  { label: "Pro-Rate Shown Explicitly", icon: Calculator },
  { label: "Effective Date Named", icon: RefreshCw },
  { label: "Statutory Rule-Table Check", icon: ShieldCheck },
  { label: "Approved With Reason", icon: ClipboardCheck },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: PayrollManagerState): React.ElementType {
  switch (state) {
    case "RUN_INITIATED":
      return PlayCircle;
    case "REVIEWING_STANDARD_CALCULATIONS":
      return CheckSquare;
    case "REVIEWING_EXCEPTIONS":
      return UserPlus;
    case "STATUTORY_CONFIRMATION":
      return ShieldCheck;
    case "APPROVED_FOR_POSTING":
      return CheckCircle2;
  }
}

function getStateColor(state: PayrollManagerState): string {
  switch (state) {
    case "RUN_INITIATED":
      return "text-muted-foreground/70";
    case "REVIEWING_STANDARD_CALCULATIONS":
      return "text-signal-indigo";
    case "REVIEWING_EXCEPTIONS":
      return "text-attention-amber";
    case "STATUTORY_CONFIRMATION":
      return "text-signal-indigo";
    case "APPROVED_FOR_POSTING":
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

export function PayrollManagerLiveness({
  className,
  showEmptyState,
  showIncompleteException,
  showJurisdictionGap,
  showApproved,
}: PayrollManagerLivenessProps) {
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
          <p className="text-sm font-medium">No payroll run in progress</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Payroll Manager Agent coordinates the monthly run and handles every
            exception deliberately. Nothing to review right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Incomplete/ambiguous exception (Spec §6/§7) — blocking ───
  if (showIncompleteException) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <FileWarning className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Salary Change Missing Effective Date
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — missing effective date, cannot proceed for that
                individual
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking for that individual
          </span>
        </div>
        <BranchCard
          icon={FileWarning}
          title="Need confirmation on effective date for Lamin Touray"
          tone="red"
        >
          <p>
            Exception details incomplete or ambiguous — escalated to Human
            (HR/Finance). The salary change cannot proceed to statutory
            confirmation for that individual until the effective date is
            confirmed. Never guessed, never silently absorbed.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking for that individual — cannot proceed to statutory
            confirmation for that individual until the effective date is
            confirmed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Jurisdiction rule gap (Spec §6) — blocking ───────────────
  if (showJurisdictionGap) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <ShieldCheck className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Jurisdiction Rule Gap</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — statutory rule table missing for a jurisdiction
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={ShieldCheck}
          title="No statutory rule table found for Guinea-Bissau"
          tone="red"
        >
          <p>
            Jurisdiction rule gap found during statutory confirmation. Flagged
            to Compliance Agent — the run is held for that jurisdiction's staff.
            A guessed rate is never applied.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking — run held for that jurisdiction's staff until Compliance
            Agent provides the rule table.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Approved for posting (terminal) ──────────────────────────
  if (showApproved) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Payroll Approved — Handed to Controller Agent
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — approved for posting, terminal for Payroll Manager
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="June 2026 payroll approved for posting"
          tone="green"
        >
          <p>
            Payroll approved — handed to Controller Agent for journal review,
            then Ledger Agent for posting. Approval timestamp 10:02:14. Summary
            reported to CFO Agent monthly.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ClipboardCheck className="h-3 w-3 text-balanced-green" />
            Approval timestamp 10:02:14 — journal handoff to Controller Agent,
            then Ledger Agent for posting.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: PayrollManagerState = "REVIEWING_EXCEPTIONS";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-purple-700">
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Payroll Manager Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Management-tier exception handler
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Exceptions (new starter, leaver, salary change, bonus) are exactly
              the cases most likely to get silently folded into a standard run
              if not given their own explicit flow — this management-tier agent
              catches and handles them deliberately, not automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Reviewing exceptions
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
          REVIEWING_EXCEPTIONS
        </span>{" "}
        — 2 exceptions requiring individual review
      </div>

      {/* Pipeline */}
      <section
        aria-label="Payroll Manager State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Payroll Manager State Machine
          </h3>
          <LayerTag label="deterministic lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "APPROVED_FOR_POSTING";
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

      {/* Run Progress — Two Parallel Tracks */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Run Progress — Two Parallel Tracks
          </h3>
          <LayerTag label="standard vs exceptions" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Two parallel tracks: standard staff run as a simple progress count,
          exceptions as individual cards requiring explicit review — never
          blended.
        </p>

        {/* Standard track */}
        <section
          aria-label="Standard Track"
          className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-medium">
              <CheckSquare className="h-3.5 w-3.5 text-balanced-green" />
              Standard staff
            </span>
            <span className="text-[10px] font-semibold tabular-nums">
              34 of 36 standard staff reviewed — ticking up live
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-balanced-green"
              style={{ width: "94%" }}
            />
          </div>
        </section>

        {/* Exceptions track */}
        <section
          aria-label="Exceptions Track"
          className="mt-2 rounded-lg border border-attention-amber/30 bg-attention-amber/5 px-3 py-2.5"
        >
          <p className="mb-2 text-[10px] font-medium text-attention-amber">
            Exceptions — individual review required
          </p>
          <div className="space-y-1.5">
            {EXCEPTIONS.map((exc) => (
              <div
                key={exc.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-semibold">
                    {exc.type === "New Starter" ? (
                      <UserPlus className="h-3.5 w-3.5 text-signal-indigo" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-signal-indigo" />
                    )}
                    {exc.name}
                  </span>
                  <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                    Confirmed
                  </span>
                </div>
                <p className="mt-1 text-[9px] font-medium text-muted-foreground/70">
                  {exc.reason}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {exc.detail} {exc.calculation}.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Statutory Confirmation */}
      <section
        aria-label="Statutory Confirmation"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Statutory Confirmation
          </h3>
          <LayerTag label="rule-table check" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-balanced-green" />
            <p className="text-[11px] font-semibold">
              Statutory deductions confirmed for Gambia (GRA/SSHFC)
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Deterministic rule-table check — rule table v2.1 applied across the
            run. No confidence score.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Payroll Manager Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Run Period", value: "June 2026" },
          { label: "Staff", value: "36" },
          { label: "Reviewed", value: "34" },
          { label: "Exceptions", value: "2" },
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
                  condition: "Exception details incomplete or ambiguous",
                  esc: "Human (HR/Finance)",
                  note: "Need confirmation on [detail] for [Name]'s [exception type]",
                  blocking: "Blocking for that individual",
                },
                {
                  condition:
                    "Jurisdiction rule gap found during statutory confirmation",
                  esc: "Compliance Agent",
                  note: "Run held for that jurisdiction's staff",
                  blocking: "Blocking",
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
          The critical rule: exceptions are never silently absorbed into the
          standard run — a new starter&apos;s pro-rated first paycheck is shown
          as its own explicit calculation with its own confirmation step,
          distinct from every other standard staff member in that run.
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
            Audit Trail — Every Exception &amp; Decision
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
                            entry.state === "REVIEWING_EXCEPTIONS"
                              ? "bg-attention-amber/10 text-attention-amber"
                              : entry.state === "APPROVED_FOR_POSTING"
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
            "Payroll Worker Agent",
            "Payroll Manager Agent",
            "Controller Agent",
            "Ledger Agent",
            "CFO Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Payroll Manager Agent"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {agent}
              </span>
              {i < 4 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Oversees Payroll Worker Agent. Hands approved run to Controller Agent
          (journal review) then Ledger Agent (posting). Reports summary to CFO
          Agent monthly.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: run coordination, standard review, exception
          handling, statutory rule-table check, approval — never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Calculator className="h-3 w-3 text-signal-indigo" />
          Every step carries no confidence score — exceptions are handled
          deliberately, never silently absorbed
        </span>
      </div>
    </div>
  );
}
