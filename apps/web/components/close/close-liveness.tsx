"use client";

import React from "react";
import { useState } from "react";
import {
  PlayCircle,
  ClipboardCheck,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileText,
  Bell,
  UserCheck,
  AlertTriangle,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  Gauge,
  CalendarDays,
  FolderOpen,
  RefreshCw,
  Timer,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type CloseState =
  | "CLOSE_TRIGGERED"
  | "CONTROLLER_CONFIRMING"
  | "TREASURY_CONFIRMING"
  | "COMPLIANCE_CONFIRMING"
  | "ALL_CONFIRMED"
  | "CLOSING"
  | "PACKAGE_GENERATED"
  | "OWNER_NOTIFIED"
  | "PASSIVE_APPROVAL"
  | "FLAGGED_FOR_REOPEN";

export interface StateTransition {
  state: string;
  timestamp: string;
  detail: string;
}

export interface CloseLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showControllerBlocked?: boolean;
  showTreasuryBlocked?: boolean;
  showConfidenceHeld?: boolean;
  showPackageGenerated?: boolean;
  showOwnerNotified?: boolean;
  showPassiveApproval?: boolean;
  showFlaggedForReopen?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: CloseState;
  label: string;
  description: string;
  icon: React.ElementType;
  fork?: boolean;
}> = [
  {
    id: "CLOSE_TRIGGERED",
    label: "CLOSE_TRIGGERED",
    description: "Month-end reached — CFO Agent initiates the close sequence",
    icon: PlayCircle,
  },
  {
    id: "CONTROLLER_CONFIRMING",
    label: "CONTROLLER_CONFIRMING",
    description:
      "Confirming all postings reviewed, trial balance balanced, AP/AR reconciled",
    icon: ClipboardCheck,
  },
  {
    id: "TREASURY_CONFIRMING",
    label: "TREASURY_CONFIRMING",
    description:
      "Confirming bank, cash, and mobile money reconciliation complete",
    icon: Landmark,
  },
  {
    id: "COMPLIANCE_CONFIRMING",
    label: "COMPLIANCE_CONFIRMING",
    description:
      "Confirming VAT/tax obligations calculated, no missed deadlines",
    icon: ShieldCheck,
  },
  {
    id: "ALL_CONFIRMED",
    label: "ALL_CONFIRMED",
    description: "CFO Agent checks confidence thresholds across the board",
    icon: CheckCircle2,
  },
  {
    id: "CLOSING",
    label: "CLOSING",
    description: "Locking the period",
    icon: Lock,
  },
  {
    id: "PACKAGE_GENERATED",
    label: "PACKAGE_GENERATED",
    description:
      "Reporting Agent produces P&L, balance sheet, cash flow, plain-English summary",
    icon: FileText,
  },
  {
    id: "OWNER_NOTIFIED",
    label: "OWNER_NOTIFIED",
    description:
      "Delivering notification (dashboard/email) — the legal acknowledgment moment per PRD §14",
    icon: Bell,
  },
  {
    id: "PASSIVE_APPROVAL",
    label: "PASSIVE_APPROVAL",
    description:
      "Owner does nothing — silence = approval, with explicit UI acknowledgment",
    icon: UserCheck,
    fork: true,
  },
  {
    id: "FLAGGED_FOR_REOPEN",
    label: "FLAGGED_FOR_REOPEN",
    description:
      "Owner flags the close — routes to the Error Recovery / Reopen flow",
    icon: AlertTriangle,
    fork: true,
  },
];

const CHECKLIST: Array<{
  department: string;
  basis: string;
  icon: React.ElementType;
}> = [
  {
    department: "Controller Agent",
    basis:
      "Trial balance balanced ($0 variance) — all postings reviewed, AP/AR reconciled",
    icon: ClipboardCheck,
  },
  {
    department: "Treasury Agent",
    basis: "All reconciliations clean — bank, cash, mobile money",
    icon: Landmark,
  },
  {
    department: "Compliance Agent",
    basis: "Tax obligations current — VAT calculated, no missed deadlines",
    icon: ShieldCheck,
  },
];

