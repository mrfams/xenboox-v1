import { langfuse } from "./langfuse";
import { reportAgentError } from "./sentry";
import { createAuditEntry } from "./state";
import { getAgentTier } from "./security";
import { db } from "@xenboox/db";
import { opsLiveRuns } from "@xenboox/db/schema/ops-live-runs";
import type { AuditEntry } from "./state";
import {
  emitAgentAlert,
  lowConfidenceAlert,
  agentFailureAlert,
  type AlertSource,
} from "./agent-alerts";
import {
  DEPARTMENT_AGENTS,
  DEPARTMENT_CLOSE_TASK,
  ALL_DEPARTMENTS,
} from "./registry";
import type { AgentDepartment } from "./registry";

// ─── Common Agent Types ─────────────────────────────────────────────────────

export interface AgentState {
  entityId: string;
  entityName: string;
  currency: string;
  currentOperation: {
    type: string;
    status: string;
    input: Record<string, unknown>;
    output: unknown;
    error: unknown;
  } | null;
  currentTask?: {
    type: string;
    description: string;
    assignedAt: string;
    status: string;
  };
  [key: string]: unknown;
}

export interface AgentGraph {
  invoke(state: AgentState): Promise<AgentState>;
}

export interface AgentResultState extends AgentState {
  confidence: number;
  reasoning: string;
  result: unknown;
  humanResponse?: string;
  errors: string[];
  auditTrail: AuditEntry[];
}

// ─── Task Types ────────────────────────────────────────────────────────────

export type AgentTaskType =
  | "chat"
  | "question"
  | "close_trigger"
  | "review_entry"
  | "trial_balance"
  | "close_checklist"
  | "cash_position"
  | "reconciliation"
  | "daily_report"
  | "process_payroll"
  | "tax_review"
  | "filing_status"
  | "process_ap_invoice"
  | "ap_aging"
  | "ar_aging"
  | "overdue_alerts"
  | "match_payment"
  | "depreciation"
  | "asset_register"
  | "cogs"
  | "inventory_summary"
  | "report"
  | "narrative"
  | "bank_reconciliation"
  | "match_transactions"
  | "cash_count"
  | "imprest_issue"
  | "imprest_retire"
  | "cash_discrepancy"
  | "mm_reconcile"
  | "mm_ingest"
  | "mm_fee_analysis"
  | "document_ingest"
  | "document_classify"
  | "document_extract"
  | "calculate_paye"
  | "calculate_social_security"
  | "generate_payslip"
  | "process_payroll_batch"
  | "variance_analysis"
  | "budget_vs_actual"
  | "create_budget"
  | "budget_forecast"
  | "financial_ratios"
  | "kpi_dashboard"
  | "trend_analysis"
  | "cash_flow_analysis"
  | "audit_sampling"
  | "drift_analysis"
  | "independent_recomputation"
  | "anomaly_detection"
  | "submit_expense"
  | "approve_expense"
  | "reimburse_expense"
  | "expense_report"
  | "create_invoice"
  | "create_vendor"
  | "create_customer"
  | "create_journal_entry";

export type AgentTier = "tier1" | "tier2" | "tier3" | "platform";

export type AgentId =
  | "cfo"
  | "controller"
  | "treasury"
  | "payroll_manager"
  | "compliance"
  | "ledger"
  | "ap"
  | "ar"
  | "asset"
  | "inventory"
  | "reconciliation"
  | "cash"
  | "mobile_money"
  | "payroll_worker"
  | "reporting"
  | "document"
  | "budget"
  | "analytics"
  | "audit"
  | "expense";

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  entityId: string;
  entityName: string;
  currency: string;
  input: Record<string, unknown>;
  timestamp: string;
}

export interface AgentResult {
  taskId: string;
  agentId: AgentId;
  tier: AgentTier;
  confidence: number;
  reasoning: string;
  result: unknown;
  humanResponse?: string;
  errors: string[];
  auditTrail: AuditEntry[];
  duration: number;
}

// ─── Task-to-Agent Routing Table ───────────────────────────────────────────

const TASK_AGENT_MAP: Record<
  AgentTaskType,
  { agentId: AgentId; tier: AgentTier }
