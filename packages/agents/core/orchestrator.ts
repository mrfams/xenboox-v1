import { langfuse } from "./langfuse"
import { createAuditEntry } from "./state"
import type { AuditEntry } from "./state"
import {
  DEPARTMENT_AGENTS,
  DEPARTMENT_CLOSE_TASK,
  ALL_DEPARTMENTS,
} from "./registry"
import type { AgentDepartment } from "./registry"

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

export type AgentTier = "tier1" | "tier2" | "tier3" | "platform"

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

export interface AgentTask {
  id: string
  type: AgentTaskType
  entityId: string
  entityName: string
  currency: string
  input: Record<string, unknown>
  timestamp: string
}

export interface AgentResult {
  taskId: string
  agentId: AgentId
  tier: AgentTier
  confidence: number
  reasoning: string
  result: unknown
  humanResponse?: string
  errors: string[]
  auditTrail: AuditEntry[]
  duration: number
}

// ─── Task-to-Agent Routing Table ───────────────────────────────────────────

const TASK_AGENT_MAP: Record<AgentTaskType, { agentId: AgentId; tier: AgentTier }> = {
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
}

// ─── Agent Invoke Map (lazy imports to avoid circular deps) ────────────────

export async function getAgentGraph(agentId: AgentId) {
  switch (agentId) {
    case "cfo":
      return (await import("../tier1/cfo-agent/graph")).cfoAgent
    case "controller":
      return (await import("../tier2/controller-agent/graph")).controllerAgent
    case "treasury":
      return (await import("../tier2/treasury-agent/graph")).treasuryAgent
    case "payroll_manager":
      return (await import("../tier2/payroll-manager-agent/graph")).payrollManagerAgent
    case "compliance":
      return (await import("../tier2/compliance-agent/graph")).complianceAgent
    case "ledger":
      return (await import("../tier3/ledger-agent/graph")).ledgerAgent
    case "ap":
      return (await import("../tier3/ap-agent/graph")).apAgent
    case "ar":
      return (await import("../tier3/ar-agent/graph")).arAgent
    case "asset":
      return (await import("../tier3/asset-agent/graph")).assetAgent
    case "inventory":
      return (await import("../tier3/inventory-agent/graph")).inventoryAgent
    case "reconciliation":
      return (await import("../tier3/reconciliation-agent/graph")).reconciliationAgent
    case "cash":
      return (await import("../tier3/cash-agent/graph")).cashAgent
    case "mobile_money":
      return (await import("../tier3/mobile-money-agent/graph")).mobileMoneyAgent
    case "payroll_worker":
      return (await import("../tier3/payroll-worker-agent/graph")).payrollWorkerAgent
    case "reporting":
      return (await import("../platform/reporting-agent/graph")).reportingAgent
    case "document":
      return (await import("../platform/document-agent/graph")).documentAgent
    case "budget":
      return (await import("../platform/budget-agent/graph")).budgetAgent
    case "analytics":
      return (await import("../platform/analytics-agent/graph")).analyticsAgent
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

export interface OrchestrateParams {
  taskType: AgentTaskType
  entityId: string
  entityName: string
  currency: string
  input: Record<string, unknown>
}

export async function orchestrate(params: OrchestrateParams): Promise<AgentResult> {
  const startTime = Date.now()
  const taskId = crypto.randomUUID()

  const trace = await langfuse.trace({
    name: "agent-orchestrator",
    metadata: {
      taskId,
      taskType: params.taskType,
      entityId: params.entityId,
    },
  })

  const routing = TASK_AGENT_MAP[params.taskType]
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
    }
  }

  const { agentId, tier } = routing

  try {
    const graph = await getAgentGraph(agentId) as any

    // Build initial state for the agent
    const initialState: Record<string, unknown> = {
      entityId: params.entityId,
      entityName: params.entityName,
      currency: params.currency,
      currentOperation: {
        type: params.taskType,
        status: "processing",
        input: params.input,
        output: null,
        error: null,
      },
    }

    // For CFO agent, use currentTask instead of currentOperation
    if (agentId === "cfo") {
      initialState.currentTask = {
        type: params.taskType === "chat" || params.taskType === "question"
          ? params.taskType
          : params.taskType === "close_trigger"
            ? "close_trigger"
            : "instruction",
        description: params.input.description as string ?? JSON.stringify(params.input),
        assignedAt: new Date().toISOString(),
        status: "in_progress",
      }
      initialState.currentOperation = null
    }

    const result = await graph.invoke(initialState)

    const agentResult: AgentResult = {
      taskId,
      agentId,
      tier,
      confidence: (result as any).confidence ?? 0,
      reasoning: (result as any).reasoning ?? "",
      result: (result as any).result ?? null,
      humanResponse: (result as any).humanResponse ?? undefined,
      errors: (result as any).errors ?? [],
      auditTrail: (result as any).auditTrail ?? [],
      duration: Date.now() - startTime,
    }

    await trace.update({
      output: {
        agentId,
        confidence: agentResult.confidence,
        duration: agentResult.duration,
        hasErrors: agentResult.errors.length > 0,
      },
    })

    return agentResult
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    await trace.update({
      output: { error: msg, agentId },
      metadata: { status: "error" },
    })

    return {
      taskId,
      agentId,
      tier,
      confidence: 0,
      reasoning: `Agent error: ${msg}`,
      result: null,
      errors: [msg],
      auditTrail: [createAuditEntry({
        agentId: "orchestrator",
        action: "agent_error",
        details: { agentId, error: msg },
        confidence: 0,
      })],
      duration: Date.now() - startTime,
    }
  }
}

