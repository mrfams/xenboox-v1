"use client";

import React from "react";
import { useState } from "react";
import {
  Inbox,
  Eye,
  CheckCircle2,
  Undo2,
  ClipboardCheck,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  FileSearch,
  AlertTriangle,
  ShieldCheck,
  Scale,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ControllerState =
  | "POSTING_RECEIVED_FOR_REVIEW"
  | "REVIEWING"
  | "CONFIRMED"
  | "KICKED_BACK"
  | "AGGREGATED_INTO_CLOSE_CHECKLIST";

export interface StateTransition {
  state: ControllerState;
  timestamp: string;
  detail: string;
}

export interface ControllerLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showKickbackLoop?: boolean;
  showCloseAtRisk?: boolean;
  showMaterialIssue?: boolean;
  showKickedBack?: boolean;
  showChecklistComplete?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ControllerState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "POSTING_RECEIVED_FOR_REVIEW",
    label: "POSTING_RECEIVED_FOR_REVIEW",
    description:
      "Ledger Agent posts an entry from AP/AR/Asset/Inventory — queued for review",
    icon: Inbox,
  },
  {
    id: "REVIEWING",
    label: "REVIEWING",
    description:
      "Checking against Controller-level rules — categorization, completeness, cross-checks",
    icon: Eye,
  },
  {
    id: "CONFIRMED",
    label: "CONFIRMED",
    description: "Passes review — contributes to clean trial balance status",
    icon: CheckCircle2,
  },
  {
    id: "KICKED_BACK",
    label: "KICKED_BACK",
    description:
      "Fork — fails review; returned to originating agent with specific reason",
    icon: Undo2,
  },
  {
    id: "AGGREGATED_INTO_CLOSE_CHECKLIST",
    label: "AGGREGATED_INTO_CLOSE_CHECKLIST",
    description:
      "Rolling up: all postings reviewed? trial balance balanced? AP/AR reconciled?",
    icon: ClipboardCheck,
  },
];

const CHECKLIST_ITEMS: Array<{
  label: string;
  status: "met" | "in_progress" | "pending";
}> = [
  { label: "Trial balance balanced", status: "met" },
  { label: "AP/AR reconciled", status: "met" },
  { label: "All postings reviewed", status: "in_progress" },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "POSTING_RECEIVED_FOR_REVIEW",
    timestamp: "09:20:00.102",
    detail:
      "received from AP Agent: AP-2026-0412 (Office Supplies GMD 1,240.00, entity Xenboox HQ)",
  },
  {
    state: "REVIEWING",
    timestamp: "09:20:00.514",
    detail:
      "completeness check: all fields present — no confidence score (deterministic)",
  },
  {
    state: "REVIEWING",
    timestamp: "09:20:01.031",
    detail:
      "categorization judgment: 'Marketing' vs vendor history 'IT Equipment' — 82%, basis cited",
  },
  {
    state: "KICKED_BACK",
    timestamp: "09:20:01.502",
    detail:
      "kicked back to AP Agent — reason: vendor Cloudline Ltd historically categorized as IT Equipment",
  },
  {
    state: "POSTING_RECEIVED_FOR_REVIEW",
    timestamp: "09:31:12.220",
    detail:
      "received from Inventory Agent: INV-COGS-2026-0312 (COGS GMD 620.00)",
  },
  {
    state: "REVIEWING",
    timestamp: "09:31:12.800",
    detail:
      "completeness check: passed; categorization: passed (Office Supplies) — confirmed",
  },
  {
    state: "CONFIRMED",
    timestamp: "09:31:13.104",
    detail: "confirmed — posting contributes to clean trial balance status",
  },
  {
    state: "AGGREGATED_INTO_CLOSE_CHECKLIST",
    timestamp: "09:45:00.000",
    detail:
      "close checklist status: trial balance balanced (met), AP/AR reconciled (met), all postings reviewed (in progress)",
  },
];

