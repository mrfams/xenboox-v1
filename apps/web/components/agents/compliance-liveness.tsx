"use client";

import React from "react";
import { useState } from "react";
import {
  ShieldCheck,
  CalendarDays,
  AlarmClock,
  FileSearch,
  ClipboardCheck,
  Bell,
  UserCheck,
  CheckCircle2,
  Activity,
  ChevronDown,
  ListChecks,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Lock,
  BookMarked,
  GitCommitHorizontal,
  Calculator,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ComplianceState =
  | "MONITORING"
  | "DEADLINE_APPROACHING"
  | "TAX_AGENT_REVIEW"
  | "REGULATORY_STATUS_REPORTED";

export type RuleUpdateState =
  | "RULE_UPDATE_DETECTED"
  | "HUMAN_REVIEW_REQUESTED"
  | "RULE_SET_UPDATED";

export interface StateTransition {
  state: ComplianceState | RuleUpdateState;
  timestamp: string;
  detail: string;
}

export interface ComplianceLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showRuleApplied?: boolean;
  showDeadlineCritical?: boolean;
  showRiskIdentified?: boolean;
  showKickedBack?: boolean;
  showLowConfidenceRule?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ComplianceState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "MONITORING",
    label: "MONITORING",
    description:
      "Tracking all filing deadlines across all jurisdictions in use — continuous",
    icon: CalendarDays,
  },
  {
    id: "DEADLINE_APPROACHING",
    label: "DEADLINE_APPROACHING",
    description:
      "Escalating visibility as thresholds are reached — the 30 / 14 / 7-day countdown changes color",
    icon: AlarmClock,
  },
  {
    id: "TAX_AGENT_REVIEW",
    label: "TAX_AGENT_REVIEW",
    description:
      "Reviewing Tax Agent's calculation before the submission package — every line traceable to a rule citation",
    icon: FileSearch,
  },
  {
    id: "REGULATORY_STATUS_REPORTED",
    label: "REGULATORY_STATUS_REPORTED",
    description:
      "Reporting compliance status to CFO Agent once the review completes",
    icon: ClipboardCheck,
  },
];

const CALENDAR_ROWS: Array<{
  label: string;
  due: string;
  chip: string;
  tone: "critical" | "mid" | "ok" | "filed";
}> = [
  {
    label: "Gambia VAT Q2 2026 return",
    due: "Due Jul 24, 2026",
    chip: "7 days remaining — critical window",
    tone: "critical",
  },
  {
    label: "SSHFC monthly contributions (June)",
    due: "Due Jul 31, 2026",
    chip: "14 days remaining",
    tone: "mid",
  },
  {
    label: "Gambia Corporate Income Tax",
    due: "Due Aug 16, 2026",
    chip: "30 days remaining",
    tone: "ok",
  },
  {
    label: "SSHFC May contributions",
    due: "Filed Jul 5, 2026",
    chip: "Filed",
    tone: "filed",
  },
];

const RETURN_LINES = [
  {
    name: "Output VAT on taxable sales",
    detail:
      "GMD 5,600.00 — VAT 15%, GRA Gambia standard rate, rule v2.1, effective Jan 1, 2026",
  },
  {
    name: "Input VAT credit on purchases",
    detail: "GMD 1,875.00 — VAT 15% input credit, rule v2.1",
  },
  {
    name: "Withholding tax on contractor payment",
    detail: "GMD 240.00 — WHT 5% on GMD 4,800.00, rule v2.1",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "MONITORING",
    timestamp: "08:00:00.000",
    detail:
      "deadline sweep — 6 filings tracked across Gambia (2 jurisdictions)",
  },
  {
    state: "MONITORING",
    timestamp: "08:00:00.031",
    detail: "countdown updated: VAT Q2 7 days, SSHFC 14 days, CIT 30 days",
  },
  {
    state: "TAX_AGENT_REVIEW",
    timestamp: "09:12:41.504",
    detail: "reviewed VAT Q2 draft — all 3 lines cite rule v2.1, result: pass",
  },
  {
    state: "DEADLINE_APPROACHING",
    timestamp: "09:30:00.000",
    detail: "VAT Q2 entered critical window (7 days) — visibility escalated",
  },
  {
    state: "REGULATORY_STATUS_REPORTED",
    timestamp: "11:04:02.117",
    detail: "status clean reported to CFO Agent",
  },
  {
    state: "RULE_UPDATE_DETECTED",
    timestamp: "14:02:33.880",
    detail:
      "Gambia GRA standard VAT 15% → 16% effective Aug 1, 2026 — source: GRA public notice #2026-041",
  },
  {
    state: "HUMAN_REVIEW_REQUESTED",
    timestamp: "14:02:34.001",
    detail: "human confirmation requested — blocking until confirmed",
  },
  {
    state: "RULE_SET_UPDATED",
    timestamp: "14:05:00.000",
    detail:
      "applied: rule v2.2 effective Aug 1, 2026 — confirmed_by Human (CFO), confirmed_at 14:04:12",
  },
];