// ─── Convenience Functions ─────────────────────────────────────────────────

export function classifyUserMessage(message: string): AgentTaskType {
  const lower = message.toLowerCase().trim()

  if (/^(close|month.end|period.end)/.test(lower) && /close|run|process/.test(lower)) {
    return "close_trigger"
  }
  if (/what|how|when|show|give me|tell me|list|report|summary/.test(lower)) {
    return "question"
  }
  if (/payroll|salary|wage/.test(lower)) return "process_payroll"
  if (/tax|vat|filing|compliance/.test(lower)) return "tax_review"
  if (/cash|bank|balance|reconcil/.test(lower)) return "cash_position"
  if (/ap|payable|supplier|invoice.*in/.test(lower)) return "ap_aging"
  if (/ar|receivable|customer|invoice.*out/.test(lower)) return "ar_aging"
  if (/depreciat|asset/.test(lower)) return "depreciation"
  if (/inventory|stock|cogs/.test(lower)) return "inventory_summary"
  if (/p&l|profit.*loss|income.*statement|balance.*sheet|cash.*flow/.test(lower)) return "report"
  if (/narrative|summary|explain|plain.*english/.test(lower)) return "narrative"

  return "chat"
}

// ─── Confidence Escalation ──────────────────────────────────────────────────

export type EscalationAction =
  | "proceed"
  | "escalate_to_supervisor"
  | "escalate_to_human"

export function checkEscalation(result: AgentResult): {
  action: EscalationAction
  reason: string
} {
  if (result.confidence >= 0.8) {
    return { action: "proceed", reason: "Confidence above threshold" }
  }
  if (result.confidence >= 0.6) {
    return {
      action: "escalate_to_supervisor",
      reason: result.reasoning || "Confidence below 0.8, escalating to supervisor",
    }
  }
  return {
    action: "escalate_to_human",
    reason: result.reasoning || "Confidence below 0.6, escalating to human",
  }
}

// ─── Department Fan-Out ─────────────────────────────────────────────────────

export type DepartmentResult = {
  department: AgentDepartment
  agentId: AgentId
  confidence: number
  reasoning: string
  confirmed: boolean
  summary: string
  errors: string[]
}

export async function fanOutToDepartments(params: {
  entityId: string
  entityName: string
  currency: string
  departments: Array<{
    department: AgentDepartment
    taskType: AgentTaskType
    input: Record<string, unknown>
  }>
}): Promise<DepartmentResult[]> {
  const trace = await langfuse.trace({
    name: "fan-out-departments",
    metadata: {
      entityId: params.entityId,
      departmentCount: params.departments.length,
      departments: params.departments.map((d) => d.department),
    },
  })

  const results = await Promise.allSettled(
    params.departments.map(async (dept) => {
      const agentId = DEPARTMENT_AGENTS[dept.department]
      const graph = await getAgentGraph(agentId) as any

      const initialState: Record<string, unknown> = {
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
      }

      const result = await graph.invoke(initialState)
      const typed = result as Record<string, unknown>

      return {
        department: dept.department,
        agentId,
        confidence: (typed.confidence as number) ?? 0,
        reasoning: (typed.reasoning as string) ?? "",
        confirmed: ((typed.confidence as number) ?? 0) >= 0.8,
        summary:
          (typed.humanResponse as string) ??
          (typed.result as string) ??
          "",
        errors: (typed.errors as string[]) ?? [],
      }
    })
  )

  const departmentResults: DepartmentResult[] = params.departments.map(
    (dept, i) => {
      const settled = results[i]
      if (settled.status === "fulfilled") {
        return settled.value
      }
      // Rejected — department agent failed
      const agentId = DEPARTMENT_AGENTS[dept.department]
      const errorMsg =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason)

      langfuse.event({
        name: "department-fanout-error",
        metadata: {
          department: dept.department,
          agentId,
          error: errorMsg,
        },
      })

      return {
        department: dept.department,
        agentId,
        confidence: 0,
        reasoning: `Agent failed: ${errorMsg}`,
        confirmed: false,
        summary: `Error: ${errorMsg}`,
        errors: [errorMsg],
      }
    }
  )

  await trace.update({
    output: {
      results: departmentResults.map((r) => ({
        department: r.department,
        confidence: r.confidence,
        confirmed: r.confirmed,
        errors: r.errors,
      })),
    },
  })

  return departmentResults
}