> = {
  // CFO Agent (tier1) — handles chat, questions, close orchestration
  chat: { agentId: "cfo", tier: "tier1" },
  question: { agentId: "cfo", tier: "tier1" },
  close_trigger: { agentId: "cfo", tier: "tier1" },

  // Controller Agent (tier2) — handles entry review, TB, close checklist
  review_entry: { agentId: "controller", tier: "tier2" },
  trial_balance: { agentId: "controller", tier: "tier2" },
  close_checklist: { agentId: "controller", tier: "tier2" },

  // Treasury Agent (tier2)
  cash_position: { agentId: "treasury", tier: "tier2" },
  reconciliation: { agentId: "treasury", tier: "tier2" },
  daily_report: { agentId: "treasury", tier: "tier2" },

  // Payroll Manager (tier2)
  process_payroll: { agentId: "payroll_manager", tier: "tier2" },

  // Compliance (tier2)
  tax_review: { agentId: "compliance", tier: "tier2" },
  filing_status: { agentId: "compliance", tier: "tier2" },

  // AP Agent (tier3)
  process_ap_invoice: { agentId: "ap", tier: "tier3" },
  ap_aging: { agentId: "ap", tier: "tier3" },

  // AR Agent (tier3)
  ar_aging: { agentId: "ar", tier: "tier3" },
  overdue_alerts: { agentId: "ar", tier: "tier3" },
  match_payment: { agentId: "ar", tier: "tier3" },

  // Asset Agent (tier3)
  depreciation: { agentId: "asset", tier: "tier3" },
  asset_register: { agentId: "asset", tier: "tier3" },

  // Inventory Agent (tier3)
  cogs: { agentId: "inventory", tier: "tier3" },
  inventory_summary: { agentId: "inventory", tier: "tier3" },

  // Reconciliation Agent (tier3)
  bank_reconciliation: { agentId: "reconciliation", tier: "tier3" },
  match_transactions: { agentId: "reconciliation", tier: "tier3" },

  // Cash Agent (tier3)
  cash_count: { agentId: "cash", tier: "tier3" },
  imprest_issue: { agentId: "cash", tier: "tier3" },
  imprest_retire: { agentId: "cash", tier: "tier3" },
  cash_discrepancy: { agentId: "cash", tier: "tier3" },

  // Mobile Money Agent (tier3)
  mm_reconcile: { agentId: "mobile_money", tier: "tier3" },
  mm_ingest: { agentId: "mobile_money", tier: "tier3" },
  mm_fee_analysis: { agentId: "mobile_money", tier: "tier3" },

  // Payroll Worker (tier3)
  calculate_paye: { agentId: "payroll_worker", tier: "tier3" },
  calculate_social_security: { agentId: "payroll_worker", tier: "tier3" },
  generate_payslip: { agentId: "payroll_worker", tier: "tier3" },
  process_payroll_batch: { agentId: "payroll_worker", tier: "tier3" },

  // Reporting (platform)
  report: { agentId: "reporting", tier: "platform" },
  narrative: { agentId: "reporting", tier: "platform" },

  // Document Agent (platform)
  document_ingest: { agentId: "document", tier: "platform" },
  document_classify: { agentId: "document", tier: "platform" },
  document_extract: { agentId: "document", tier: "platform" },

  // Budget Agent (platform)
  variance_analysis: { agentId: "budget", tier: "platform" },
  budget_vs_actual: { agentId: "budget", tier: "platform" },
  create_budget: { agentId: "budget", tier: "platform" },
  budget_forecast: { agentId: "budget", tier: "platform" },

  // Analytics Agent (platform)
  financial_ratios: { agentId: "analytics", tier: "platform" },
  kpi_dashboard: { agentId: "analytics", tier: "platform" },
  trend_analysis: { agentId: "analytics", tier: "platform" },
  cash_flow_analysis: { agentId: "analytics", tier: "platform" },

  // Audit Agent (tier3, under compliance)
  audit_sampling: { agentId: "audit", tier: "tier3" },
  drift_analysis: { agentId: "audit", tier: "tier3" },
  independent_recomputation: { agentId: "audit", tier: "tier3" },
  anomaly_detection: { agentId: "audit", tier: "tier3" },

  // Expense Agent (tier3, under treasury)
  submit_expense: { agentId: "expense", tier: "tier3" },
  approve_expense: { agentId: "expense", tier: "tier3" },
  reimburse_expense: { agentId: "expense", tier: "tier3" },
  expense_report: { agentId: "expense", tier: "tier3" },
};

