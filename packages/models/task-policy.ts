import type { TaskType } from "./types";

// ─── Agent Tier Definitions ─────────────────────

export type AgentTierLevel = "strategic" | "management" | "worker" | "platform";

const AGENT_TIER_MAP: Record<string, AgentTierLevel> = {
  cfo: "strategic",
  controller: "management",
  treasury: "management",
  payroll_manager: "management",
  compliance: "management",
  ledger: "worker",
  ap: "worker",
  ar: "worker",
  asset: "worker",
  inventory: "worker",
  reconciliation: "worker",
  cash: "worker",
  mobile_money: "worker",
  payroll_worker: "worker",
  audit: "worker",
  expense: "worker",
  reporting: "platform",
  document: "platform",
  budget: "platform",
  analytics: "platform",
};

/** Task types that require strategic (tier1) models */
const STRATEGIC_TASKS: TaskType[] = [
  "strategic_planning",
  "financial_analysis",
  "executive_summary",
  "risk_assessment",
];

/** Task types that require management (tier2) models */
const MANAGEMENT_TASKS: TaskType[] = [
  "approval_decision",
  "cash_flow_forecast",
  "compliance_check",
  "reconciliation_review",
];

/** Task types that can use worker (tier3) models */
const WORKER_TASKS: TaskType[] = [
  "invoice_matching",
  "payment_scheduling",
  "journal_posting",
  "cash_reconciliation",
  "tax_calculation",
  "filing_preparation",
  "report_generation",
  "payroll_calculation",
];

/** Task types that can use platform models */
const PLATFORM_TASKS: TaskType[] = [
  "ocr_field_extraction",
  "document_classification",
  "structured_extraction",
  "budget_variance_analysis",
  "anomaly_detection",
];

/** Generic task types anyone can use */
const GENERIC_TASKS: TaskType[] = [
  "chat_response",
  "summarization",
  "translation",
];

/**
 * Validate that an agent name is recognized and has a tier assigned.
 */
export function getAgentTier(agentName: string): AgentTierLevel {
  const tier = AGENT_TIER_MAP[agentName];
  if (!tier) {
    throw new Error(
      `Unknown agent: ${agentName}. Cannot determine security tier.`,
    );
  }
  return tier;
}

/**
 * Check if an agent is allowed to use a specific model task type.
 * Enforces tier-based model access:
 *   - Worker agents cannot use strategic or management models
 *   - Platform agents can only use platform/generic models
 *   - Management agents can use management, worker, and generic models
 *   - Strategic agents (CFO) can use any model
 */
export function isTaskTypeAllowedForAgent(
  agentName: string,
  taskType: TaskType | string,
): { allowed: boolean; reason?: string } {
  const tier = getAgentTier(agentName);
  const tt = taskType as TaskType;

  // Generic tasks are always allowed
  if (GENERIC_TASKS.includes(tt)) {
    return { allowed: true };
  }

  switch (tier) {
    case "strategic":
      // CFO can do anything
      return { allowed: true };

    case "management":
      if (STRATEGIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Management agent ${agentName} cannot use strategic task ${taskType}`,
        };
      }
      return { allowed: true };

    case "worker":
      if (STRATEGIC_TASKS.includes(tt) || MANAGEMENT_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Worker agent ${agentName} cannot use strategic or management task ${taskType}`,
        };
      }
      if (!WORKER_TASKS.includes(tt) && !GENERIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Worker agent ${agentName} cannot use platform task ${taskType}`,
        };
      }
      return { allowed: true };

    case "platform":
      if (!PLATFORM_TASKS.includes(tt) && !GENERIC_TASKS.includes(tt)) {
        return {
          allowed: false,
          reason: `Platform agent ${agentName} can only use platform/generic tasks, not ${taskType}`,
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: `Unknown agent tier: ${tier}` };
  }
}