// ─── Hierarchical Orchestration ─────────────────────────────────────────────

export async function orchestrateHierarchical(
  params: OrchestrateParams
): Promise<AgentResult> {
  const startTime = Date.now()
  const taskId = crypto.randomUUID()

  const trace = await langfuse.trace({
    name: "agent-orchestrator-hierarchical",
    metadata: {
      taskId,
      taskType: params.taskType,
      entityId: params.entityId,
      mode: "hierarchical",
    },
  })

  try {
    // ── Route 1: Chat / Question → CFO directly ──────────────────────────
    if (params.taskType === "chat" || params.taskType === "question") {
      const result = await orchestrate({ ...params })
      await trace.update({
        output: {
          route: "cfo_direct",
          agentId: result.agentId,
          confidence: result.confidence,
        },
      })
      return result
    }

    // ── Route 2: Close trigger → CFO + fan-out + evaluate ────────────────
    if (params.taskType === "close_trigger") {
      return await orchestrateClose(taskId, trace, params, startTime)
    }

    // ── Route 3: Direct department task → invoke target agent ─────────────
    const routing = TASK_AGENT_MAP[params.taskType]
    if (routing) {
      const result = await orchestrate({ ...params })
      const escalation = checkEscalation(result)

      await trace.update({
        output: {
          route: "direct",
          agentId: result.agentId,
          confidence: result.confidence,
          escalation: escalation.action,
        },
      })

      // Attach escalation info to result
      if (escalation.action !== "proceed") {
        return {
          ...result,
          reasoning: `${result.reasoning} [ESCALATION: ${escalation.reason}]`,
        }
      }

      return result
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
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    await trace.update({
      output: { error: msg },
      metadata: { status: "error" },
    })

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
    }
  }
}

// ─── Close Orchestration (Private) ──────────────────────────────────────────

async function orchestrateClose(
  taskId: string,
  trace: Awaited<ReturnType<typeof langfuse.trace>>,
  params: OrchestrateParams,
  startTime: number
): Promise<AgentResult> {
  // Step 1: Invoke CFO to initiate close
  const cfoGraph = await getAgentGraph("cfo") as any
  const cfoInitialState: Record<string, unknown> = {
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
  }

  const cfoInitResult = await cfoGraph.invoke(cfoInitialState)
  const cfoInit = cfoInitResult as Record<string, unknown>

  // Step 2: Fan-out to all 4 department heads in parallel
  const period =
    (params.input.period as string) ??
    (cfoInit.closeState as { period?: string } | null)?.period ??
    "current period"

  const deptResults = await fanOutToDepartments({
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    departments: ALL_DEPARTMENTS.map((dept) => ({
      department: dept,
      taskType: DEPARTMENT_CLOSE_TASK[dept],
      input: { period, closeTrigger: true },
    })),
  })

  // Step 3: Evaluate readiness
  const confirmed = deptResults.filter((r) => r.confirmed)
  const notConfirmed = deptResults.filter((r) => !r.confirmed)
  const allConfirmed = confirmed.length === ALL_DEPARTMENTS.length
  const avgConfidence =
    deptResults.reduce((sum, r) => sum + r.confidence, 0) /
    deptResults.length

  // Step 4: Build human-readable summary
  const summaryLines = deptResults.map((r) => {
    const status = r.confirmed ? "CONFIRMED" : "NOT CONFIRMED"
    return `${r.department}: ${status} (confidence: ${r.confidence.toFixed(2)}) — ${r.summary || r.reasoning}`
  })

  const humanResponse = allConfirmed
    ? `All departments confirmed for ${period}. Ready to close.\n\n${summaryLines.join("\n")}`
    : `Close for ${period} has issues.\n\n${summaryLines.join("\n")}\n\nBlocking: ${notConfirmed.map((r) => r.department).join(", ")}`

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
  })

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
  }
}