// ─── Agent Invoke Map (lazy imports to avoid circular deps) ────────────────

export async function getAgentGraph(agentId: AgentId): Promise<AgentGraph> {
  switch (agentId) {
    case "cfo":
      return (await import("../tier1/cfo-agent/graph"))
        .cfoAgent as unknown as AgentGraph;
    case "controller":
      return (await import("../tier2/controller-agent/graph"))
        .controllerAgent as unknown as AgentGraph;
    case "treasury":
      return (await import("../tier2/treasury-agent/graph"))
        .treasuryAgent as unknown as AgentGraph;
    case "payroll_manager":
      return (await import("../tier2/payroll-manager-agent/graph"))
        .payrollManagerAgent as unknown as AgentGraph;
    case "compliance":
      return (await import("../tier2/compliance-agent/graph"))
        .complianceAgent as unknown as AgentGraph;
    case "ledger":
      return (await import("../tier3/ledger-agent/graph"))
        .ledgerAgent as unknown as AgentGraph;
    case "ap":
      return (await import("../tier3/ap-agent/graph"))
        .apAgent as unknown as AgentGraph;
    case "ar":
      return (await import("../tier3/ar-agent/graph"))
        .arAgent as unknown as AgentGraph;
    case "asset":
      return (await import("../tier3/asset-agent/graph"))
        .assetAgent as unknown as AgentGraph;
    case "inventory":
      return (await import("../tier3/inventory-agent/graph"))
        .inventoryAgent as unknown as AgentGraph;
    case "reconciliation":
      return (await import("../tier3/reconciliation-agent/graph"))
        .reconciliationAgent as unknown as AgentGraph;
    case "cash":
      return (await import("../tier3/cash-agent/graph"))
        .cashAgent as unknown as AgentGraph;
    case "mobile_money":
      return (await import("../tier3/mobile-money-agent/graph"))
        .mobileMoneyAgent as unknown as AgentGraph;
    case "payroll_worker":
      return (await import("../tier3/payroll-worker-agent/graph"))
        .payrollWorkerAgent as unknown as AgentGraph;
    case "reporting":
      return (await import("../platform/reporting-agent/graph"))
        .reportingAgent as unknown as AgentGraph;
    case "document":
      return (await import("../platform/document-agent/graph"))
        .documentAgent as unknown as AgentGraph;
    case "budget":
      return (await import("../platform/budget-agent/graph"))
        .budgetAgent as unknown as AgentGraph;
    case "analytics":
      return (await import("../platform/analytics-agent/graph"))
        .analyticsAgent as unknown as AgentGraph;
    case "audit":
      return (await import("../tier3/audit-agent/graph"))
        .auditAgent as unknown as AgentGraph;
    case "expense":
      return (await import("../tier3/expense-agent/graph"))
        .expenseAgent as unknown as AgentGraph;
  }
}

// ─── Task Type → Agent Operation Mapping ──────────────────────────────────
//
// The registry exposes public task types (submit_expense, audit_sampling, …)
// while each agent graph routes on its own internal operation vocabulary
// (extract_receipt, sample_transactions, …). Map the public task types to the
// agent ops so every registered task routes to real agent work. Unknown task
// types pass through unchanged (agents that share vocabulary — analytics,
// budget, document — are unaffected).

const TASK_TYPE_TO_AGENT_OP: Record<string, string> = {
  // Audit Agent
  audit_sampling: "sample_transactions",
  drift_analysis: "detect_pattern_deviations",
  independent_recomputation: "independent_recomputation",
  anomaly_detection: "anomaly_detection",
  // Expense Agent
  submit_expense: "extract_receipt",
  approve_expense: "check_policy_compliance",
  reimburse_expense: "route_for_approval",
  expense_report: "expense_report",
};

// ─── Orchestrator ──────────────────────────────────────────────────────────

export interface OrchestrateParams {
  taskType: AgentTaskType;
  entityId: string;
  entityName: string;
  currency: string;
  input: Record<string, unknown>;
  /** Optional — the user who triggered this agent run. Used for alert delivery. */
  userId?: string;
  /** Optional — chat conversation this run belongs to (task-as-session link). */
  conversationId?: string;
}

