"use client";

import React from "react";
import { useState } from "react";
import {
  FileText,
  Database,
  Hourglass,
  LayoutList,
  PenLine,
  CheckCircle2,
  Activity,
  ChevronDown,
  Eye,
  ListChecks,
  ArrowRight,
  Fingerprint,
  FolderOpen,
  AlertTriangle,
  ShieldCheck,
  Link2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ReportState =
  | "REQUESTED"
  | "GATHERING_INPUTS"
  | "WAITING_ON_DEPENDENCIES"
  | "ASSEMBLING"
  | "NARRATIVE_GENERATED"
  | "DELIVERED";

export interface StateTransition {
  state: ReportState;
  timestamp: string;
  detail: string;
}

export interface ReportingLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showMissingInput?: boolean;
  showDependencyWait?: boolean;
  showDelivered?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ReportState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "REQUESTED",
    label: "REQUESTED",
    description:
      "Report request received — identifying scope, date range, and format",
    icon: FileText,
  },
  {
    id: "GATHERING_INPUTS",
    label: "GATHERING_INPUTS",
    description:
      "Pulling trial balance, budget data, currency data from owning agents",
    icon: Database,
  },
  {
    id: "WAITING_ON_DEPENDENCIES",
    label: "WAITING_ON_DEPENDENCIES",
    description: "Waiting visibly on inputs owned by other agents",
    icon: Hourglass,
  },
  {
    id: "ASSEMBLING",
    label: "ASSEMBLING",
    description: "Building the report section by section",
    icon: LayoutList,
  },
  {
    id: "NARRATIVE_GENERATED",
    label: "NARRATIVE_GENERATED",
    description: "Writing a plain-English summary of the assembled numbers",
    icon: PenLine,
  },
  {
    id: "DELIVERED",
    label: "DELIVERED",
    description: "Report ready — sent via dashboard or email",
    icon: CheckCircle2,
  },
];

const SOURCES: Array<{ agent: string; item: string; snapshot: string }> = [
  { agent: "Ledger Agent", item: "trial balance", snapshot: "TB-2026-Q2-v3" },
  { agent: "Budget Agent", item: "budget variance", snapshot: "BUD-2026-Q2" },
  {
    agent: "Analytics Agent",
    item: "currency summary",
    snapshot: "FX-2026-06",
  },
];

const ASSEMBLY_SECTIONS: Array<{
  name: string;
  status: "assembled" | "assembling" | "pending";
}> = [
  { name: "Revenue", status: "assembled" },
  { name: "Cost of Sales", status: "assembled" },
  { name: "Operating Expenses", status: "assembling" },
  { name: "Net Income", status: "pending" },
];

const REPORT_ROWS: Array<{
  label: string;
  value: string;
  source: string;
}> = [
  {
    label: "Revenue",
    value: "GMD 12,400.00",
    source: "Ledger Agent · TB-2026-Q2-v3",
  },
  {
    label: "Cost of Sales",
    value: "GMD 4,800.00",
    source: "Ledger Agent · TB-2026-Q2-v3",
  },
  {
    label: "Operating Expenses",
    value: "GMD 3,100.00",
    source: "Budget Agent · BUD-2026-Q2",
  },
  {
    label: "Net Income",
    value: "GMD 4,500.00",
    source: "Assembled from sourced rows",
  },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "REQUESTED",
    timestamp: "09:41:00.102",
    detail:
      "report: P&L, period: Q2 2026, entity: Xenboox HQ, channel: dashboard, requestor: CFO Agent",
  },
  {
    state: "GATHERING_INPUTS",
    timestamp: "09:41:01.356",
    detail: "pulled: Ledger Agent trial balance (snapshot TB-2026-Q2-v3)",
  },
  {
    state: "GATHERING_INPUTS",
    timestamp: "09:41:02.011",
    detail: "pulled: Budget Agent budget variance (snapshot BUD-2026-Q2)",
  },
  {
    state: "GATHERING_INPUTS",
    timestamp: "09:41:02.833",
    detail: "pulled: Analytics Agent currency summary (snapshot FX-2026-06)",
  },
  {
    state: "ASSEMBLING",
    timestamp: "09:41:03.217",
    detail: "sections assembled: revenue, cost of sales, operating expenses",
  },
  {
    state: "NARRATIVE_GENERATED",
    timestamp: "09:41:03.904",
    detail:
      "narrative basis: revenue 12,400.00 (+8% vs May), service income 8,200.00 — no unsourced claims",
  },
  {
    state: "DELIVERED",
    timestamp: "09:41:04.000",
    detail: "delivered: dashboard, delivery timestamp 09:45:12",
  },
];