const STEPS = [
  {
    title: "Receive Posting for Review",
    detail:
      "Input: posted entry from Ledger Agent (originating from AP/AR/Asset/Inventory). Output: queued review item. No confidence score — structural intake.",
  },
  {
    title: "Check Categorization and Completeness",
    detail:
      "Output: pass or specific issue named. Confidence score ONLY if judgment-based (e.g. 'this looks miscategorized based on vendor history' — must cite the basis). Deterministic completeness checks carry no confidence score.",
  },
  {
    title: "Confirm or Kick Back",
    detail:
      "Output: explicit decision + reason if kicked back. No confidence score on the decision itself — only on any judgment input feeding it.",
  },
  {
    title: "Roll Up into Close Checklist",
    detail:
      "Output: aggregate status per close requirement. No confidence score — deterministic aggregation.",
  },
];

const CONSTRAINTS = [
  { label: "Review Feed Distinct", icon: Eye },
  { label: "Kickback Reason Named", icon: Undo2 },
  { label: "Judgment Cites Basis", icon: FileSearch },
  { label: "Never Silently Confirmed", icon: AlertTriangle },
  { label: "Close Checklist Live", icon: ClipboardCheck },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: ControllerState): React.ElementType {
  switch (state) {
    case "POSTING_RECEIVED_FOR_REVIEW":
      return Inbox;
    case "REVIEWING":
      return Eye;
    case "CONFIRMED":
      return CheckCircle2;
    case "KICKED_BACK":
      return Undo2;
    case "AGGREGATED_INTO_CLOSE_CHECKLIST":
      return ClipboardCheck;
  }
}

function getStateColor(state: ControllerState): string {
  switch (state) {
    case "POSTING_RECEIVED_FOR_REVIEW":
      return "text-muted-foreground/70";
    case "REVIEWING":
      return "text-attention-amber";
    case "CONFIRMED":
      return "text-balanced-green";
    case "KICKED_BACK":
      return "text-error-clay";
    case "AGGREGATED_INTO_CLOSE_CHECKLIST":
      return "text-signal-indigo";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ layer, label }: { layer: "1" | "2"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
        layer === "1"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo",
      )}
    >
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