export async function orchestrate(
  params: OrchestrateParams,
): Promise<AgentResult> {
  const startTime = Date.now();
  const taskId = crypto.randomUUID();

  // ─── Security guard: entityId is required ──────────────────────────
  if (!params.entityId) {
    return {
      taskId,
      agentId: "cfo",
      tier: "tier1",
      confidence: 0,
      reasoning: "entityId is required",
      result: null,
      errors: ["entityId is required for all agent operations"],
      auditTrail: [],
      duration: Date.now() - startTime,
    };
  }

  const trace = await langfuse.trace({
    name: "agent-orchestrator",
    metadata: {
      taskId,
      taskType: params.taskType,
      entityId: params.entityId,
    },
  });

  const routing = TASK_AGENT_MAP[params.taskType];
  if (!routing) {
    return {
      taskId,
      agentId: "cfo",
      tier: "tier1",
      confidence: 0,
      reasoning: `Unknown task type: ${params.taskType}`,
      result: null,
      errors: [`Unknown task type: ${params.taskType}`],
      auditTrail: [],
      duration: Date.now() - startTime,
    };
  }
  const { agentId, tier } = routing;

  // ─── Security guard: agent tier authorization ─────────────────────
  // TASK_AGENT_MAP is the authorization source of truth: every registered
  // task type is bound to exactly one agent with a fixed tier, so reaching
  // this point means the task type is authorized for this agent. Fail closed
  // if the resolved agent is unknown (registry typo) — never silently
  // invoke an untiered agent. (Model-tier enforcement for LLM calls is a
  // separate concern, applied in the model layer via isTaskTypeAllowedForAgent
  // with model task types at callModel time.)
  let agentTier: ReturnType<typeof getAgentTier>;
  try {
    agentTier = getAgentTier(agentId);
  } catch {
    return {
      taskId,
      agentId,
      tier,
      confidence: 0,
      reasoning: `Agent ${agentId} is not a recognized agent`,
      result: null,
      errors: [`Unknown agent: ${agentId}`],
      auditTrail: [],
      duration: Date.now() - startTime,
    };
  }
  void agentTier;

  try {
    const graph = await getAgentGraph(agentId);

    const initialState: AgentState = {
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      currentOperation: {
        type: TASK_TYPE_TO_AGENT_OP[params.taskType] ?? params.taskType,
        status: "processing",
        input: params.input,
        output: null,
        error: null,
      },
    };

    if (agentId === "cfo") {
      initialState.currentTask = {
        type:
          params.taskType === "chat" || params.taskType === "question"
            ? params.taskType
            : params.taskType === "close_trigger"
              ? "close_trigger"
              : "instruction",
        description:
          (params.input.description as string) ?? JSON.stringify(params.input),
        assignedAt: new Date().toISOString(),
        status: "in_progress",
      };
      initialState.currentOperation = null;
    }

    const result = (await graph.invoke(initialState)) as AgentResultState;

    const agentResult: AgentResult = {
      taskId,
      agentId,
      tier,
      confidence: result.confidence ?? 0,
      reasoning: result.reasoning ?? "",
      result: result.result ?? null,
      humanResponse: result.humanResponse ?? undefined,
      errors: result.errors ?? [],
      auditTrail: result.auditTrail ?? [],
      duration: Date.now() - startTime,
    };

    await trace.update({
      output: {
        agentId,
        confidence: agentResult.confidence,
        duration: agentResult.duration,
        hasErrors: agentResult.errors.length > 0,
      },
    });

    // §8.2: persist the run for execution history + cost tracking.
    await persistAgentRun({
      taskId,
      agentId,
      agentDisplayName: agentId.replace(/_/g, " "),
      entityId: params.entityId,
      status: agentResult.errors.length > 0 ? "failed" : "completed",
      durationMs: agentResult.duration,
      error:
        agentResult.errors.length > 0 ? agentResult.errors.join("; ") : null,
      conversationId: params.conversationId,
      metadata: {
        taskType: params.taskType,
        confidence: agentResult.confidence,
        reasoning: agentResult.reasoning,
      },
    });

    // §16.2: proactive alert emission — fire-and-forget. Agents that finish
    // with low confidence or errors generate alerts that surface in the
    // Activity Hub so humans see what needs attention without polling.
    if (params.userId) {
      if (agentResult.confidence < 0.7 && agentResult.confidence > 0) {
        void emitAgentAlert(
          lowConfidenceAlert({
            entityId: params.entityId,
            userId: params.userId,
            agentId,
            taskType: params.taskType,
            confidence: agentResult.confidence,
            reasoning: agentResult.reasoning,
          }),
        );
      }
      if (agentResult.errors.length > 0) {
        void emitAgentAlert(
          agentFailureAlert({
            entityId: params.entityId,
            userId: params.userId,
            agentId,
            taskType: params.taskType,
            error: agentResult.errors.join("; "),
            durationMs: agentResult.duration,
          }),
        );
      }
    }

    return agentResult;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await trace.update({
      output: { error: msg, agentId },
      metadata: { status: "error" },
    });

    // §8.2: persist failed runs too — the monitor must show what broke.
    await persistAgentRun({
      taskId,
      agentId,
      agentDisplayName: agentId.replace(/_/g, " "),
      entityId: params.entityId,
      status: "failed",
      error: msg,
      conversationId: params.conversationId,
      metadata: { taskType: params.taskType },
    });

    // §4.7 — Report agent failure to Sentry for observability.
    // Fire-and-forget: don't block the error response on Sentry.
    void reportAgentError(error, {
      agentId,
      entityId: params.entityId,
      taskType: params.taskType,
      action: `Agent ${agentId} failed during ${params.taskType}`,
    });

    // §16.2: emit critical alert on agent failure — fire-and-forget
    if (params.userId) {
      void emitAgentAlert(
        agentFailureAlert({
          entityId: params.entityId,
          userId: params.userId,
          agentId,
          taskType: params.taskType,
          error: msg,
          durationMs: Date.now() - startTime,
        }),
      );
    }

    return {
      taskId,
      agentId,
      tier,
      confidence: 0,
      reasoning: `Agent error: ${msg}`,
      result: null,
      errors: [msg],
      auditTrail: [
        createAuditEntry({
          agentId: "orchestrator",
          action: "agent_error",
          details: { agentId, error: msg },
          confidence: 0,
        }),
      ],
      duration: Date.now() - startTime,
    };
  }
}

