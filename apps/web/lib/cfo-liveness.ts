// ─── CFO Agent Liveness — Web Mapping Layer ───────────────────────────────
//
// Pure mapper: turns the real CFO pipeline result (runCFOPipeline) into the
// structured liveness payload the web UI renders. Composition only — never
// introduces claims the pipeline didn't produce (Liveness Spec §3 step 4).

export type LivenessDeptStatus = "pending" | "received" | "timed_out" | "error";

export interface LivenessSourceRef {
  claim: string;
  sourceDepartment: string;
  sourceSummaryExcerpt: string;
  confidence: number;
}

export interface LivenessEscalationRef {
  severity: string;
  description: string;
}

export interface LivenessDeptResponse {
  department: string;
  displayName: string;
  status: LivenessDeptStatus;
  headline: string | null;
  confidence: number | null;
  escalations: LivenessEscalationRef[];
}

export interface LivenessEscalation {
  id: string;
  what: string;
  why: string;
  whichAgent: string;
  confidence: number;
  recommendedAction: string;
}

export interface LivenessConflict {
  agents: string[];
  description: string;
}

export interface LivenessStep {
  step: string;
  label: string;
  status: string;
  durationMs: number;
}

export interface LivenessAudit {
  agentId: string;
  action: string;
  timestamp: string;
  confidence: number;
}

export interface CfoLivenessPayload {
  livenessState: string;
  routedDepartments: string[];
  departmentResponses: LivenessDeptResponse[];
  sourceRefs: LivenessSourceRef[];
  response: string;
  decision: string;
  escalations: LivenessEscalation[];
  conflicts: LivenessConflict[];
  audit: LivenessAudit | null;
  steps: LivenessStep[];
  overallConfidence: number;
  durationMs: number;
}

// ─── Structural subset of runCFOPipeline's result ─────────────────────────
// Declared locally so this module has zero runtime dependency on the agent
// pipeline (and its DB imports) — type-only compatibility.

export interface PipelineResultInput {
  response: string;
  decision: {
    action: string;
    reason: string;
    escalationItems?: Array<{
      id: string;
      what: string;
      why: string;
      whichAgent: string;
      confidence: number;
      amount: number | null;
      recommendedAction: string;
    }>;
  };
  summaries: Array<{
    agentId: string;
    department: string;
    status: "clean" | "flagged" | "blocked";
    headline: string;
    confidence: number;
    supportingDataRef: string | null;
    escalations: Array<{ severity: string; description: string }>;
  }>;
  auditEntry: {
    agentId: string;
    action: string;
    timestamp: string;
    confidence: number;
    details?: Record<string, unknown>;
  };
  stepTelemetry: Array<{
    step: string;
    label: string;
    status: string;
    durationMs: number;
    startedAt?: string;
    completedAt?: string;
  }>;
  durationMs: number;
}

// ─── Display name map (§10 cross-agent deps) ──────────────────────────────

const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
  controller: "Controller",
  treasury: "Treasury",
  payroll_manager: "Payroll Manager",
  compliance: "Compliance",
  reporting: "Reporting",
  budget: "Budget",
  analytics: "Analytics",
  document: "Document",
  ledger: "Ledger",
  ap: "Accounts Payable",
  ar: "Accounts Receivable",
  asset: "Fixed Assets",
  inventory: "Inventory",
  orchestrator: "Orchestrator",
  cfo: "CFO Agent",
};

export function getLivenessDepartmentDisplayName(department: string): string {
  return DEPARTMENT_DISPLAY_NAMES[department] ?? department;
}

// ─── State machine mapping (§2) ──────────────────────────────────────────

const ESCALATION_STATES = ["escalate_to_human", "rejected"];

export function mapLivenessState(decisionAction: string): string {
  if (ESCALATION_STATES.includes(decisionAction)) {
    return "PRESENTED_TO_HUMAN";
  }
  return "RESPONDING";
}

// ─── Main mapper ─────────────────────────────────────────────────────────

export function mapPipelineResultToLiveness(
  pipeline: PipelineResultInput,
): CfoLivenessPayload {
  const summaries = pipeline.summaries ?? [];
  const escalationItems = pipeline.decision?.escalationItems ?? [];

  const routedDepartments = summaries.map((s) => s.department);

  // Department responses — clean/flagged map to "received", blocked to "error"
  const departmentResponses: LivenessDeptResponse[] = summaries.map((s) => ({
    department: s.department,
    displayName: getLivenessDepartmentDisplayName(s.department),
    status: s.status === "blocked" ? ("error" as const) : ("received" as const),
    headline: s.headline,
    confidence: s.confidence,
    escalations: s.escalations.map((e) => ({
      severity: e.severity,
      description: e.description,
    })),
  }));

  // Source refs — every claim traceable to the department that produced it.
  // Blocked departments produce no claims, so no source refs (§4).
  const sourceRefs: LivenessSourceRef[] = summaries
    .filter((s) => s.status !== "blocked" && s.headline)
    .map((s) => ({
      claim: s.headline,
      sourceDepartment: s.department,
      sourceSummaryExcerpt: s.headline,
      confidence: s.confidence,
    }));

  // Conflicts — orchestrator summary carries the disagreement; both inputs
  // are shown side by side in the UI, never silently resolved (§6).
  const conflicts: LivenessConflict[] = summaries
    .filter((s) => s.department === "orchestrator")
    .map((s) => ({
      agents: s.headline
        .replace(/^Conflicting outputs between:\s*/i, "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      description: s.escalations[0]?.description ?? s.headline,
    }));

  const escalations: LivenessEscalation[] = escalationItems.map((item) => ({
    id: item.id,
    what: item.what,
    why: item.why,
    whichAgent: item.whichAgent,
    confidence: item.confidence,
    recommendedAction: item.recommendedAction,
  }));

  const overallConfidence =
    summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.confidence, 0) / summaries.length
      : 0;

  return {
    livenessState: mapLivenessState(pipeline.decision?.action ?? "proceed"),
    routedDepartments,
    departmentResponses,
    sourceRefs,
    response: pipeline.response,
    decision: pipeline.decision?.action ?? "unknown",
    escalations,
    conflicts,
    audit: pipeline.auditEntry
      ? {
          agentId: pipeline.auditEntry.agentId,
          action: pipeline.auditEntry.action,
          timestamp: pipeline.auditEntry.timestamp,
          confidence: pipeline.auditEntry.confidence,
        }
      : null,
    steps: (pipeline.stepTelemetry ?? []).map((t) => ({
      step: t.step,
      label: t.label,
      status: t.status,
      durationMs: t.durationMs,
    })),
    overallConfidence,
    durationMs: pipeline.durationMs ?? 0,
  };
}
