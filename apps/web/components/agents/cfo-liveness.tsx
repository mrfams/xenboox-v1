"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Crown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Activity,
  Clock,
  Route,
  ScrollText,
  Eye,
  ListChecks,
  MessageSquare,
  GitBranch,
  Layers,
  Landmark,
  Shield,
  FileText,
  Building2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { CfoLivenessPayload } from "@/lib/cfo-liveness";

// ─── Types ─────────────────────────────────────────────────────────────

export type CfoScenario =
  | "idle"
  | "routing"
  | "awaiting"
  | "responding"
  | "escalation"
  | "conflict"
  | "signoff";

export interface CfoLivenessProps {
  scenario?: CfoScenario;
  livePayload?: CfoLivenessPayload | null;
  className?: string;
}

// ─── State Machine (§2) ────────────────────────────────────────────────

const STATE_MACHINE: Array<{
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "INSTRUCTION_RECEIVED",
    label: "INSTRUCTION_RECEIVED",
    description: "Human instruction parsed and confirmed",
    icon: MessageSquare,
  },
  {
    id: "ROUTING_TO_DEPARTMENT_HEAD",
    label: "ROUTING_TO_DEPARTMENT_HEAD",
    description: "Fanning out to department heads",
    icon: GitBranch,
  },
  {
    id: "AWAITING_DEPARTMENT_SUMMARIES",
    label: "AWAITING_DEPARTMENT_SUMMARIES",
    description: "Waiting for department summaries",
    icon: Clock,
  },
  {
    id: "SYNTHESIZING",
    label: "SYNTHESIZING",
    description: "Combining department summaries",
    icon: Layers,
  },
  {
    id: "RESPONDING",
    label: "RESPONDING",
    description: "Response ready — claims carry source refs",
    icon: ScrollText,
  },
  {
    id: "ESCALATION_RECEIVED_FROM_DEPT_HEAD",
    label: "ESCALATION_RECEIVED_FROM_DEPT_HEAD",
    description: "A department head flagged an issue",
    icon: AlertTriangle,
  },
  {
    id: "FRAMING_FOR_HUMAN",
    label: "FRAMING_FOR_HUMAN",
    description: "Framing the ask with the triggering data",
    icon: Eye,
  },
  {
    id: "PRESENTED_TO_HUMAN",
    label: "PRESENTED_TO_HUMAN",
    description: "Escalation presented to the owner",
    icon: Landmark,
  },
];

const HOW_IT_WORKS = [
  {
    title: "Parse instruction",
    detail:
      "CFO Agent resolves the owner's intent and decides which department heads must be consulted before answering.",
  },
  {
    title: "Route to department",
    detail:
      "Each relevant department head (Controller, Treasury, Compliance, etc.) receives a scoped task and reports back with a summary plus confidence.",
  },
  {
    title: "Synthesize",
    detail:
      "CFO Agent combines every summary into one response — a composition step, not a new-fact-generation step. It never introduces claims not present in the underlying department summaries, and every claim keeps a source reference back to the department that produced it.",
  },
];

// ─── Demo scenario payloads ────────────────────────────────────────────

const SCENARIO_PAYLOADS: Record<
  Exclude<CfoScenario, "idle">,
  CfoLivenessPayload