// ─── Run Persistence (§8.2) ───────────────────────────────────────────────
//
// Every orchestrate() call persists a run record to ops_live_runs so the
// agent-monitor dashboard and SSE live-updates have real execution history
// (previously the table had NO writers — the UI polled an empty table).
// Fire-and-forget: persistence failures must never fail the agent run.

export async function persistAgentRun(params: {
  taskId: string;
  agentId: string;
  agentDisplayName: string;
  entityId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress?: number;
  durationMs?: number;
  error?: string | null;
  metadata?: Record<string, unknown>;
  /** Chat conversation this run belongs to (task-as-session link). */
  conversationId?: string;
}): Promise<void> {
  try {
    await db.insert(opsLiveRuns).values({
      runId: `RUN-${params.taskId.toUpperCase()}`,
      agentName: params.agentId,
      agentDisplayName: params.agentDisplayName,
      agentCategory: params.agentId.split("_")[0] ?? params.agentId,
      entityId: params.entityId,
      // Written to the column when migrated; mirrored into metadata so
      // task→conversation linking works even before migration 0039 lands.
      conversationId: params.conversationId ?? null,
      status: params.status,
      progress:
        params.progress ??
        (params.status === "completed"
          ? 100
          : params.status === "failed"
            ? 100
            : 0),
      durationMs: params.durationMs ?? 0,
      completedAt:
        params.status === "completed" || params.status === "failed"
          ? new Date()
          : undefined,
      error: params.error ?? null,
      metadata: {
        ...(params.metadata ?? {}),
        ...(params.conversationId
          ? { conversationId: params.conversationId }
          : {}),
      },
    });
  } catch {
    // Best effort — observability must never break agent execution.
  }
}

// ─── Convenience Functions ─────────────────────────────────────────────────