const STEPS = [
  {
    title: "Monitor Deadlines",
    detail:
      "Calendar-based tracking across all jurisdictions in use. No confidence score.",
  },
  {
    title: "Escalate as Deadline Approaches",
    detail:
      "Threshold-based — color changes at 30 / 14 / 7 days out. No confidence score.",
  },
  {
    title: "Review Tax Agent Output",
    detail:
      "Output: pass or kicked back with a specific reason. No confidence score — structured review against known rules.",
  },
  {
    title: "Report Regulatory Status",
    detail: "Compliance status reported to CFO Agent. No confidence score.",
  },
  {
    title: "Detect Rule Change",
    detail:
      "Confidence score if inferred from an ambiguous source, none if from an authoritative direct source.",
  },
  {
    title: "Request Human Review Before Applying",
    detail:
      "Never auto-applies a detected rule change without human confirmation, per PRD §6.4.",
  },
];

const CONSTRAINTS = [
  { label: "Never Auto-Applied", icon: Lock },
  { label: "Source Cited", icon: BookMarked },
  { label: "Human Confirmation Required", icon: UserCheck },
  { label: "Graduated Deadline Escalation", icon: CalendarDays },
  { label: "Rule Version Cited", icon: GitCommitHorizontal },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(
  state: ComplianceState | RuleUpdateState,
): React.ElementType {
  switch (state) {
    case "MONITORING":
      return CalendarDays;
    case "DEADLINE_APPROACHING":
      return AlarmClock;
    case "TAX_AGENT_REVIEW":
      return FileSearch;
    case "REGULATORY_STATUS_REPORTED":
      return ClipboardCheck;
    case "RULE_UPDATE_DETECTED":
      return Bell;
    case "HUMAN_REVIEW_REQUESTED":
      return UserCheck;
    case "RULE_SET_UPDATED":
      return CheckCircle2;
  }
}

function getStateColor(state: ComplianceState): string {
  switch (state) {
    case "MONITORING":
      return "text-balanced-green";
    case "DEADLINE_APPROACHING":
      return "text-attention-amber";
    case "TAX_AGENT_REVIEW":
      return "text-signal-indigo";
    case "REGULATORY_STATUS_REPORTED":
      return "text-balanced-green";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ label }: { label: string }) {
  const isLayerTwo = label.startsWith("Layer 2");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
        isLayerTwo
          ? "bg-signal-indigo/10 text-signal-indigo"
          : "bg-balanced-green/10 text-balanced-green",
      )}
    >
      {label}
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

