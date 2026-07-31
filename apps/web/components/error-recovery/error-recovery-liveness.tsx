"use client";

import React from "react";
import { useState } from "react";
import {
  Flag,
  Unlock,
  MessageSquare,
  Crosshair,
  FileSearch,
  Wrench,
  Database,
  Layers,
  UserCheck,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  CalendarDays,
  FolderOpen,
  Timer,
  Scale,
  XCircle,
  History,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type RecoveryState =
  | "FLAGGED"
  | "PERIOD_REOPENED"
  | "ISSUE_DESCRIBED"
  | "SCOPE_IDENTIFIED"
  | "CLASSIFIED"
  | "SIMPLE_CORRECTION"
  | "MISSING_DATA"
  | "CASCADING_ERROR"
  | "OWNER_APPROVAL_IF_NEEDED"
  | "CORRECTING"
  | "RE_CLOSING"
  | "OWNER_NOTIFIED_COMPLETE";

export interface RecoveryTransition {
  state: string;
  timestamp: string;
  detail: string;
}

export interface ErrorRecoveryLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showSimpleCorrection?: boolean;
  showMissingData?: boolean;
  showCascadingApproval?: boolean;
  showApprovalDeclined?: boolean;
  showCorrectionComplete?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: RecoveryState;
  label: string;
  description: string;
  icon: React.ElementType;
  fork?: boolean;
}> = [
  {
    id: "FLAGGED",
    label: "FLAGGED",
    description:
      "Owner flags via dashboard, email reply, or chat — CFO Agent receives the flag",
    icon: Flag,
  },
  {
    id: "PERIOD_REOPENED",
    label: "PERIOD_REOPENED",
    description: "Unlocking the period — June 2026",
    icon: Unlock,
  },
  {
    id: "ISSUE_DESCRIBED",
    label: "ISSUE_DESCRIBED",
    description: "Asking owner to describe the issue in plain English",
    icon: MessageSquare,
  },
  {
    id: "SCOPE_IDENTIFIED",
    label: "SCOPE_IDENTIFIED",
    description:
      "Identifying which transactions and agents are involved — 3 periods affected",
    icon: Crosshair,
  },
  {
    id: "CLASSIFIED",
    label: "CLASSIFIED",
    description:
      "Determining error type — classification shown explicitly, not hidden",
    icon: FileSearch,
  },
  {
    id: "SIMPLE_CORRECTION",
    label: "SIMPLE_CORRECTION",
    description:
      "Recategorize/repost/reclose — live progress, target under 10 minutes",
    icon: Wrench,
    fork: true,
  },
  {
    id: "MISSING_DATA",
    label: "MISSING_DATA",
    description:
      "Re-pulling from integration or requesting document upload — blocked until data provided",
    icon: Database,
    fork: true,
  },
  {
    id: "CASCADING_ERROR",
    label: "CASCADING_ERROR",
    description:
      "Identifying all affected periods, proposing correction sequence",
    icon: Layers,
    fork: true,
  },
  {
    id: "OWNER_APPROVAL_IF_NEEDED",
    label: "OWNER_APPROVAL_IF_NEEDED",
    description:
      "Requesting explicit owner approval before beginning (cascading only)",
    icon: UserCheck,
  },
  {
    id: "CORRECTING",
    label: "CORRECTING",
    description:
      "Correcting root cause — live progress per affected transaction/period",
    icon: RefreshCw,
  },
  {
    id: "RE_CLOSING",
    label: "RE_CLOSING",
    description: "Re-closing all affected periods in sequence — never batched",
    icon: Lock,
  },
  {
    id: "OWNER_NOTIFIED_COMPLETE",
    label: "OWNER_NOTIFIED_COMPLETE",
    description: "Correction complete for the affected period(s)",
    icon: CheckCircle2,
  },
];

const TIMELINE: Array<{
  label: string;
  time: string;
  detail: string;
  pending?: boolean;
}> = [
  { label: "FLAGGED", time: "09:12:04", detail: "Flag received via dashboard" },
  {
    label: "PERIOD_REOPENED",
    time: "09:12:07",
    detail: "June 2026 unlocked — downstream warnings noted",
  },
  {
    label: "ISSUE_DESCRIBED",
    time: "09:13:12",
    detail: "Owner described the issue in plain English",
  },
  {
    label: "SCOPE_IDENTIFIED",
    time: "09:14:02",
    detail: "3 transactions across April, May, June",
  },
  {
    label: "CLASSIFIED",
    time: "09:14:38",
    detail: "cascading_error (91%) — classification shown explicitly",
  },
  {
    label: "CORRECTED",
    time: "Pending",
    detail: "Ticks during CORRECTING",
    pending: true,
  },
  {
    label: "RE-CLOSED",
    time: "Pending",
    detail: "Ticks during RE_CLOSING",
    pending: true,
  },
];