export function ControllerLiveness({
  className,
  showEmptyState,
  showKickbackLoop,
  showCloseAtRisk,
  showMaterialIssue,
  showKickedBack,
  showChecklistComplete,
}: ControllerLivenessProps) {
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
          <p className="text-sm font-medium">No postings awaiting review</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Postings from AP, AR, Asset, and Inventory agents flow through the
            Controller Agent for management-tier review. Nothing in the queue
            right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Kickback loop (Spec §6) — blocking ───────────────────────
  if (showKickbackLoop) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Undo2 className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Kickback Loop</h2>
              <p className="text-[10px] text-muted-foreground">
                Same posting kicked back twice — Spec §6
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={Undo2}
          title="AP-2026-0412 has been kicked back twice"
          tone="red"
        >
          <p>
            The same posting was kicked back to AP Agent twice without
            resolution. Escalated to CFO Agent and human — with the full review
            history shown, never a bare reference.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking for that posting — it cannot proceed until the kickback
            loop is resolved. Escalated with full history shown.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Close at risk (Spec §6) — non-blocking but flagged ───────
  if (showCloseAtRisk) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <ClipboardCheck className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Close at Risk</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — checklist item can&apos;t be satisfied by target date
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Non-blocking but flagged
          </span>
        </div>
        <BranchCard
          icon={ClipboardCheck}
          title="Trial balance not yet balanced — close at risk"
          tone="amber"
        >
          <p>
            A close checklist item can&apos;t be satisfied by the target date.
            Flagged to CFO Agent — non-blocking but visible, never silent.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to CFO Agent. Non-blocking but flagged — close stays at
            risk until the trial balance balances.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Material issue (Spec §7) — never silently confirmed ──────
  if (showMaterialIssue) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Material Issue Escalated
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — never silently confirmed to keep close on schedule
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Escalated
          </span>
        </div>
        <BranchCard
          icon={AlertTriangle}
          title="Posting flagged as a material issue during review"
          tone="red"
        >
          <p>
            A posting was reviewed and flagged as a material issue. It is never
            silently confirmed to keep the close on schedule — it must escalate
            to CFO Agent and human.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Must escalate — confirmation is blocked until the material issue is
            resolved.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: KICKED_BACK terminal view ────────────────────────────────
  if (showKickedBack) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Undo2 className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Kicked Back</h2>
              <p className="text-[10px] text-muted-foreground">
                Returned to originating agent with specific reason
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            KICKED_BACK
          </span>
        </div>
        <BranchCard
          icon={Undo2}
          title="Kicked back to AP Agent: AP-2026-0412"
          tone="red"
        >
          <p>
            Kicked back to AP Agent: invoice #4471 categorized as
            &quot;Marketing&quot; but vendor Cloudline Ltd historically
            categorized as &quot;IT Equipment&quot; — please confirm or
            recategorize.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Undo2 className="h-3 w-3 text-error-clay" />
            Routed visibly back to AP Agent&apos;s queue — the specific reason
            is always named.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Close checklist complete (terminal) ──────────────────────
  if (showChecklistComplete) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Close Checklist Complete
              </h2>
              <p className="text-[10px] text-muted-foreground">
                All close requirements satisfied
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="All close checklist items satisfied for Q2 2026"
          tone="green"
        >
          <p>
            Trial balance balanced — AP/AR reconciled — all postings reviewed.
            The close checklist rolled up live as conditions were met, not
            revealed only at month-end.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ClipboardCheck className="h-3 w-3 text-balanced-green" />
            Ready for Month-End Close consumption by the close flow.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: ControllerState = "REVIEWING";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700">
            <Scale className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Controller Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Management-tier reviewer
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              A reviewer, not a doer — its liveness shows what it&apos;s
              reviewing right now among postings from five worker agents, and
              what it approved vs. kicked back, so it never reads as a passive
              rubber stamp.
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
        data-live-status
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-attention-amber animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">REVIEWING</span> —
        reviewing posting from AP Agent: AP-2026-0412
      </div>

      {/* Pipeline */}
      <section
        aria-label="Controller State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Controller State Machine
          </h3>
          <LayerTag layer="1" label="deterministic lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isFork = stage.id === "KICKED_BACK";
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "AGGREGATED_INTO_CLOSE_CHECKLIST";
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
                    {isComplete && !isTerminal && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
                      </span>
                    )}
                    {isFork && (
                      <span className="rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-semibold text-error-clay">
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

      {/* Live Review Feed */}
      <section
        aria-label="Review Feed"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Review Feed
          </h3>
          <LayerTag layer="1" label="active second layer" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Live &quot;currently reviewing&quot; feed — distinct from Ledger
          Agent&apos;s posting feed. Shows Controller Agent is an active second
          layer, not the same event repeated.
        </p>
        <div className="space-y-1.5">
          {/* Currently reviewing */}
          <div className="flex items-center gap-2 rounded-lg border border-attention-amber/30 bg-attention-amber/5 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-attention-amber animate-pulse" />
            <span className="text-[11px] font-medium">
              Reviewing posting from AP Agent: AP-2026-0412
            </span>
            <span className="ml-auto rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
              REVIEWING
            </span>
          </div>
          {/* Confirmed */}
          <div className="flex items-center gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
            <span className="text-[11px] font-medium">
              Confirmed: INV-COGS-2026-0312 (Inventory Agent) — COGS GMD 620.00
            </span>
            <span className="ml-auto rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
              CONFIRMED
            </span>
          </div>
          {/* Kicked back */}
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 px-3 py-2">
            <Undo2 className="mt-0.5 h-3.5 w-3.5 text-error-clay" />
            <div>
              <p className="text-[11px] font-medium">
                Kicked back to AP Agent: AP-2026-0411
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Invoice #4471 categorized as &apos;Marketing&apos; but vendor
                &apos;Cloudline Ltd&apos; historically categorized as &apos;IT
                Equipment&apos; — please confirm or recategorize. Routed back to
                AP Agent&apos;s queue.
              </p>
            </div>
            <span className="ml-auto rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-semibold text-error-clay">
              KICKED_BACK
            </span>
          </div>
          <p className="pt-1 text-[10px] text-muted-foreground">
            Confirmed postings contribute to clean trial balance status.
          </p>
        </div>
      </section>

      {/* Categorization Check */}
      <section
        aria-label="Categorization Check"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Categorization Check
          </h3>
          <LayerTag layer="2" label="judgment-based, basis cited" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Miscategorization suspected — invoice #4471
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Categorized as &quot;Marketing&quot; but vendor Cloudline Ltd
            historically categorized as &quot;IT Equipment&quot; based on vendor
            history. Basis cited — 82% judgment-based, basis cited.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div
              role="meter"
              aria-label="Categorization check confidence"
              aria-valuenow={82}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex h-5 w-24 items-center rounded-full bg-muted px-1"
            >
              <div
                className="h-3 rounded-full bg-signal-indigo"
                style={{ width: "82%" }}
              />
            </div>
            <span className="text-[9px] font-semibold text-signal-indigo">
              82% — judgment-based, basis cited
            </span>
            <span className="text-[9px] text-muted-foreground">
              — statistical judgment, not certainty
            </span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Deterministic completeness checks — no confidence score. Only
            judgment-based categorization carries confidence, and it must always
            cite its basis.
          </p>
        </div>
      </section>

      {/* Close Checklist */}
      <section
        aria-label="Close Checklist"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Close Checklist
          </h3>
          <LayerTag layer="1" label="ticks live" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Ticks live as conditions are met — not revealed only at month-end.
        </p>
        <div className="space-y-1.5">
          {CHECKLIST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[11px] font-medium">
                {item.status === "met" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
                ) : item.status === "in_progress" ? (
                  <Activity className="h-3.5 w-3.5 text-attention-amber animate-pulse" />
                ) : (
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {item.label}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                  item.status === "met"
                    ? "bg-balanced-green/10 text-balanced-green"
                    : item.status === "in_progress"
                      ? "bg-attention-amber/10 text-attention-amber"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {item.status === "met"
                  ? "MET"
                  : item.status === "in_progress"
                    ? "IN PROGRESS"
                    : "PENDING"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Controller Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Status", value: "REVIEWING" },
          { label: "Period", value: "Q2 2026" },
          { label: "Postings Reviewed", value: "14" },
          { label: "Kicked Back", value: "1" },
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
                  condition: "Kickback loop (same posting kicked back twice)",
                  esc: "CFO Agent, human",
                  note: "Escalation with full history shown",
                  blocking: "Blocking for that posting",
                },
                {
                  condition:
                    "Close checklist item can't be satisfied by target date",
                  esc: "CFO Agent",
                  note: "'Trial balance not yet balanced — close at risk'",
                  blocking: "Non-blocking but flagged",
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
          The critical rule: a posting reviewed but flagged as a material issue
          is never silently confirmed to keep the close on schedule — it must
          escalate. Judgment-based categorization must always cite its basis,
          never a bare assertion.
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
            Audit Trail — Every Review Decision
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
                            entry.state === "KICKED_BACK"
                              ? "bg-error-clay/10 text-error-clay"
                              : entry.state === "CONFIRMED"
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
            "AP Agent",
            "AR Agent",
            "Asset Agent",
            "Inventory Agent",
            "Ledger Agent",
            "Controller Agent",
            "CFO Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Controller Agent"
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
          Reviews output from Ledger Agent — all worker-agent postings flow
          through here. Reports to CFO Agent. Feeds the close checklist consumed
          by Month-End Close.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: intake, completeness checks, confirm/kickback
          decision, close checklist roll-up
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Activity className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: judgment-based categorization confidence
          (basis always cited)
        </span>
      </div>
    </div>
  );
}