export function ComplianceLiveness({
  className,
  showEmptyState,
  showRuleApplied,
  showDeadlineCritical,
  showRiskIdentified,
  showKickedBack,
  showLowConfidenceRule,
}: ComplianceLivenessProps) {
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
          <p className="text-sm font-medium">
            No filing deadlines being tracked
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Compliance Agent monitors filing deadlines and rule currency
            continuously. Nothing being monitored right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Rule set updated (terminal, Spec §2/§6) — applied after ──
  if (showRuleApplied) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Rule Set Updated</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — RULE_SET_UPDATED terminal, applied after human
                confirmation
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="Gambia VAT rate rule updated — 15% → 16%"
          tone="green"
        >
          <p>
            Rule set updated — Gambia GRA standard VAT rate 15% → 16%, effective
            August 1, 2026. Source: GRA public notice #2026-041. Confirmed by
            human (CFO) at 14:04:12 — never auto-applied.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-balanced-green" />
            Confirmed by human at 14:04:12 — rule v2.2 now cited by Tax Agent
            and Payroll Worker Agent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Deadline critical (Spec §6) — non-blocking but urgent ────
  if (showDeadlineCritical) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <AlertTriangle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Deadline Critical</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — critical window reached, package not ready
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Non-blocking but urgent
          </span>
        </div>
        <BranchCard
          icon={AlertTriangle}
          title="VAT return for Gambia Q2 due in 2 days — package not ready"
          tone="amber"
        >
          <p>
            Gambia VAT Q2 2026 return due July 24 — 2 days remaining and the
            submission package is not ready. High-urgency alert escalated to CFO
            Agent and human immediately.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlarmClock className="h-3 w-3 text-attention-amber" />
            High-urgency alert — deadline within critical window, package not
            ready. Non-blocking but urgent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Regulatory risk identified (Spec §6) — blocking ──────────
  if (showRiskIdentified) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <XCircle className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Regulatory Risk Identified
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — missed filing, immediate escalation, not batched
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={XCircle}
          title="Missed filing detected: SSHFC May 2026 contributions"
          tone="red"
        >
          <p>
            Missed filing detected — SSHFC monthly contributions for May 2026
            were not submitted. Immediate escalation to CFO Agent and human —
            never batched to month-end.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Immediate escalation, not batched — missed filing requires
            remediation before close can proceed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Kicked back to Tax Agent (Spec §2 fail) ──────────────────
  if (showKickedBack) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <XCircle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Kicked Back to Tax Agent
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — TAX_AGENT_REVIEW failed, returned with specific reason
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking for that return
          </span>
        </div>
        <BranchCard
          icon={XCircle}
          title="VAT Q2 draft line 3 cites rule version 2.0 — current is 2.1"
          tone="amber"
        >
          <p>
            Kicked back to Tax Agent: output VAT line cites rule version 2.0,
            current rule table is v2.1. Recalculated at 15% per rule v2.1 before
            the submission package can proceed.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Returned with specific reason — no silent acceptance, no silent
            rejection.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Low-confidence rule change (Spec §7) — never applied ─────
  if (showLowConfidenceRule) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Low-Confidence Rule Change
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — ambiguous or unverifiable source, human review
                required
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Human review required
          </span>
        </div>
        <BranchCard
          icon={AlertTriangle}
          title="Rule change detected from unverifiable source"
          tone="red"
        >
          <p>
            Ambiguous or unverifiable rule-change source — flagged
            low-confidence (48%). Human review required before any action. Never
            silently applied, never applied on a guessed rate.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocked until the source is verified and a human confirms.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: ComplianceState = "TAX_AGENT_REVIEW";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-700">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Compliance Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Rule currency &amp; deadline guardian
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Deadlines and rule currency are inherently time-based facts that
              decay silently if shown as a static list — a compliance calendar
              that isn&apos;t visibly live invites exactly the failure mode this
              agent exists to prevent. Rule updates must always trace to a
              source and date.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Reviewing Tax Agent draft
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
        <Activity className="h-3 w-3 text-signal-indigo animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">
          TAX_AGENT_REVIEW
        </span>{" "}
        — reviewing Gambia VAT Q2 2026 draft against rule table v2.1
      </div>

      {/* Pipeline */}
      <section
        aria-label="Compliance Agent State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Compliance Agent State Machine
          </h3>
          <LayerTag label="Layer 1 — deterministic lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "REGULATORY_STATUS_REPORTED";
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-signal-indigo/30 bg-signal-indigo/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-signal-indigo/15"
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
                      <span className="rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-semibold text-signal-indigo">
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

      {/* Compliance Calendar — live graduated countdown */}
      <section
        aria-label="Compliance Calendar"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Compliance Calendar — Live Graduated Countdown
          </h3>
          <LayerTag label="Layer 1 — calendar-based" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Every deadline ticks live — color-graduated at 30 / 14 / 7-day
          thresholds. Not a static list refreshed only on page load.
        </p>
        <div className="grid gap-1.5">
          {CALENDAR_ROWS.map((row) => (
            <div
              key={row.label}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2",
                row.tone === "critical"
                  ? "border-attention-amber/40 bg-attention-amber/10"
                  : row.tone === "mid"
                    ? "border-attention-amber/20 bg-attention-amber/5"
                    : row.tone === "ok"
                      ? "border-balanced-green/20 bg-balanced-green/5"
                      : "border-border/40 bg-muted/20",
              )}
            >
              <div>
                <p className="text-[11px] font-semibold">{row.label}</p>
                <p className="text-[9px] text-muted-foreground/70">{row.due}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                  row.tone === "critical"
                    ? "bg-attention-amber/20 text-attention-amber"
                    : row.tone === "mid"
                      ? "bg-attention-amber/10 text-attention-amber"
                      : row.tone === "ok"
                        ? "bg-balanced-green/10 text-balanced-green"
                        : "bg-muted text-muted-foreground/70",
                )}
              >
                {row.chip}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Tax Agent Review — deterministic */}
      <section
        aria-label="Tax Agent Review"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Tax Agent Review
          </h3>
          <LayerTag label="Layer 1 — structured review" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Reviewing VAT return for Gambia Q2 2026 — every line traceable to
              a valid rule citation before the submission package
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            {RETURN_LINES.map((line) => (
              <div
                key={line.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5"
              >
                <div>
                  <p className="text-[10px] font-medium">{line.name}</p>
                  <p className="text-[9px] font-mono text-muted-foreground">
                    {line.detail}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Rule cited
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground/70">
            No confidence score — structured review against known rules.
          </p>
        </div>
      </section>

      {/* Regulatory Status Reported */}
      <section
        aria-label="Regulatory Status"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Regulatory Status
          </h3>
          <LayerTag label="Layer 1 — reported" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-balanced-green" />
            <p className="text-[11px] font-semibold">
              Compliance status: clean — 1 return in submission package,
              reported to CFO Agent at 11:04:02
            </p>
          </div>
        </div>
      </section>

      {/* Rule Update Track — never auto-applied */}
      <section
        aria-label="Rule Update Track"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Rule Update Track — Never Auto-Applied
          </h3>
          <LayerTag label="Layer 2 — judgment on detection" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Rule set changes are never auto-applied. Every update requires
          explicit human confirmation with the source cited — this agent detects
          and proposes, it does not unilaterally rewrite the tax rules other
          agents depend on.
        </p>
        <div className="space-y-1.5">
          {/* Card 1 — RULE_UPDATE_DETECTED */}
          <div className="rounded-lg border border-signal-indigo/30 bg-signal-indigo/5 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-semibold">
                <Bell className="h-3.5 w-3.5 text-signal-indigo" />
                Rule change detected
              </span>
              <span
                role="meter"
                aria-label="Rule-change detection confidence"
                aria-valuenow={82}
                aria-valuemin={0}
                aria-valuemax={100}
                className="inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-1.5 py-0.5 text-[9px] font-bold text-signal-indigo"
              >
                82%
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Gambia GRA standard VAT rate 15% → 16%, effective August 1, 2026
            </p>
            <p className="mt-1 text-[9px] font-mono text-muted-foreground/70">
              Source: GRA public notice #2026-041 (press release, July 10, 2026)
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground/70">
              82% — inferred from ambiguous source (press release, not official
              register). Authoritative direct sources carry no score.
            </p>
          </div>
          {/* Card 2 — HUMAN_REVIEW_REQUESTED */}
          <div className="rounded-lg border border-attention-amber/30 bg-attention-amber/5 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-semibold">
                <UserCheck className="h-3.5 w-3.5 text-attention-amber" />
                Human review requested
              </span>
              <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                Awaiting confirmation — blocking until confirmed
              </span>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Please confirm this rule update before it&apos;s applied. Old rule
              15% (rule v2.1) vs proposed 16% (rule v2.2).
            </p>
          </div>
          {/* Card 3 — RULE_SET_UPDATED (pending) */}
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 opacity-70">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Rule set updated
              <span className="text-[9px] font-medium text-muted-foreground/60">
                — pending human confirmation, not yet applied
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Compliance Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Deadline", value: "7 days" },
          { label: "Jurisdictions", value: "2" },
          { label: "Returns Tracked", value: "6" },
          { label: "Rule Changes Pending", value: "1" },
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
                    "Deadline within critical window and package not ready",
                  esc: "CFO Agent, human, immediately",
                  note: "High-urgency alert",
                  blocking: "Non-blocking but urgent",
                },
                {
                  condition: "Rule change detected",
                  esc: "Human, always",
                  note: "Confirmation required before any downstream agent uses the new rule",
                  blocking: "Blocking until confirmed",
                },
                {
                  condition: "Regulatory risk identified (e.g., missed filing)",
                  esc: "CFO Agent, human, immediately",
                  note: "Immediate escalation, not batched",
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
          The critical rule: rule set changes are never auto-applied. Every
          update requires explicit human confirmation with the source cited —
          this agent detects and proposes, it does not unilaterally rewrite the
          tax rules other agents depend on.
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
            Audit Trail — Every Deadline &amp; Rule Change
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
                  const isRule = entry.state.startsWith("RULE");
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
                            entry.state === "RULE_SET_UPDATED"
                              ? "bg-balanced-green/10 text-balanced-green"
                              : isRule
                                ? "bg-signal-indigo/10 text-signal-indigo"
                                : entry.state === "TAX_AGENT_REVIEW"
                                  ? "bg-signal-indigo/10 text-signal-indigo"
                                  : entry.state === "DEADLINE_APPROACHING"
                                    ? "bg-attention-amber/10 text-attention-amber"
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
          {["Tax Agent", "Compliance Agent", "Audit Agent", "CFO Agent"].map(
            (agent, i) => (
              <span key={agent} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-1",
                    agent === "Compliance Agent"
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
          Oversees Tax Agent and Audit Agent. Reports to CFO Agent. Provides the
          rule tables Tax Agent and Payroll Worker Agent depend on.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: deadline monitoring, escalation, Tax Agent
          review, regulatory reporting, rule application — never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Bell className="h-3 w-3 text-signal-indigo" />
          Layer 2 — rule-change detection: 82% confidence when inferred from an
          ambiguous source; authoritative sources carry no score
        </span>
      </div>
    </div>
  );
}