> = {
  routing: {
    livenessState: "ROUTING_TO_DEPARTMENT_HEAD",
    routedDepartments: ["controller", "treasury"],
    departmentResponses: [],
    sourceRefs: [],
    response: "",
    decision: "proceed",
    escalations: [],
    conflicts: [],
    audit: null,
    steps: [
      {
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        status: "completed",
        durationMs: 12,
      },
      {
        step: "routing",
        label: "Routing to Department Heads",
        status: "in_progress",
        durationMs: 8,
      },
    ],
    overallConfidence: 0.9,
    durationMs: 20,
  },
  awaiting: {
    livenessState: "AWAITING_DEPARTMENT_SUMMARIES",
    routedDepartments: ["controller", "treasury", "compliance"],
    departmentResponses: [
      {
        department: "controller",
        displayName: "Controller",
        status: "received",
        headline: "Trial balance confirmed",
        confidence: 0.95,
        escalations: [],
      },
      {
        department: "treasury",
        displayName: "Treasury",
        status: "received",
        headline: "Cash at bank GMD 52,000",
        confidence: 0.88,
        escalations: [],
      },
    ],
    sourceRefs: [],
    response: "",
    decision: "proceed",
    escalations: [],
    conflicts: [],
    audit: null,
    steps: [
      {
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        status: "completed",
        durationMs: 12,
      },
      {
        step: "response_synthesis",
        label: "Response Synthesis",
        status: "pending",
        durationMs: 0,
      },
    ],
    overallConfidence: 0.915,
    durationMs: 340,
  },
  responding: {
    livenessState: "RESPONDING",
    routedDepartments: ["controller", "treasury"],
    departmentResponses: [
      {
        department: "controller",
        displayName: "Controller",
        status: "received",
        headline: "Trial balance confirmed",
        confidence: 0.95,
        escalations: [],
      },
      {
        department: "treasury",
        displayName: "Treasury",
        status: "received",
        headline: "Cash at bank GMD 52,000",
        confidence: 0.88,
        escalations: [],
      },
    ],
    sourceRefs: [
      {
        claim: "Profit last month was GMD 4,200",
        sourceDepartment: "controller",
        sourceSummaryExcerpt: "Trial balance confirmed",
        confidence: 0.95,
      },
    ],
    response:
      "Your profit last month was GMD 4,200 — from Controller's confirmed trial balance.",
    decision: "proceed",
    escalations: [],
    conflicts: [],
    audit: {
      agentId: "cfo-agent",
      action: "routing_auto",
      timestamp: "2026-07-31T09:00:00.000Z",
      confidence: 0.9,
    },
    steps: [
      {
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        status: "completed",
        durationMs: 12,
      },
      {
        step: "response_synthesis",
        label: "Response Synthesis",
        status: "completed",
        durationMs: 4,
      },
    ],
    overallConfidence: 0.915,
    durationMs: 240,
  },
  escalation: {
    livenessState: "PRESENTED_TO_HUMAN",
    routedDepartments: ["treasury"],
    departmentResponses: [],
    sourceRefs: [],
    response:
      "Here's why I'm asking you: Treasury flagged the bank reconciliation.",
    decision: "escalate_to_human",
    escalations: [
      {
        id: "esc-1",
        what: "cash position is GMD 2,000 lower than expected",
        why: "Treasury flagged the bank reconciliation",
        whichAgent: "Treasury Agent",
        confidence: 0.81,
        recommendedAction:
          "Review the flagged bank line and confirm the adjustment",
      },
    ],
    conflicts: [],
    audit: {
      agentId: "cfo-agent",
      action: "escalate_to_human",
      timestamp: "2026-07-31T09:05:00.000Z",
      confidence: 0.81,
    },
    steps: [
      {
        step: "escalation_framing",
        label: "Escalation Framing",
        status: "completed",
        durationMs: 30,
      },
    ],
    overallConfidence: 0.81,
    durationMs: 180,
  },
  conflict: {
    livenessState: "RESPONDING",
    routedDepartments: ["treasury", "compliance"],
    departmentResponses: [
      {
        department: "treasury",
        displayName: "Treasury",
        status: "received",
        headline: "Cash at bank GMD 52,000",
        confidence: 0.88,
        escalations: [],
      },
      {
        department: "compliance",
        displayName: "Compliance",
        status: "received",
        headline: "Cash at bank GMD 49,000",
        confidence: 0.79,
        escalations: [],
      },
    ],
    sourceRefs: [],
    response: "",
    decision: "proceed",
    escalations: [],
    conflicts: [
      {
        agents: ["Treasury", "Compliance"],
        description:
          "Treasury reports cash at bank GMD 52,000 while Compliance reports GMD 49,000.",
      },
    ],
    audit: {
      agentId: "cfo-agent",
      action: "conflict_detected",
      timestamp: "2026-07-31T09:10:00.000Z",
      confidence: 0.83,
    },
    steps: [
      {
        step: "conflict_detection",
        label: "Conflict Detection",
        status: "completed",
        durationMs: 40,
      },
    ],
    overallConfidence: 0.835,
    durationMs: 300,
  },
  signoff: {
    livenessState: "RESPONDING",
    routedDepartments: ["controller", "treasury", "compliance"],
    departmentResponses: [
      {
        department: "controller",
        displayName: "Controller",
        status: "received",
        headline: "Trial balance balanced",
        confidence: 0.97,
        escalations: [],
      },
      {
        department: "treasury",
        displayName: "Treasury",
        status: "received",
        headline: "Cash position confirmed",
        confidence: 0.9,
        escalations: [],
      },
      {
        department: "compliance",
        displayName: "Compliance",
        status: "received",
        headline: "Regulatory status clean",
        confidence: 0.89,
        escalations: [],
      },
    ],
    sourceRefs: [],
    // Sign-off is presented in its dedicated region (Synthesized Response is
    // gated off in this scenario) — response stays empty to avoid dead data.
    response: "",
    decision: "proceed",
    escalations: [],
    conflicts: [],
    audit: {
      agentId: "cfo-agent",
      action: "close_signoff_requested",
      timestamp: "2026-07-31T09:15:00.000Z",
      confidence: 0.92,
    },
    steps: [
      {
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        status: "completed",
        durationMs: 12,
      },
      {
        step: "routing",
        label: "Routing to Department Heads",
        status: "completed",
        durationMs: 30,
      },
      {
        step: "response_synthesis",
        label: "Response Synthesis",
        status: "completed",
        durationMs: 4,
      },
    ],
    overallConfidence: 0.92,
    durationMs: 260,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function getActiveStateIndex(payload: CfoLivenessPayload): number {
  const idx = STATE_MACHINE.findIndex((s) => s.label === payload.livenessState);
  return idx >= 0 ? idx : 4;
}

function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

function getStateColor(id: string): string {
  if (
    id === "PRESENTED_TO_HUMAN" ||
    id === "ESCALATION_RECEIVED_FROM_DEPT_HEAD"
  ) {
    return "text-attention-amber";
  }
  if (id === "RESPONDING") return "text-balanced-green";
  return "text-signal-indigo";
}

function StatusDot({ state }: { state: string }) {
  if (state === "error") {
    return <XCircle className="h-3.5 w-3.5 text-error-clay shrink-0" />;
  }
  if (state === "pending" || state === "timed_out") {
    return <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green shrink-0" />;
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateStage({
  label,
  description,
  icon: Icon,
  isActive,
  isCompleted,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      role="listitem"
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
        isActive && "bg-signal-indigo/5 border-signal-indigo/30 shadow-sm",
        isCompleted && "bg-balanced-green/5 border-balanced-green/20",
        !isActive && !isCompleted && "bg-muted/30 border-border/50 opacity-60",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
          isActive && "text-signal-indigo",
          isCompleted && "text-balanced-green",
          !isActive && !isCompleted && "text-muted-foreground/40",
        )}
      >
        {isActive ? (
          <Activity className="h-4 w-4 animate-pulse" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-mono font-semibold tracking-tight",
              isActive && getStateColor(label),
              isCompleted && "text-balanced-green",
              !isActive && !isCompleted && "text-muted-foreground/40",
            )}
          >
            {label}
          </span>
          {isCompleted && (
            <CheckCircle2 className="h-2.5 w-2.5 text-balanced-green shrink-0" />
          )}
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo animate-pulse shrink-0" />
          )}
        </div>
        <p
          className={cn(
            "text-[9px] truncate",
            (isActive || isCompleted) && "text-muted-foreground/80",
            !isActive && !isCompleted && "text-muted-foreground/40",
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function DepartmentResponseCard({
  displayName,
  status,
  headline,
  confidence,
}: {
  displayName: string;
  status: string;
  headline: string | null;
  confidence: number | null;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        status === "error" && "bg-error-clay/5 border-error-clay/20",
        status !== "error" && "bg-accent/20 border-border/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot state={status} />
          <span className="text-xs font-medium truncate">{displayName}</span>
        </div>
        <span
          className={cn(
            "text-[9px] font-mono font-medium shrink-0",
            status === "error" ? "text-error-clay" : "text-muted-foreground",
          )}
        >
          {formatConfidence(confidence)}
        </span>
      </div>
      {headline && (
        <p
          className={cn(
            "text-[10px] mt-1.5",
            status === "error" ? "text-error-clay/90" : "text-muted-foreground",
          )}
        >
          {headline}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function CfoLiveness({
  scenario,
  livePayload,
  className,
}: CfoLivenessProps) {
  const [showHow, setShowHow] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // Resolve effective payload: live data wins over demo scenarios
  const payload: CfoLivenessPayload =
    livePayload ??
    (scenario && scenario !== "idle"
      ? SCENARIO_PAYLOADS[scenario]
      : SCENARIO_PAYLOADS.responding);

  const isIdle = scenario === "idle" && !livePayload;
  const activeIdx = isIdle ? -1 : getActiveStateIndex(payload);

  const escalations =
    livePayload?.escalations ??
    (scenario === "escalation" ? payload.escalations : []);

  const conflicts = livePayload?.conflicts ?? payload.conflicts;

  const sourceRefs = livePayload?.sourceRefs ?? payload.sourceRefs;

  // A claim already stated verbatim in the response is traceable from the
  // response itself — don't re-render it as a separate source ref row.
  const responseText =
    livePayload?.response ??
    (scenario === "escalation"
      ? "Here's why I'm asking you: Treasury flagged the bank reconciliation."
      : payload.response);
  const effectiveSourceRefs = sourceRefs.filter((ref) => {
    const claim = ref.claim.toLowerCase();
    return !(responseText && responseText.toLowerCase().includes(claim));
  });

  // Demo content for scenario-driven views (live payload overrides)
  const response = responseText;

  const responses =
    livePayload?.departmentResponses ?? payload.departmentResponses;

  const why = livePayload
    ? null
    : scenario === "responding"
      ? "Controller Agent confirmed the trial balance and Treasury Agent confirmed cash at bank before I responded."
      : scenario === "conflict"
        ? "Treasury Agent and Compliance Agent returned different cash figures, so both are shown side by side for your judgment."
        : null;

  const isEscalationState =
    payload.livenessState === "PRESENTED_TO_HUMAN" ||
    (scenario === "escalation" && !livePayload);

  const isConflictState = conflicts.length > 0 || scenario === "conflict";

  const isSignoffState = scenario === "signoff" && !livePayload;

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">CFO Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Tier 1 — Strategic
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Strategic Orchestrator — talks only to humans
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Probabilistic Layer
            </p>
            <p className="text-xs font-medium mt-0.5">
              Overall confidence: {formatConfidence(payload.overallConfidence)}
            </p>
            <p className="text-[9px] text-muted-foreground/60">
              duration: {payload.durationMs}ms
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4" role="region" aria-label="Agent Status">
        {/* Status strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="region"
          aria-label="Status Information"
        >
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              State
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full animate-pulse",
                  isEscalationState
                    ? "bg-attention-amber"
                    : isIdle
                      ? "bg-muted-foreground/40"
                      : "bg-signal-indigo",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium font-mono",
                  isEscalationState
                    ? "text-attention-amber"
                    : isIdle
                      ? "text-muted-foreground/60"
                      : "text-signal-indigo",
                )}
              >
                {isIdle
                  ? "IDLE"
                  : isEscalationState
                    ? payload.livenessState
                    : payload.livenessState}
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Departments
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <GitBranch className="h-3 w-3 text-signal-indigo" />
              <span className="text-xs font-medium truncate">
                {isIdle
                  ? "None"
                  : payload.routedDepartments.length > 0
                    ? payload.routedDepartments.length
                    : "0"}
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Confidence
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="h-3 w-3 text-balanced-green" />
              <span className="text-xs font-medium tabular-nums">
                {formatConfidence(payload.overallConfidence)}
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Source Refs
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <FileText className="h-3 w-3 text-signal-indigo" />
              <span className="text-xs font-medium">
                {effectiveSourceRefs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Idle state */}
        {isIdle && (
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-8 text-center"
            role="region"
            aria-label="Idle State"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <Crown className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No instruction in flight
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-md mx-auto">
              The CFO Agent is idle, waiting for your next instruction. The only
              agent in the platform that talks directly to humans.
            </p>
          </div>
        )}

        {/* State machine */}
        <div role="region" aria-label="Liveness State Machine">
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Liveness State Machine
          </h3>
          <div className="space-y-1.5">
            {STATE_MACHINE.map((state, idx) => (
              <StateStage
                key={state.label}
                label={state.label}
                description={state.description}
                icon={state.icon}
                isActive={idx === activeIdx}
                isCompleted={idx < activeIdx}
              />
            ))}
          </div>
        </div>

        {/* Routing / Awaiting moment */}
        {(scenario === "routing" || scenario === "awaiting") &&
          !livePayload && (
            <div
              className="rounded-lg border bg-accent/20 p-3"
              role="region"
              aria-label="Routing Moment"
            >
              {scenario === "routing" ? (
                <>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5 text-signal-indigo" />
                    Checking with the department heads…
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Multi-department question — CFO Agent fans out to each
                    department head before responding.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Controller", "Treasury"].map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[9px] font-medium"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo animate-pulse" />
                        {d}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-attention-amber" />
                    Still waiting on one department…
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    One department has not returned a summary yet. The CFO Agent
                    never silently drops a department — it waits and shows the
                    wait.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Controller", "Treasury"].map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[9px] font-medium text-balanced-green"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {d}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-attention-amber/30 bg-attention-amber/10 px-2.5 py-1 text-[9px] font-medium text-attention-amber">
                      <span className="h-1.5 w-1.5 rounded-full bg-attention-amber animate-pulse" />
                      Compliance
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

        {/* Month-end close sign-off — passive approval (§6) */}
        {isSignoffState && (
          <div
            className="rounded-lg border border-signal-indigo/30 bg-signal-indigo/5 p-3"
            role="region"
            aria-label="Month-End Close Sign-Off"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10 shrink-0">
                <Landmark className="h-4 w-4 text-signal-indigo" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-signal-indigo uppercase tracking-wider">
                    Month-end close ready for sign-off
                  </span>
                  <span className="rounded-full border border-balanced-green/20 bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-medium text-balanced-green">
                    Non-blocking — silence = approval
                  </span>
                </div>
                <p className="text-[10px] text-foreground mt-1">
                  Proceeding with the close unless you object by Friday 18:00 —
                  the passive-approval pattern per PRD §8.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Trial balance balanced (Controller)",
                    "AP-AR reconciled (Controller)",
                    "Cash position confirmed (Treasury)",
                    "Regulatory status clean (Compliance)",
                  ].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[9px] font-medium"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-balanced-green" />
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowRight className="h-2.5 w-2.5 text-balanced-green/60" />
                  <span className="text-[9px] text-balanced-green/80 font-medium">
                    Silence is consent — object by Friday 18:00 to hold the
                    close.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Escalation framing */}
        {isEscalationState && !livePayload && (
          <div
            className="rounded-lg border border-attention-amber/30 bg-attention-amber/5 p-3"
            role="region"
            aria-label="Escalation to Human"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10 shrink-0">
                <AlertTriangle className="h-4 w-4 text-attention-amber" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-attention-amber uppercase tracking-wider">
                    Here&apos;s why I&apos;m asking you
                  </span>
                  <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                    ESCALATED
                  </span>
                </div>
                <p className="text-[10px] text-foreground mt-1">
                  Treasury flagged the bank reconciliation — the cash position
                  is GMD 2,000 lower than expected.
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                  <span className="text-[9px] text-attention-amber/80 font-medium">
                    Review the flagged bank line and confirm the adjustment
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Department responses */}
        {responses.length > 0 && (
          <div role="region" aria-label="Department Responses">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Department Responses
            </h3>
            <div className="space-y-2">
              {responses.map((r) => (
                <DepartmentResponseCard
                  key={r.department}
                  displayName={r.displayName}
                  status={r.status}
                  headline={r.headline}
                  confidence={r.confidence}
                />
              ))}
            </div>
          </div>
        )}

        {/* Conflicts side by side */}
        {(isConflictState || conflicts.length > 0) && !isEscalationState && (
          <div
            className="rounded-lg border border-attention-amber/30 bg-attention-amber/5 p-3"
            role="region"
            aria-label="Conflicting Inputs"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-attention-amber" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-attention-amber">
                Conflicting inputs — shown for your judgment
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {scenario === "conflict" && !livePayload ? (
                <>
                  <div className="rounded-lg border bg-card p-2.5">
                    <p className="text-[9px] font-medium text-muted-foreground">
                      Treasury
                    </p>
                    <p className="text-xs font-semibold tabular-nums mt-0.5">
                      GMD 52,000
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <p className="text-[9px] font-medium text-muted-foreground">
                      Compliance
                    </p>
                    <p className="text-xs font-semibold tabular-nums mt-0.5">
                      GMD 49,000
                    </p>
                  </div>
                </>
              ) : (
                conflicts.map((c, i) => (
                  <div key={i} className="rounded-lg border bg-card p-2.5">
                    <p className="text-[9px] font-medium text-muted-foreground">
                      {c.agents.join(" vs ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {c.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Synthesized response */}
        {(response || livePayload) &&
          !isIdle &&
          !isEscalationState &&
          !isSignoffState && (
            <div
              className="rounded-lg border border-balanced-green/20 bg-balanced-green/5 p-3"
              role="region"
              aria-label="Synthesized Response"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-balanced-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-balanced-green">
                    Response:
                  </p>
                  <p className="text-[10px] text-foreground mt-0.5">
                    {response || payload.response}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Source references */}
        {effectiveSourceRefs.length > 0 && (
          <div role="region" aria-label="Source References">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Traceable Source Refs
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-[10px]" role="table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Claim
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      Source Department
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveSourceRefs.map((ref, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                      role="row"
                    >
                      <td className="px-3 py-2">{ref.claim}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {ref.sourceDepartment}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatConfidence(ref.confidence)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Why explanation */}
        {why && !isIdle && (
          <div
            className="rounded-lg border border-balanced-green/20 bg-balanced-green/5 p-3"
            role="region"
            aria-label="Why Explanation"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-balanced-green mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-balanced-green">
                  Why:
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {why}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Escalation & Human-in-the-Loop (§6) */}
        {!isIdle && !isEscalationState && (
          <div
            className="rounded-lg border bg-accent/20 p-3"
            role="region"
            aria-label="Escalation & Human-in-the-Loop"
          >
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Escalation &amp; Human-in-the-Loop
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]" role="table">
                <thead>
                  <tr className="border-b text-muted-foreground/60">
                    <th className="text-left py-1.5 pr-2 font-medium">
                      Condition
                    </th>
                    <th className="text-left py-1.5 pr-2 font-medium">
                      Escalates to
                    </th>
                    <th className="text-left py-1.5 pr-2 font-medium">
                      What user sees
                    </th>
                    <th className="text-left py-1.5 font-medium">Blocking?</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      condition: "Department head escalation received",
                      esc: "Human",
                      note: "Framed escalation with source cited",
                      blocking: "Blocking for that decision",
                    },
                    {
                      condition: "Month-end close ready for sign-off",
                      esc: "Human",
                      note: "Close summary presented, passive-approval pattern (per PRD §8)",
                      blocking: "Non-blocking (silence = approval)",
                    },
                    {
                      condition:
                        "Conflicting information between department heads",
                      esc: "Human",
                      note: "Both inputs shown side by side, never resolved by the CFO Agent's own guess",
                      blocking: "Blocking",
                    },
                  ].map((row) => (
                    <tr key={row.condition} className="border-b last:border-0">
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
          </div>
        )}

        {/* Constraint Enforcement — critical rule (§3) */}
        {!isIdle && (
          <div
            className="rounded-lg border bg-accent/20 p-3"
            role="region"
            aria-label="Constraint Enforcement"
          >
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Constraint Enforcement
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Never Fabricates",
                "Claims Traceable to Source",
                "Synthesis = Composition",
                "No Silent Drops",
              ].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[9px] font-medium"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 text-balanced-green" />
                  {badge}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground/70 leading-relaxed">
              Critical rule: the CFO Agent never fabricates a plain-English
              explanation disconnected from what department heads actually
              reported. Synthesis is a composition step, not a
              new-fact-generation step — it never introduces claims not present
              in the underlying department summaries, and every claim in its
              response is traceable, on request, to the specific agent or data
              behind it.
            </p>
          </div>
        )}

        {/* How It Works toggle */}
        <div className="rounded-lg border bg-accent/20 overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                How It Works — Decomposed Sub-Steps
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showHow && "rotate-180",
              )}
            />
          </button>

          {showHow && (
            <div className="border-t px-3 py-3 space-y-2.5">
              {HOW_IT_WORKS.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-indigo/10 text-[8px] font-bold text-signal-indigo">
                      {idx + 1}
                    </div>
                    {idx < HOW_IT_WORKS.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[10px] font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Trail toggle */}
        <div className="rounded-lg border bg-accent/20 overflow-hidden">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                Audit Trail — Every Action Logged
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showAudit && "rotate-180",
              )}
            />
          </button>

          {showAudit && (
            <div className="border-t">
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]" role="table">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        Agent
                      </th>
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.steps.map((s, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                        role="row"
                      >
                        <td className="px-3 py-1.5 font-mono font-semibold text-signal-indigo">
                          cfo-agent
                        </td>
                        <td className="px-3 py-1.5">{s.label}</td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {s.durationMs}ms
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatConfidence(payload.audit?.confidence ?? null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-1.5 border-t bg-muted/20 text-[8px] text-muted-foreground/60">
                {payload.audit
                  ? `agent: ${payload.audit.agentId} · action: ${payload.audit.action} · ${payload.audit.timestamp}`
                  : "agent: cfo-agent · action: routing_auto · ts: 2026-07-31T09:00:00.000Z"}
              </div>
            </div>
          )}
        </div>

        {/* Liveness footer */}
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-2.5"
          role="region"
          aria-label="Liveness Transparency"
        >
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Crown className="h-3 w-3 text-signal-indigo shrink-0" />
            <span>
              <strong className="text-muted-foreground/80">
                Tier 1 — Strategic:
              </strong>{" "}
              The CFO Agent is the only agent that talks directly to humans. It
              routes to department heads, waits for every summary (never
              silently drops one), and shows every claim with a source
              reference. Confidence below 0.7 escalates to a supervisor; below
              0.4 escalates to a human. The CFO Agent never guesses.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