const PACKAGE_SECTIONS = [
  "Profit & Loss (P&L)",
  "Balance Sheet",
  "Cash Flow",
  "Plain-English Narrative Summary",
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "CLOSE_TRIGGERED",
    timestamp: "18:00:00.000",
    detail: "close triggered for June 2026 by CFO Agent (scheduled)",
  },
  {
    state: "CONTROLLER_CONFIRMING",
    timestamp: "18:00:12.403",
    detail:
      "controller confirmed: trial balance balanced ($0 variance), AP/AR reconciled",
  },
  {
    state: "TREASURY_CONFIRMING",
    timestamp: "18:01:05.117",
    detail: "treasury confirmed: bank/cash/mobile money reconciliations clean",
  },
  {
    state: "COMPLIANCE_CONFIRMING",
    timestamp: "18:01:44.902",
    detail: "compliance confirmed: VAT calculated, no missed deadlines",
  },
  {
    state: "ALL_CONFIRMED",
    timestamp: "18:01:45.310",
    detail:
      "close gate: all 3 departments confirmed, overall confidence 94% ≥ 90% threshold",
  },
  {
    state: "CLOSING",
    timestamp: "18:02:03.556",
    detail: "period locked — June 2026",
  },
  {
    state: "PACKAGE_GENERATED",
    timestamp: "18:02:41.229",
    detail: "package: P&L, balance sheet, cash flow, plain-English narrative",
  },
  {
    state: "OWNER_NOTIFIED",
    timestamp: "18:02:42.000",
    detail:
      "owner notified (dashboard + email) — legal acknowledgment record, delivery logged",
  },
];

const STEPS = [
  {
    title: "Trigger Close",
    detail:
      "No confidence score — calendar/rule-based. Month-end reached, CFO Agent initiates the sequence.",
  },
  {
    title: "Each Department Head Confirms Independently",
    detail:
      "Output: confirmed or blocked with specific reason. No confidence score on the confirmation itself — deterministic checklist. Confidence only where a department head's own internal judgment feeds in (already covered in those specs). The close never silently proceeds past an unconfirmed item.",
  },
  {
    title: "Check Confidence Thresholds Platform-Wide",
    detail:
      "Output: proceed or hold — per the confidence_thresholds table already locked in architecture.",
  },
  {
    title: "Lock Period",
    detail: "No confidence score — structural. The period closes atomically.",
  },
  {
    title: "Generate Package",
    detail:
      "Per Reporting Agent liveness spec — P&L, balance sheet, cash flow, narrative.",
  },
  {
    title: "Notify Owner",
    detail:
      "Creates the legal acknowledgment moment per PRD §14 — must be an explicit, undismissable notification event, logged.",
  },
];