const AFFECTED_PERIODS = ["April 2026", "May 2026", "June 2026"];

const AUDIT_TRAIL: RecoveryTransition[] = [
  {
    state: "CLOSE_LOCKED",
    timestamp: "18:02:42.000",
    detail: "original close: June 2026 locked, package delivered",
  },
  {
    state: "FLAGGED",
    timestamp: "09:12:04.118",
    detail: "raised via dashboard — 'marketing spend looks wrong'",
  },
  {
    state: "PERIOD_REOPENED",
    timestamp: "09:12:07.410",
    detail: "June 2026 unlocked — downstream warnings noted",
  },
  {
    state: "ISSUE_DESCRIBED",
    timestamp: "09:13:12.903",
    detail: "owner: miscategorized marketing spend in April, May, June",
  },
  {
    state: "SCOPE_IDENTIFIED",
    timestamp: "09:14:02.556",
    detail:
      "3 periods affected, 1 transaction per period (vendor miscategorization)",
  },
  {
    state: "CLASSIFIED",
    timestamp: "09:14:38.221",
    detail: "cascading_error, confidence 0.91 — same vendor pattern",
  },
  {
    state: "OWNER_APPROVAL_REQUESTED",
    timestamp: "09:15:00.002",
    detail: "approval requested — full scope shown: April, May, June",
  },
  {
    state: "APPROVED",
    timestamp: "09:16:11.430",
    detail: "owner approved the correction sequence",
  },
  {
    state: "CORRECTING",
    timestamp: "09:17:05.110",
    detail:
      "correcting root cause: vendor miscategorization through Ledger Agent gates",
  },
  {
    state: "RE_CLOSING",
    timestamp: "09:18:22.870",
    detail:
      "re-closing April, May, June in sequence — per Month-End Close flow",
  },
];

const STEPS = [
  {
    title: "Receive Flag + Description",
    detail:
      "No confidence score — direct input. Owner flags via dashboard, email reply, or chat; CFO Agent receives the flag.",
  },
  {
    title: "Identify Scope",
    detail:
      "Output: specific transaction list + agents involved. Confidence score attached if scope is inferred from a vague description; none if the description names the specific transaction.",
  },
  {
    title: "Classify Error Type",
    detail:
      "Output: simple / missing-data / cascading, with the reasoning shown. Confidence score attached — this is a genuine judgment call, never silently assumed.",
  },
  {
    title: "Propose Correction Sequence (Cascading Only)",
    detail:
      "Output: ordered list of periods/transactions to correct. No confidence score once approved — this is now a plan being executed, not a guess.",
  },
  {
    title: "Request Owner Approval Before Beginning (Cascading Only)",
    detail:
      "Structural gate, per PRD §8 — no confidence score, this is a gate not a judgment. Full scope must be shown and explicitly approved before any correction begins.",
  },
  {
    title: "Execute Correction",
    detail:
      "Routes through Ledger Agent's normal posting gates — no confidence score, no shortcut path.",
  },
  {
    title: "Re-Close Each Affected Period in Sequence",
    detail:
      "Per Month-End Close liveness spec — no confidence score, run again for each period, never batched into a single silent re-close.",
  },
];