export function classifyUserMessage(message: string): AgentTaskType {
  const lower = message.toLowerCase().trim();

  if (
    /^(close|month.end|period.end)/.test(lower) &&
    /close|run|process/.test(lower)
  ) {
    return "close_trigger";
  }
  if (/what|how|when|show|give me|tell me|list|report|summary/.test(lower)) {
    return "question";
  }
  if (/payroll|salary|wage/.test(lower)) return "process_payroll";
  if (/tax|vat|filing|compliance/.test(lower)) return "tax_review";
  if (/cash|bank|balance|reconcil/.test(lower)) return "cash_position";
  if (/ap|payable|supplier|invoice.*in/.test(lower)) return "ap_aging";
  if (/ar|receivable|customer|invoice.*out/.test(lower)) return "ar_aging";
  if (/depreciat|asset/.test(lower)) return "depreciation";
  if (/inventory|stock|cogs/.test(lower)) return "inventory_summary";
  if (
    /p&l|profit.*loss|income.*statement|balance.*sheet|cash.*flow/.test(lower)
  )
    return "report";
  if (/narrative|summary|explain|plain.*english/.test(lower))
    return "narrative";

  return "chat";
}

// ─── Confidence Escalation ──────────────────────────────────────────────────
//
// Implements the Confidence Threshold System from the Agent Workforce spec
// (Section 4.2). Threshold alignment:
//   ≥ 0.90  → auto-complete (proceed)
//   0.70–0.89 → auto-complete but flagged amber (escalate_to_supervisor)
//   < 0.70  → does not auto-complete, requires human resolution
//
// Dollar-threshold override: any transaction above the configured amount
// requires human approval regardless of confidence score.
// Close operations always require human approval.
// ---------------------------------------------------------------------------

export type EscalationAction =
  "proceed" | "escalate_to_supervisor" | "escalate_to_human";

export interface EscalationParams {
  result: AgentResult;
  /**
   * If set and the transaction amount exceeds this value,
   * force escalate to human regardless of confidence.
   * Corresponds to the "dollar threshold for human approval" from the spec.
   */
  transactionAmount?: number;
  dollarThreshold?: number;
  /**
   * If true, this action always requires human approval (e.g., close sign-off,
   * CFO agent escalations, strategic decisions). Per spec Section 4.2:
   * "CFO Agent escalations and month-end close sign-off always require
   * human approval regardless of confidence score."
   */
  requiresHumanApproval?: boolean;
}

export function checkEscalation(params: EscalationParams): {
  action: EscalationAction;
  reason: string;
} {
  const { result, transactionAmount, dollarThreshold, requiresHumanApproval } =
    params;

  // Hard rule: close sign-off and CFO escalations always go to human
  if (requiresHumanApproval) {
    return {
      action: "escalate_to_human",
      reason:
        "This action always requires human approval (close sign-off or strategic escalation)",
    };
  }

  // Dollar-threshold override: any transaction above the configured amount
  // requires human approval, regardless of AI confidence.
  if (
    dollarThreshold !== undefined &&
    transactionAmount !== undefined &&
    transactionAmount > dollarThreshold
  ) {
    return {
      action: "escalate_to_human",
      reason: `Transaction amount ${transactionAmount} exceeds dollar threshold ${dollarThreshold}. Human approval required.`,
    };
  }

  // Spec thresholds (Section 4.2)
  if (result.confidence >= 0.9) {
    return { action: "proceed", reason: "High confidence — auto-completing" };
  }
  if (result.confidence >= 0.7) {
    return {
      action: "escalate_to_supervisor",
      reason:
        result.reasoning ||
        `Confidence ${result.confidence.toFixed(2)} below 0.9, flagged amber for review`,
    };
  }
  return {
    action: "escalate_to_human",
    reason:
      result.reasoning ||
      `Confidence ${result.confidence.toFixed(2)} below 0.7, requires human resolution`,
  };
}

// ─── Department Fan-Out ─────────────────────────────────────────────────────

export type DepartmentResult = {
  department: AgentDepartment;
  agentId: AgentId;
  confidence: number;
  reasoning: string;
  confirmed: boolean;
  summary: string;
  errors: string[];
};

