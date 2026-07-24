import type { AgentId, AgentTier, AgentTaskType } from "./orchestrator";

// ─── Department Types ────────────────────────────────────────────────────────

export type AgentDepartment =
  "controller" | "treasury" | "payroll_manager" | "compliance";

// ─── Agent Metadata ─────────────────────────────────────────────────────────

type AgentMetadata = {
  agentId: AgentId;
  tier: AgentTier;
  department: AgentDepartment | null;
  taskTypes: AgentTaskType[];
};

export const AGENT_REGISTRY: Record<AgentId, AgentMetadata> = {
  cfo: {
    agentId: "cfo",
    tier: "tier1",
    department: null,
    taskTypes: ["chat", "question", "close_trigger"],
  },
  controller: {
    agentId: "controller",
    tier: "tier2",
    department: "controller",
    taskTypes: ["review_entry", "trial_balance", "close_checklist"],
  },
  treasury: {
    agentId: "treasury",
    tier: "tier2",
    department: "treasury",
    taskTypes: ["cash_position", "reconciliation", "daily_report"],
  },
  payroll_manager: {
    agentId: "payroll_manager",
    tier: "tier2",
    department: "payroll_manager",
    taskTypes: ["process_payroll"],
  },
  compliance: {
    agentId: "compliance",
    tier: "tier2",
    department: "compliance",
    taskTypes: ["tax_review", "filing_status"],
  },
  ledger: {
    agentId: "ledger",
    tier: "tier3",
    department: null,
    taskTypes: [],
  },
  ap: {
    agentId: "ap",
    tier: "tier3",
    department: null,
    taskTypes: ["process_ap_invoice", "ap_aging"],
  },
  ar: {
    agentId: "ar",
    tier: "tier3",
    department: null,
    taskTypes: ["ar_aging", "overdue_alerts", "match_payment"],
  },
  asset: {
    agentId: "asset",
    tier: "tier3",
    department: null,
    taskTypes: ["depreciation", "asset_register"],
  },
  inventory: {
    agentId: "inventory",
    tier: "tier3",
    department: null,
    taskTypes: ["cogs", "inventory_summary"],
  },
  reconciliation: {
    agentId: "reconciliation",
    tier: "tier3",
    department: "treasury",
    taskTypes: ["bank_reconciliation", "match_transactions"],
  },
  cash: {
    agentId: "cash",
    tier: "tier3",
    department: "treasury",
    taskTypes: [
      "cash_count",
      "imprest_issue",
      "imprest_retire",
      "cash_discrepancy",
    ],
  },
  mobile_money: {
    agentId: "mobile_money",
    tier: "tier3",
    department: "treasury",
    taskTypes: ["mm_reconcile", "mm_ingest", "mm_fee_analysis"],
  },
  payroll_worker: {
    agentId: "payroll_worker",
    tier: "tier3",
    department: "payroll_manager",
    taskTypes: [
      "calculate_paye",
      "calculate_social_security",
      "generate_payslip",
      "process_payroll_batch",
    ],
  },
  reporting: {
    agentId: "reporting",
    tier: "platform",
    department: null,
    taskTypes: ["report", "narrative"],
  },
  document: {
    agentId: "document",
    tier: "platform",
    department: null,
    taskTypes: ["document_ingest", "document_classify", "document_extract"],
  },
  budget: {
    agentId: "budget",
    tier: "platform",
    department: null,
    taskTypes: [
      "variance_analysis",
      "budget_vs_actual",
      "create_budget",
      "budget_forecast",
    ],
  },
  analytics: {
    agentId: "analytics",
    tier: "platform",
    department: null,
    taskTypes: [
      "financial_ratios",
      "kpi_dashboard",
      "trend_analysis",
      "cash_flow_analysis",
    ],
  },
  audit: {
    agentId: "audit",
    tier: "tier3",
    department: "compliance",
    taskTypes: [
      "audit_sampling",
      "drift_analysis",
      "independent_recomputation",
      "anomaly_detection",
    ],
  },
};

// ─── Reverse Lookups ─────────────────────────────────────────────────────────

/** Maps taskType → agentId for direct dispatch */
export const TASK_TO_AGENT: Record<string, AgentId> = Object.entries(
  AGENT_REGISTRY,
)
  .flatMap(([id, meta]) =>
    meta.taskTypes.map((t): [string, AgentId] => [t, id as AgentId]),
  )
  .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, AgentId>);

/** Maps department name → agentId for hierarchical dispatch */
export const DEPARTMENT_AGENTS: Record<AgentDepartment, AgentId> = {
  controller: "controller",
  treasury: "treasury",
  payroll_manager: "payroll_manager",
  compliance: "compliance",
};

/** Maps department → taskType used during month-end close */
export const DEPARTMENT_CLOSE_TASK: Record<AgentDepartment, AgentTaskType> = {
  controller: "close_checklist",
  treasury: "daily_report",
  payroll_manager: "process_payroll",
  compliance: "filing_status",
};

/** All departments in the hierarchy (used for fan-out) */
export const ALL_DEPARTMENTS: AgentDepartment[] = [
  "controller",
  "treasury",
  "payroll_manager",
  "compliance",
];