const CONSTRAINTS = [
  { label: "Visible Timeline (Flagged → Fixed)", icon: History },
  { label: "Full Scope Shown Before Any Correction", icon: Layers },
  { label: "Explicit Approval Before Beginning (PRD §8)", icon: UserCheck },
  { label: "Never 'Ask Forgiveness'", icon: XCircle },
  { label: "Both Versions Preserved (PRD §8/§14)", icon: Scale },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: RecoveryState): string {
  switch (state) {
    case "FLAGGED":
    case "PERIOD_REOPENED":
    case "ISSUE_DESCRIBED":
    case "SCOPE_IDENTIFIED":
    case "SIMPLE_CORRECTION":
    case "MISSING_DATA":
    case "CORRECTING":
    case "RE_CLOSING":
      return "text-signal-indigo";
    case "CLASSIFIED":
    case "OWNER_APPROVAL_IF_NEEDED":
      return "text-attention-amber";
    case "CASCADING_ERROR":
      return "text-error-clay";
    case "OWNER_NOTIFIED_COMPLETE":
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
  tone: "amber" | "red" | "green" | "indigo";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : tone === "green"
          ? "border-balanced-green/30 bg-balanced-green/5"
          : "border-signal-indigo/30 bg-signal-indigo/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : tone === "green"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo";
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

export function ErrorRecoveryLiveness({
  className,
  showEmptyState,
  showSimpleCorrection,
  showMissingData,
  showCascadingApproval,
  showApprovalDeclined,
  showCorrectionComplete,
}: ErrorRecoveryLivenessProps) {
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
          <p className="text-sm font-medium">No recovery in progress</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Error Recovery makes the PRD&apos;s black-box moment visible — what
            happens between &quot;flagged&quot; and &quot;fixed&quot; must be a
            visible workflow, not a mystery period. Nothing to show right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Simple correction (Spec §2) ──────────────────────────────
  if (showSimpleCorrection) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
              <Wrench className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Simple Correction</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 SIMPLE_CORRECTION — recategorize/repost/reclose with
                live progress
              </p>
            </div>
          </div>
          <span className="rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Under 10-minute target
          </span>
        </div>
        <BranchCard
          icon={Wrench}
          title="Recategorize → repost → reclose with live progress"
          tone="indigo"
        >
          <p>
            Classification: simple_correction — one vendor miscategorization on
            a single invoice (#4471). Target: under 10 minutes, shown as an
            expectation. Live progress per step, never a single spinner.
          </p>
          <p>
            No owner approval required for simple corrections — the correction
            routes through Ledger Agent&apos;s normal posting gates, no shortcut
            path.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Activity className="h-3 w-3 text-signal-indigo" />
            Live progress — target: under 10 minutes, shown as an expectation.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Missing data (Spec §2) — blocked until data provided ─────
  if (showMissingData) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Database className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Missing Data</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 MISSING_DATA — re-pulling or requesting document upload
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={Database}
          title="Blocked until data provided"
          tone="amber"
        >
          <p>
            Classification: missing_data — need the original supplier invoice
            #4471 for June to proceed. Re-pulling from the integration or
            requesting the document upload.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Never guessed, never silently skipped — the specific document is
            requested, blocking for that correction.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Cascading error — approval requested (Spec §2/§6) ────────
  if (showCascadingApproval) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Layers className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Cascading Error — Approval Requested
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§6 — explicit approval required before any correction
                begins
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking until approved
          </span>
        </div>
        <BranchCard
          icon={Layers}
          title="This affects 3 periods — April, May, June. Approve before I proceed?"
          tone="red"
        >
          <p>
            Classification: cascading_error — the miscategorized marketing spend
            appears in April, May, and June. Full affected-period list shown
            before proceeding. Held until approved — never auto-proceeded.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Critical rule: full scope shown and explicitly approved before any
            correction begins — per PRD §8.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Owner declined approval (Spec §7) — held indefinitely ─────
  if (showApprovalDeclined) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <XCircle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Owner Declined Approval</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — held indefinitely, never auto-proceeded
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Held indefinitely
          </span>
        </div>
        <BranchCard
          icon={XCircle}
          title="Owner declined the cascading correction"
          tone="amber"
        >
          <p>
            Spec §7 — held indefinitely, not auto-proceeded, until the owner
            responds. The correction does not begin under any circumstances. The
            recovery timeline remains visible while held — no mystery period.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Owner declines to approve a cascading correction — held indefinitely
            until the owner responds.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Correction complete (Spec §2 terminal) ───────────────────
  if (showCorrectionComplete) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Correction Complete</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 OWNER_NOTIFIED_COMPLETE — terminal
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="Correction complete for April, May, June — owner notified"
          tone="green"
        >
          <p>
            Original and corrected versions preserved side by side — both remain
            viewable per PRD §8/§14 audit trail. Each period was re-closed in
            sequence, never batched into a single silent re-close.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-balanced-green" />
            Correction complete for the affected period(s) — both versions
            preserved permanently.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: RecoveryState = "CLASSIFIED";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-indigo-600">
            <RefreshCw className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Error Recovery / Reopen</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Cross-cutting recovery flow
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Explicitly named in the PRD as a black-box risk: what happens
              between &quot;flagged&quot; and &quot;fixed&quot; must be a
              visible workflow, not a mystery period where the owner has no idea
              what&apos;s being touched — especially for cascading errors
              spanning multiple periods.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Classifying — cascading error detected
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
        <span className="font-semibold text-foreground">CLASSIFIED</span> —
        Determining error type — cascading error detected: affects April, May,
        June
      </div>

      {/* Pipeline */}
      <section
        aria-label="Error Recovery State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Error Recovery State Machine
          </h3>
          <LayerTag label="structural lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
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
                    {stage.fork && (
                      <span className="rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-semibold text-signal-indigo">
                        FORK
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                {isComplete && (
                  <span className="text-[9px] text-muted-foreground/60">✓</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Recovery Timeline (Spec §4) */}
      <section
        aria-label="Recovery Timeline"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Recovery Timeline
          </h3>
          <LayerTag label="timestamps per stage" />
        </div>
        <div className="space-y-1.5">
          {TIMELINE.map((entry) => (
            <div
              key={entry.label}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2",
                entry.pending ? "bg-muted/20 opacity-70" : "bg-accent/10",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  entry.pending ? "bg-muted" : "bg-balanced-green/10",
                )}
              >
                {entry.pending ? (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                )}
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold tabular-nums">
                  {entry.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {entry.detail}
                </p>
              </div>
              <span
                className={cn(
                  "font-mono text-[9px]",
                  entry.pending
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground",
                )}
              >
                {entry.time}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Cascading Scope Checklist (Spec §4) */}
      <section
        aria-label="Cascading Scope Checklist"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Cascading Scope Checklist
          </h3>
          <LayerTag label="full scope shown" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Each affected period ticks off as it is corrected and re-closed in
          sequence — never batched into one silent re-close.
        </p>
        <div className="space-y-1.5">
          {AFFECTED_PERIODS.map((period) => (
            <div
              key={period}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Clock className="h-3 w-3 text-muted-foreground" />
              </span>
              <p className="flex-1 text-[11px] font-semibold">{period}</p>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">
                IN SCOPE
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Error Classification (Spec §3 step 3) */}
      <section
        aria-label="Error Classification"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Error Classification
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Layer 2 — one confidence score
          </span>
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Classification: cascading_error — shown explicitly, not hidden
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Classification is a genuine judgment call (Spec §3 step 3) — the
            reasoning is always shown, never silently assumed.
          </p>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Error classification confidence
            </span>
            <span className="text-[10px] font-semibold text-signal-indigo">
              91%
            </span>
          </div>
          <div
            role="meter"
            aria-label="Error classification confidence"
            aria-valuenow={91}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-signal-indigo"
              style={{ width: "91%" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Basis: same vendor miscategorization pattern across April, May, and
            June — Layer 2 probabilistic.
          </p>
        </div>
      </section>

      {/* Owner Approval Gate (Spec §3 critical rule / §6) */}
      <section
        aria-label="Owner Approval Gate"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Owner Approval Gate
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking until approved
          </span>
        </div>
        <div className="rounded-lg border border-border/50 bg-error-clay/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-error-clay" />
            <p className="text-[11px] font-semibold">
              Cascading corrections require explicit owner approval before any
              correction begins (Spec §3 critical rule / PRD §8)
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Full scope must be shown and explicitly approved before any
            correction begins — this is the one place in the whole platform
            where 'ask forgiveness' behavior is explicitly disallowed
            (&quot;requests owner approval before beginning&quot;). This affects
            April, May, June — approve before I proceed? Held until approved —
            never auto-proceeded.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Recovery Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Reopen Period", value: "June 2026" },
          { label: "Classification", value: "cascading_error" },
          { label: "Affected Periods", value: "3" },
          { label: "Raised Via", value: "dashboard" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Why */}
      <section aria-label="Why" className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Why
        </h3>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5 text-[10px] text-muted-foreground">
          <p>
            Classified as cascading error: the miscategorized marketing spend
            appears in April, May, and June — correcting the root cause (vendor
            miscategorization) and re-closing all three periods in sequence.
          </p>
        </div>
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
                  condition: "Cascading error identified",
                  esc: "Human, always",
                  note: "Full scope shown, explicit approval required",
                  blocking: "Blocking",
                },
                {
                  condition: "Reopen request beyond 12 months",
                  esc: "Human",
                  note: "Honest scope assessment shown before beginning (per PRD §8)",
                  blocking: "Blocking until acknowledged",
                },
                {
                  condition: "Missing data required",
                  esc: "Human",
                  note: "Specific document/data requested",
                  blocking: "Blocking for that correction",
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
                          : "bg-muted text-muted-foreground",
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
            <CalendarDays className="h-3.5 w-3.5 text-signal-indigo" />
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
          The critical rule: for cascading errors, the full scope must be shown
          and explicitly approved before any correction begins — this is the one
          place in the whole platform where 'ask forgiveness' behavior is
          explicitly disallowed by the PRD&apos;s own language (&quot;requests
          owner approval before beginning&quot;).
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
            Audit Trail — Every Recovery Step
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
                {AUDIT_TRAIL.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                      {entry.timestamp}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {entry.state}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                      {entry.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Chain */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {[
            "CFO Agent",
            "Ledger Agent",
            "Worker Agent",
            "Reporting Agent",
            "Owner",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "CFO Agent"
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
          Orchestrated by CFO Agent, executed through Ledger Agent (and
          whichever worker agent owns the root-cause transaction type) —
          corrections route through Ledger Agent&apos;s normal posting gates, no
          shortcut path. Re-runs Month-End Close flow per affected period.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: flag intake, reopen, describe, scope (when
          named), approval gate, correction, re-close sequence — structural
          lifecycle, never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Timer className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: 91% confidence on the error classification —
          the classification is the only genuine judgment call
        </span>
      </div>
    </div>
  );
}