const STEPS = [
  {
    title: "Identify Report Scope",
    detail:
      "Input: request (type, period, entity). Output: report spec. No confidence score — deterministic intake.",
  },
  {
    title: "Pull Inputs from Owning Agents",
    detail:
      "Never re-derives numbers the Reporting Agent doesn't own — always pulls the trial balance from Ledger Agent, variance from Budget Agent, FX from Analytics Agent. No confidence score — structural.",
  },
  {
    title: "Wait on Dependencies",
    detail:
      "If an input is owned by another agent, wait visibly — shown with elapsed time, never hidden behind a generic spinner. No confidence score.",
  },
  {
    title: "Assemble Report Body",
    detail:
      "Section by section — headers populate in sequence, not all at once. No confidence score.",
  },
  {
    title: "Generate Narrative",
    detail:
      "Input: assembled numbers only. Output: plain-English explanation that cites the specific numbers it describes — never introduces unsourced claims. No confidence score.",
  },
];

const CONSTRAINTS = [
  { label: "Never Re-Derives", icon: Database },
  { label: "Sources Cited", icon: Link2 },
  { label: "Gaps Shown, Never Estimated", icon: AlertTriangle },
  { label: "Sections Populate in Order", icon: LayoutList },
  { label: "Narrative Cites Numbers", icon: PenLine },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: ReportState): React.ElementType {
  switch (state) {
    case "REQUESTED":
      return FileText;
    case "GATHERING_INPUTS":
      return Database;
    case "WAITING_ON_DEPENDENCIES":
      return Hourglass;
    case "ASSEMBLING":
      return LayoutList;
    case "NARRATIVE_GENERATED":
      return PenLine;
    case "DELIVERED":
      return CheckCircle2;
  }
}