export async function fanOutToDepartments(params: {
  entityId: string;
  entityName: string;
  currency: string;
  departments: Array<{
    department: AgentDepartment;
    taskType: AgentTaskType;
    input: Record<string, unknown>;
  }>;
}): Promise<DepartmentResult[]> {
  const trace = await langfuse.trace({
    name: "fan-out-departments",
    metadata: {
      entityId: params.entityId,
      departmentCount: params.departments.length,
      departments: params.departments.map((d) => d.department),
    },
  });

  const results = await Promise.allSettled(
    params.departments.map(async (dept) => {
      const agentId = DEPARTMENT_AGENTS[dept.department];
      const graph = await getAgentGraph(agentId);

      const initialState: AgentState = {
        entityId: params.entityId,
        entityName: params.entityName,
        currency: params.currency,
        currentOperation: {
          type: dept.taskType,
          status: "processing",
          input: dept.input,
          output: null,
          error: null,
        },
      };

      const result = (await graph.invoke(initialState)) as AgentResultState;

      return {
        department: dept.department,
        agentId,
        confidence: result.confidence ?? 0,
        reasoning: result.reasoning ?? "",
        confirmed: (result.confidence ?? 0) >= 0.9,
        summary: result.humanResponse ?? (result.result as string) ?? "",
        errors: result.errors ?? [],
      };
    }),
  );

  const departmentResults: DepartmentResult[] = params.departments.map(
    (dept, i) => {
      const settled = results[i];
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      // Rejected — department agent failed
      const agentId = DEPARTMENT_AGENTS[dept.department];
      const errorMsg =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);

      langfuse.event({
        name: "department-fanout-error",
        metadata: {
          department: dept.department,
          agentId,
          error: errorMsg,
        },
      });

      return {
        department: dept.department,
        agentId,
        confidence: 0,
        reasoning: `Agent failed: ${errorMsg}`,
        confirmed: false,
        summary: `Error: ${errorMsg}`,
        errors: [errorMsg],
      };
    },
  );

  await trace.update({
    output: {
      results: departmentResults.map((r) => ({
        department: r.department,
        confidence: r.confidence,
        confirmed: r.confirmed,
        errors: r.errors,
      })),
    },
  });

  return departmentResults;
}

// ─── Hierarchical Orchestration ─────────────────────────────────────────────