const CONSTRAINTS = [
  { label: "Never Silently Proceeds Past Unconfirmed", icon: Lock },
  { label: "Blocked Cause Shown Explicitly", icon: AlertTriangle },
  { label: "Checklist Ticks Live", icon: Activity },
  { label: "Confidence Gate (confidence_thresholds)", icon: Gauge },
  { label: "Notification = Legal Acknowledgment (PRD §14)", icon: Scale },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: CloseState): string {
  switch (state) {
    case "CLOSE_TRIGGERED":
      return "text-muted-foreground/70";
    case "CONTROLLER_CONFIRMING":
    case "TREASURY_CONFIRMING":
    case "COMPLIANCE_CONFIRMING":
    case "CLOSING":
    case "PACKAGE_GENERATED":
    case "OWNER_NOTIFIED":
      return "text-signal-indigo";
    case "ALL_CONFIRMED":
    case "PASSIVE_APPROVAL":
      return "text-balanced-green";
    case "FLAGGED_FOR_REOPEN":
      return "text-error-clay";
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

export function CloseLiveness({
  className,
  showEmptyState,
  showControllerBlocked,
  showTreasuryBlocked,
  showConfidenceHeld,
  showPackageGenerated,
  showOwnerNotified,
  showPassiveApproval,
  showFlaggedForReopen,
}: CloseLivenessProps) {
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
          <p className="text-sm font-medium">No close in progress</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Month-end close is the passive-approval moment — the process stays
            visible so the &quot;nothing to review&quot; state is earned, not
            assumed. Nothing to show right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Controller blocked (Spec §2/§6) — close halts ───────────
  if (showControllerBlocked) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <ClipboardCheck className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Controller Agent Cannot Confirm
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§6 — close halts at this stage, the item stays open and
                is shown explicitly
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={ClipboardCheck}
          title="Close halts at CONTROLLER_CONFIRMING — item stays open"
          tone="red"
        >
          <p>
            Trial balance not balanced: GMD 1,240.00 variance (debits GMD
            45,120.00 vs credits GMD 43,880.00). The close does not advance to
            Treasury Agent&apos;s stage until the item is resolved. This
            blocking state is shown explicitly — never hidden behind a spinner
            labeled &apos;closing&apos;.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking — close does not advance until the item is resolved. Never
            hidden behind a spinner labeled &apos;closing&apos;.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Treasury blocked (Spec §2/§4) — specific open line ───────
  if (showTreasuryBlocked) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Landmark className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Treasury Agent Cannot Confirm
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§4 — blocked with the specific unresolved cause, never
                hidden
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={Landmark}
          title="Close halts at TREASURY_CONFIRMING — the specific open line is shown"
          tone="red"
        >
          <p>
            Bank line #BT-88213 (GMD 450.00, June 18) remains unreconciled. The
            close does not advance to Compliance Agent&apos;s stage until it is
            resolved. Links to the actual open item — never hidden behind a
            spinner.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking — the specific unreconciled bank line is shown explicitly,
            never hidden.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Confidence held (Spec §7 / Layer 3) ──────────────────────
  if (showConfidenceHeld) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Gauge className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Below Confidence Threshold
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — confidence threshold not met on a material item
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Held — human notified
          </span>
        </div>
        <BranchCard
          icon={Gauge}
          title="Material item confidence 68% is below the 90% threshold"
          tone="amber"
        >
          <p>
            A material item&apos;s confidence (68%) is below the 90% threshold
            from confidence_thresholds — the close does not proceed silently.
            Held, human notified, per architecture&apos;s Layer 3 rule. Never a
            guessed close.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Held — human notified, per the architecture&apos;s Layer 3 rule.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Package generated (Spec §2) ──────────────────────────────
  if (showPackageGenerated) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
              <FileText className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Close Package Generated</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 PACKAGE_GENERATED — assembled per Reporting Agent
                liveness spec
              </p>
            </div>
          </div>
          <span className="rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Awaiting owner notification
          </span>
        </div>
        <BranchCard
          icon={FileText}
          title="June 2026 close package assembled"
          tone="indigo"
        >
          <p>
            Profit &amp; Loss, Balance Sheet, Cash Flow, and plain-English
            narrative assembled per Reporting Agent liveness spec. Ready for the
            owner notification — the legal acknowledgment moment.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PACKAGE_SECTIONS.map((section) => (
              <div
                key={section}
                className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[10px]"
              >
                <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                {section}
              </div>
            ))}
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Owner notified (Spec §2/§4) — legal acknowledgment ───────
  if (showOwnerNotified) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
              <Bell className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Owner Notified</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§4 — distinct, deliberate notification event
              </p>
            </div>
          </div>
          <span className="rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Legal acknowledgment
          </span>
        </div>
        <BranchCard
          icon={Bell}
          title="Distinct, deliberate notification event at 18:02:42"
          tone="indigo"
        >
          <p>
            Owner notified (dashboard + email) at 18:02:42 — a distinct,
            deliberate notification event, not folded into a generic badge.
            Legal acknowledgment record per PRD §14 — delivery logged. Silence =
            approval; flagging the close routes to Error Recovery.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Scale className="h-3 w-3 text-signal-indigo" />
            Legal acknowledgment record — delivery logged with timestamp.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Passive approval (Spec §2 terminal) ──────────────────────
  if (showPassiveApproval) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <UserCheck className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Passive Approval</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — silence = approval, explicitly acknowledged
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={UserCheck}
          title="Silence is consent — June 2026 books are locked"
          tone="green"
        >
          <p>
            The owner did nothing within the approval window — silence =
            approval. Explicit UI acknowledgment of the passive-approval pattern
            — not ambiguous. Unless you flag the close, nothing more is needed.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-balanced-green" />
            Silence = approval — explicit UI acknowledgment, not ambiguous.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Flagged for reopen (Spec §2/§6) ──────────────────────────
  if (showFlaggedForReopen) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <RefreshCw className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Flagged for Reopen</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§6 — owner flags the close, routes to Error Recovery
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Routes to Error Recovery
          </span>
        </div>
        <BranchCard
          icon={RefreshCw}
          title="Owner flagged the close — routed to the Error Recovery / Reopen flow"
          tone="red"
        >
          <p>
            The owner flagged the close after notification. Classification:
            simple_correction / missing_data / cascading_error. The period
            reopens through the governed reopen flow with downstream-effect
            warnings.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Routes to Error Recovery / Reopen flow — separate cross-cutting
            spec.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: CloseState = "ALL_CONFIRMED";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-indigo-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Month-End Close</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Cross-cutting close flow
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Close is described in the PRD as largely passive from the
              human&apos;s side (&quot;owner reviews — if satisfied, does
              nothing&quot;) — which is exactly why the process itself needs to
              be visible while it happens. Passive approval only works as a
              trust model if the human watched enough of the mechanics to
              believe the &quot;nothing to review&quot; state is earned, not
              assumed.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <Activity className="h-3 w-3 animate-pulse" />
            All confirmed — closing
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
        <Activity className="h-3 w-3 text-balanced-green animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">ALL_CONFIRMED</span> —
        All departments confirmed — closing
      </div>

      {/* Pipeline */}
      <section
        aria-label="Month-End Close State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Month-End Close State Machine
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

      {/* Live Close Checklist */}
      <section
        aria-label="Live Close Checklist"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Live Close Checklist
          </h3>
          <LayerTag label="ticks live" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Ticking department by department in real time — not revealed only once
          fully complete. Visible while it happens.
        </p>
        <div className="space-y-1.5">
          {CHECKLIST.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.department}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-balanced-green/10">
                  <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0 text-signal-indigo" />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold">{item.department}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.basis}
                  </p>
                </div>
                <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                  CONFIRMED
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Close Readiness Gate */}
      <section
        aria-label="Close Readiness Gate"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Close Readiness Gate
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Layer 2 — one confidence score
          </span>
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Platform-wide confidence check per the confidence_thresholds table
              (Spec §3 step 3 / §7)
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            All 3 departments confirmed — overall close confidence 94%, meets
            the 90% threshold.
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Close blocked by: none.
          </p>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Overall close confidence
            </span>
            <span className="text-[10px] font-semibold text-signal-indigo">
              94%
            </span>
          </div>
          <div
            role="meter"
            aria-label="Overall close confidence"
            aria-valuenow={94}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-signal-indigo"
              style={{ width: "94%" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Aggregate of department-head judgment inputs (Controller 96% ·
            Treasury 92% · Compliance 94%) — Layer 2 probabilistic.
          </p>
        </div>
      </section>

      {/* Close Package */}
      <section
        aria-label="Close Package"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Close Package
          </h3>
          <LayerTag label="Reporting Agent" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground">
            Assembles per the Reporting Agent liveness spec — section by
            section, never appearing whole.
          </p>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {PACKAGE_SECTIONS.map((section) => (
            <div
              key={section}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5 text-[10px]"
            >
              <FileText className="h-3 w-3 shrink-0 text-signal-indigo" />
              {section}
            </div>
          ))}
        </div>
      </section>

      {/* Owner Notification */}
      <section
        aria-label="Owner Notification"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Owner Notification — Distinct Legal Acknowledgment
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            PRD §14
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-indigo" />
          <p className="text-[10px] text-muted-foreground">
            Once the package is generated, the owner receives a distinct,
            deliberate notification event — not folded into a generic
            notification badge. This is the legal acknowledgment moment per PRD
            §14: delivery is logged with its timestamp, and the owner&apos;s
            response (silence or flag) is recorded.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Close Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Close Period", value: "June 2026" },
          { label: "Departments Confirmed", value: "3" },
          { label: "Confidence Gate", value: "94%" },
          { label: "Threshold", value: "90%" },
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
            Close for June 2026: Controller Agent confirmed trial balance
            balanced ($0 variance). Treasury Agent confirmed all reconciliations
            clean. Compliance Agent confirmed VAT calculated, no deadlines
            missed. Closing now.
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
                  condition: "Any department head cannot confirm",
                  esc: "CFO Agent, human if unresolved past reasonable time",
                  note: "Close held at that stage, cause shown",
                  blocking: "Blocking",
                },
                {
                  condition: "Owner flags the close after notification",
                  esc: "CFO Agent",
                  note: "Routes to Error Recovery / Reopen flow",
                  blocking: "N/A (separate flow)",
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
          The critical rule: the close must never silently proceed past a
          department head&apos;s unconfirmed item — if Controller Agent
          hasn&apos;t confirmed the trial balance is balanced, close does not
          advance to Treasury Agent&apos;s stage, and this blocking state must
          be visibly shown, not hidden behind a spinner labeled
          &apos;closing&apos;.
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
            Audit Trail — Every Confirmation &amp; Notification
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
            "Controller Agent",
            "Treasury Agent",
            "Compliance Agent",
            "Ledger Agent",
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
              {i < 6 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Orchestrated by CFO Agent, gated by Controller/Treasury/Compliance
          Agent confirmations, delivered by Reporting Agent. Ledger Agent locks
          the period.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: trigger, checklist confirmations, period
          lock, package, notification — never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Timer className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: 94% confidence on the close gate (aggregate
          of department-head judgment inputs, checked against the
          confidence_thresholds table)
        </span>
      </div>
    </div>
  );
}