function getStateColor(state: ReportState): string {
  switch (state) {
    case "REQUESTED":
      return "text-muted-foreground/70";
    case "GATHERING_INPUTS":
    case "WAITING_ON_DEPENDENCIES":
      return "text-signal-indigo";
    case "ASSEMBLING":
      return "text-attention-amber";
    case "NARRATIVE_GENERATED":
      return "text-signal-indigo";
    case "DELIVERED":
      return "text-balanced-green";
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

export function ReportingLiveness({
  className,
  showEmptyState,
  showMissingInput,
  showDependencyWait,
  showDelivered,
}: ReportingLivenessProps) {
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
          <p className="text-sm font-medium">No reports in queue</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Request a report from chat, a scheduled close, or on demand — the
            Reporting Agent pipeline will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Missing input (blocking for full delivery) ───────────────
  if (showMissingInput) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Database className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Report Incomplete</h2>
              <p className="text-[10px] text-muted-foreground">
                Blocking for full delivery — partial report may still be shown
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={Database}
          title="Trial balance for Q2 2026 not yet closed"
          tone="red"
        >
          <p>
            The P&amp;L requires the trial balance, which belongs to Ledger
            Agent — the Reporting Agent never independently calculates it. Since
            the required input is unavailable, the report is shown as partial
            and explicitly labeled, never silently filled with a placeholder or
            estimate.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Escalated to CFO Agent and human — the report is blocked for full
            delivery until Ledger Agent closes the period.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Dependency wait (non-blocking but visible) ───────────────
  if (showDependencyWait) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Hourglass className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Still waiting on Analytics Agent
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Currency summary — Non-blocking, but visible
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Elapsed: 42s
          </span>
        </div>
        <BranchCard
          icon={Hourglass}
          title="Currency summary (FX-2026-06) pending"
          tone="amber"
        >
          <p>
            The dependency agent hasn&apos;t responded within the expected time
            — shown with elapsed time, never hidden behind a generic spinner.
            Non-blocking: the report continues assembling once the dependency
            responds.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to CFO Agent — visible, not silent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: DELIVERED terminal state ─────────────────────────────────
  if (showDelivered) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Report Delivered</h2>
              <p className="text-[10px] text-muted-foreground">
                Terminal — delivered per channel
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            DELIVERED
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title="P&L for Q2 2026 delivered to dashboard"
          tone="green"
        >
          <p>
            Delivered per channel (dashboard) at 09:45:12. Every source pull,
            narrative basis, and delivery channel is logged in the audit trail.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Link2 className="h-3 w-3 text-balanced-green" />
            Sources: Ledger Agent (TB-2026-Q2-v3) · Budget Agent (BUD-2026-Q2) ·
            Analytics Agent (FX-2026-06)
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: ReportState = "ASSEMBLING";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Fingerprint className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Reporting Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Aggregator — never a source of truth
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Reports are the only artifact a non-technical owner ever looks at
              directly — the workforce underneath must be visible at the moment
              someone decides whether to believe the number.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Assembling
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
        <span className="font-semibold text-foreground">ASSEMBLING</span> —
        building P&L for Q2 2026
      </div>

      {/* Pipeline */}
      <section
        aria-label="Report State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Report State Machine
          </h3>
          <LayerTag layer="1" label="deterministic" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "DELIVERED";
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

      {/* Report Scope */}
      <section
        aria-label="Report Scope"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Report Scope
          </h3>
          <LayerTag layer="1" label="structural" />
        </div>
        <p data-step="scope" className="text-xs text-muted-foreground">
          Preparing P&L for Q2 2026 — Profit &amp; Loss report, entity: Xenboox
          HQ, requestor: CFO Agent
        </p>
      </section>

      {/* Input Gathering */}
      <section
        aria-label="Input Gathering"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Input Gathering
          </h3>
          <LayerTag layer="1" label="pulled, never re-derived" />
        </div>
        <div className="space-y-1.5">
          {SOURCES.map((source) => (
            <div
              key={source.agent}
              data-step="gather"
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-signal-indigo" />
                <span className="text-xs font-medium">
                  Pulling {source.item} from {source.agent}
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                {source.snapshot}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          All inputs received — no dependencies pending. The Reporting Agent
          never independently calculates a figure that another agent owns.
        </p>
      </section>

      {/* Progressive Assembly */}
      <section
        aria-label="Progressive Assembly"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Progressive Assembly
          </h3>
          <LayerTag layer="1" label="section by section" />
        </div>
        <p
          data-step="assemble"
          className="mb-3 text-[10px] text-muted-foreground"
        >
          The report assembles section by section — headers populate in
          sequence, not all at once.
        </p>
        <div className="space-y-1.5">
          {ASSEMBLY_SECTIONS.map((section) => {
            const Icon =
              section.status === "assembled"
                ? CheckCircle2
                : section.status === "assembling"
                  ? Activity
                  : Hourglass;
            const color =
              section.status === "assembled"
                ? "text-balanced-green"
                : section.status === "assembling"
                  ? "text-attention-amber"
                  : "text-muted-foreground/50";
            return (
              <div
                key={section.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      color,
                      section.status === "assembling" && "animate-pulse",
                    )}
                  />
                  <span className="text-xs font-medium">
                    {section.name} —{" "}
                    {section.status === "assembled"
                      ? "assembled"
                      : section.status === "assembling"
                        ? "assembling…"
                        : "pending"}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wider",
                    color,
                  )}
                >
                  {section.status === "assembled"
                    ? "Done"
                    : section.status === "assembling"
                      ? "In progress"
                      : "Queued"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Report Body */}
      <section
        aria-label="Report Body"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Report Body — P&amp;L
          </h3>
          <LayerTag layer="1" label="figures sourced" />
        </div>
        <div className="space-y-1">
          {REPORT_ROWS.map((row) => (
            <div
              key={row.label}
              data-step="report"
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium">{row.label}</p>
                <p className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
                  <Link2 className="h-2.5 w-2.5" />
                  {row.source}
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Each figure links back to its source agent and snapshot — click any
          row to trace the number to its originating transaction.
        </p>
      </section>

      {/* Narrative */}
      <section aria-label="Narrative" className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Narrative
          </h3>
          <LayerTag layer="1" label="cites the numbers above" />
        </div>
        <div
          data-step="narrative"
          className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5"
        >
          <p className="text-[10px] font-medium text-muted-foreground">
            Narrative (sourced from the numbers above)
          </p>
          <p className="mt-1 text-xs">
            Revenue was GMD 12,400.00, up 8% from May, driven mainly by Service
            Income (GMD 8,200.00). Gross margin held at 61.3%.
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            No unsourced claims — every sentence cites the specific number it
            explains from the report body above.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Report Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Report Type", value: "P&L" },
          { label: "Period", value: "Q2 2026" },
          { label: "Channel", value: "Dashboard" },
          { label: "Source Agents", value: "3" },
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
                    "Required input unavailable (trial balance not yet closed)",
                  esc: "CFO Agent, human",
                  note: "'Report incomplete — trial balance for [period] not yet closed'",
                  blocking: "Blocking for full delivery — partial may be shown",
                },
                {
                  condition:
                    "Dependency agent hasn't responded within expected time",
                  esc: "CFO Agent",
                  note: "'Still waiting on [Agent]' with elapsed time — not silent",
                  blocking: "Non-blocking, but visible",
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
          The critical rule: Reporting Agent is an aggregator, not a source of
          truth — it must never independently calculate a figure that another
          agent owns. If a required number isn&apos;t available, the report
          shows that gap explicitly rather than estimate it.
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
            Audit Trail — Every Source Pull
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
                            entry.state === "DELIVERED"
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
          {["Ledger Agent", "Budget Agent", "Analytics Agent", "Tax Agent"].map(
            (agent, i) => (
              <span key={agent} className="flex items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                  {agent}
                </span>
                {i < 3 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                )}
              </span>
            ),
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
            <BarChart3 className="h-3 w-3" />
            Reporting Agent
          </span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Pulls from owning agents — never a source of truth itself. Pulls the
          trial balance from Ledger Agent, variance from Budget Agent, currency
          summary from Analytics Agent, tax data from Tax Agent depending on
          report type.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: aggregator, never a source of truth; every
          figure cites its owning agent
        </span>
      </div>
    </div>
  );
}