export async function orchestrateHierarchical(
  params: OrchestrateParams,
): Promise<AgentResult> {
  const startTime = Date.now();
  const taskId = crypto.randomUUID();

  const trace = await langfuse.trace({
    name: "agent-orchestrator-hierarchical",
    metadata: {
      taskId,
      taskType: params.taskType,
      entityId: params.entityId,
      mode: "hierarchical",
    },
  });

  try {
    // ── Route 1: Chat / Question → CFO directly ──────────────────────────
    if (params.taskType === "chat" || params.taskType === "question") {
      const result = await orchestrate({ ...params });
      await trace.update({
        output: {
          route: "cfo_direct",
          agentId: result.agentId,
          confidence: result.confidence,
        },
      });
      return result;
    }

    // ── Route 2: Close trigger → CFO + fan-out + evaluate ────────────────
    if (params.taskType === "close_trigger") {
      return await orchestrateClose(taskId, trace, params, startTime);
    }

    // ── Route 3: Direct department task → invoke target agent ─────────────
    const routing = TASK_AGENT_MAP[params.taskType];
    if (routing) {
      const result = await orchestrate({ ...params });

      // Dollar threshold from input (e.g., invoice amounts)
      const transactionAmount = params.input.amount as number | undefined;
      const dollarThreshold = params.input.dollarThreshold as
        number | undefined;

      // Close-related tasks always require human approval
      const requiresHumanApproval = [
        "close_trigger",
        "close_checklist",
      ].includes(params.taskType);

      const escalation = checkEscalation({
        result,
        transactionAmount,
        dollarThreshold,
        requiresHumanApproval,
      });

      await trace.update({
        output: {
          route: "direct",
          agentId: result.agentId,
          confidence: result.confidence,
          escalation: escalation.action,
        },
      });

      // Attach escalation info to result
      if (escalation.action !== "proceed") {
        return {
          ...result,
          reasoning: `${result.reasoning} [ESCALATION: ${escalation.reason}]`,
        };
      }

      return result;
    }

    // ── Unknown task type ────────────────────────────────────────────────
    return {
      taskId,
      agentId: "cfo",
      tier: "tier1",
      confidence: 0,
      reasoning: `Unknown task type: ${params.taskType}`,
      result: null,
      errors: [`Unknown task type: ${params.taskType}`],
      auditTrail: [],
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await trace.update({
      output: { error: msg },
      metadata: { status: "error" },
    });

    // §4.7 — Report orchestration-level failure to Sentry
    void reportAgentError(error, {
      agentId: "orchestrator",
      entityId: params.entityId,
      taskType: params.taskType,
      action: `Orchestration failed for ${params.taskType}`,
    });

    return {
      taskId,
      agentId: "cfo",
      tier: "tier1",
      confidence: 0,
      reasoning: `Hierarchical orchestration error: ${msg}`,
      result: null,
      errors: [msg],
      auditTrail: [
        createAuditEntry({
          agentId: "orchestrator",
          action: "hierarchical_error",
          details: { error: msg, taskType: params.taskType },
          confidence: 0,
        }),
      ],
      duration: Date.now() - startTime,
    };
  }
}

// ─── Close Orchestration (Private) ──────────────────────────────────────────

async function orchestrateClose(
  taskId: string,
  trace: Awaited<ReturnType<typeof langfuse.trace>>,
  params: OrchestrateParams,
  startTime: number,
): Promise<AgentResult> {
  // Step 1: Invoke CFO to initiate close
  const cfoGraph = await getAgentGraph("cfo");
  const cfoInitialState: AgentState = {
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    currentTask: {
      type: "close_trigger",
      description:
        (params.input.description as string) ??
        `Close ${(params.input.period as string) ?? "current period"}`,
      assignedAt: new Date().toISOString(),
      status: "in_progress",
    },
    currentOperation: null,
  };

  const cfoInitResult = (await cfoGraph.invoke(
    cfoInitialState,
  )) as AgentResultState;
  const cfoInit = cfoInitResult;

  // Step 2: Fan-out to all 4 department heads in parallel
  const period =
    (params.input.period as string) ??
    (cfoInit.closeState as { period?: string } | null)?.period ??
    "current period";

  const deptResults = await fanOutToDepartments({
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    departments: ALL_DEPARTMENTS.map((dept) => ({
      department: dept,
      taskType: DEPARTMENT_CLOSE_TASK[dept],
      input: { period, closeTrigger: true },
    })),
  });

  // Step 3: Evaluate readiness
  const confirmed = deptResults.filter((r) => r.confirmed);
  const notConfirmed = deptResults.filter((r) => !r.confirmed);
  const allConfirmed = confirmed.length === ALL_DEPARTMENTS.length;
  const avgConfidence =
    deptResults.reduce((sum, r) => sum + r.confidence, 0) / deptResults.length;

  // Step 4: Build human-readable summary
  const summaryLines = deptResults.map((r) => {
    const status = r.confirmed ? "CONFIRMED" : "NOT CONFIRMED";
    return `${r.department}: ${status} (confidence: ${r.confidence.toFixed(2)}) — ${r.summary || r.reasoning}`;
  });

  const humanResponse = allConfirmed
    ? `All departments confirmed for ${period}. Ready to close.\n\n${summaryLines.join("\n")}`
    : `Close for ${period} has issues.\n\n${summaryLines.join("\n")}\n\nBlocking: ${notConfirmed.map((r) => r.department).join(", ")}`;

  await trace.update({
    output: {
      route: "close",
      period,
      allConfirmed,
      confirmedCount: confirmed.length,
      totalCount: ALL_DEPARTMENTS.length,
      avgConfidence,
      departmentResults: deptResults.map((r) => ({
        department: r.department,
        confidence: r.confidence,
        confirmed: r.confirmed,
      })),
    },
  });

  return {
    taskId,
    agentId: "cfo",
    tier: "tier1",
    confidence: avgConfidence,
    reasoning: allConfirmed
      ? `All ${confirmed.length} departments confirmed for ${period}`
      : `${notConfirmed.length} of ${ALL_DEPARTMENTS.length} departments not confirmed for ${period}`,
    result: {
      type: "close_evaluation",
      period,
      allConfirmed,
      departmentResults: deptResults,
    },
    humanResponse,
    errors: deptResults.flatMap((r) => r.errors),
    auditTrail: [
      createAuditEntry({
        agentId: "orchestrator",
        action: "close_fanout_complete",
        details: {
          period,
          allConfirmed,
          confirmedCount: confirmed.length,
          avgConfidence,
        },
        confidence: avgConfidence,
      }),
    ],
    duration: Date.now() - startTime,
  };
}
