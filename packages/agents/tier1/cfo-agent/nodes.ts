import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { getAgentGraph } from "../../core/orchestrator"
import { fanOutToDepartments } from "../../core/orchestrator"
import { DEPARTMENT_AGENTS, ALL_DEPARTMENTS } from "../../core/registry"
import type { AgentDepartment } from "../../core/registry"
import { callLLM } from "../../core/llm/agent-llm"
import { CFO_SYSTEM_PROMPT, fillPrompt } from "../../core/prompts"
import {
  classifyInstruction,
  routeToDepartment,
  evaluateCloseReadiness,
  createEscalation,
  getEntityFinancialSummary,
} from "./tools"
import type { CfoStateType, DepartmentConfirmation } from "./state"

// ─── Node: Classify Input ──────────────────────────────────────────────────

export async function nodeClassifyInput(state: CfoStateType) {
  const trace = await langfuse.trace({
    name: "cfo-classify-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentTask?.description ?? ""
  const fallbackType = state.currentTask?.type ?? "instruction"

  try {
    const result = await callLLM({
      tier: "management",
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "GMD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: "current",
        ORG_TYPE: "business",
        TIMEZONE: "Africa/Banjul",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [{
        role: "user",
        content: `Classify this message into exactly one type: question, instruction, close_trigger, close_flag, approval, clarification.\n\nMessage: "${input}"\n\nRespond with ONLY: {"type":"<type>","confidence":<0-1>,"reasoning":"<brief>"}`,
      }],
      entityId: state.entityId,
      agentId: "cfo-agent",
    })

    const parsed = JSON.parse(result.content)
    await trace.update({ output: { classified: parsed.type, source: "llm" } })

    return {
      confidence: parsed.confidence ?? 0.85,
      reasoning: parsed.reasoning ?? `LLM classified as ${parsed.type}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await trace.update({ output: { classified: fallbackType, source: "deterministic", error: msg } })

    return {
      confidence: 0,
      reasoning: `Classified as ${fallbackType} (deterministic fallback)`,
    }
  }
}

// ─── Node: Route Instruction ───────────────────────────────────────────────

export async function nodeRouteInstruction(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-route-instruction",
    input: { description: state.currentTask?.description },
  })

  const description = state.currentTask?.description ?? ""
  const department = routeToDepartment(description)

  // Invoke the actual department head agent
  const agentId = DEPARTMENT_AGENTS[department as AgentDepartment]
  let deptResult: Record<string, unknown> = {}

  try {
    const graph = await getAgentGraph(agentId) as any
    deptResult = await graph.invoke({
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "instruction",
        status: "processing",
        input: { description },
        output: null,
        error: null,
      },
    } as Record<string, unknown>) as Record<string, unknown>
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    deptResult = {
      confidence: 0,
      reasoning: `Department agent failed: ${msg}`,
      errors: [msg],
    }
  }

  const deptConfidence = (deptResult.confidence as number) ?? 0
  const deptReasoning = (deptResult.reasoning as string) ?? ""
  const deptResponse = (deptResult.humanResponse as string) ?? ""
  const deptErrors = (deptResult.errors as string[]) ?? []

  // Check escalation
  const needsEscalation = deptConfidence < 0.6
  const escalationWarning = deptConfidence >= 0.6 && deptConfidence < 0.8

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "instruction_routed_and_dispatched",
    details: {
      description: description.slice(0, 200),
      routedTo: department,
      departmentAgentId: agentId,
      departmentConfidence: deptConfidence,
      escalated: needsEscalation,
    },
    confidence: Math.min(0.92, deptConfidence + 0.1),
  })

  await trace.update({
    output: {
      routedTo: department,
      departmentAgentId: agentId,
      departmentConfidence: deptConfidence,
      escalated: needsEscalation,
    },
  })

  // Build human-readable response
  let humanResponse: string
  if (needsEscalation) {
    humanResponse = `I routed your request to the ${department.replace("_", " ")} team, but they flagged uncertainty (confidence: ${deptConfidence.toFixed(2)}). Reasoning: ${deptReasoning}. This needs your review.`
  } else if (escalationWarning) {
    humanResponse = `I've routed your request to the ${department.replace("_", " ")} team. They processed it with moderate confidence (${deptConfidence.toFixed(2)}). ${deptResponse}`
  } else {
    humanResponse = deptResponse || `Your request has been processed by the ${department.replace("_", " ")} team.`
  }

  return {
    result: {
      type: needsEscalation ? "instruction_escalated" : "instruction_routed",
      department,
      departmentAgentId: agentId,
      departmentConfidence: deptConfidence,
      departmentResult: deptResult.result,
      description,
    },
    confidence: needsEscalation ? deptConfidence : Math.min(0.92, deptConfidence + 0.1),
    reasoning: needsEscalation
      ? `Routed to ${department}, but department agent confidence (${deptConfidence.toFixed(2)}) is below 0.6 — escalating to human`
      : `Routed to ${department} and dispatched to ${agentId} (confidence: ${deptConfidence.toFixed(2)})`,
    humanResponse,
    auditTrail: [audit],
    errors: needsEscalation ? [...deptErrors, `Escalated: confidence ${deptConfidence.toFixed(2)} < 0.6`] : deptErrors,
  }
}

// ─── Node: Answer Question ─────────────────────────────────────────────────

export async function nodeAnswerQuestion(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-answer-question",
    input: { description: state.currentTask?.description },
  })

  const summary = await getEntityFinancialSummary(state.entityId)
  const question = state.currentTask?.description ?? ""

  const dataContext = summary.period
    ? `Period: ${summary.period}\nJournal entries: ${summary.entryCount}\nActive accounts: ${summary.accountCount}\nTotal activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
    : "No open fiscal period found."

  try {
    const result = await callLLM({
      tier: "management",
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "GMD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: summary.period || "none",
        ORG_TYPE: "business",
        TIMEZONE: "Africa/Banjul",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [{
        role: "user",
        content: `Financial data:\n${dataContext}\n\nUser question: "${question}"\n\nAnswer in plain English. Open with the topic and period. Close with a clear next step.`,
      }],
      entityId: state.entityId,
      agentId: "cfo-agent",
    })

    await trace.update({ output: { source: "llm" } })

    return {
      result: { type: "question_answered", summary },
      confidence: 0.9,
      reasoning: "LLM-generated answer from financial summary",
      humanResponse: result.content,
    }
  } catch {
    const fallback = summary.period
      ? `For period ${summary.period}: ${summary.entryCount} journal entries posted, ${summary.accountCount} accounts with activity, total activity of ${state.currency} ${summary.totalActivity.toLocaleString()}.`
      : "No open fiscal period found. Please ensure a period is open before querying financial data."

    await trace.update({ output: { source: "deterministic" } })

    return {
      result: { type: "question_answered", summary },
      confidence: 0.9,
      reasoning: "Retrieved entity financial summary (deterministic fallback)",
      humanResponse: fallback,
    }
  }
}

// ─── Node: Initiate Close ──────────────────────────────────────────────────

export async function nodeInitiateClose(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-initiate-close",
    input: { entityId: state.entityId },
  })

  const description = state.currentTask?.description ?? ""
  const periodMatch = description.match(/(\d{4}-\d{2})/)
  const period = periodMatch?.[1] ?? "current period"

  // Fan-out to all 4 department heads in parallel
  const deptResults = await fanOutToDepartments({
    entityId: state.entityId,
    entityName: state.entityName,
    currency: state.currency,
    departments: [
      { department: "controller", taskType: "close_checklist", input: { period } },
      { department: "treasury", taskType: "daily_report", input: { period } },
      { department: "payroll_manager", taskType: "process_payroll", input: { period } },
      { department: "compliance", taskType: "filing_status", input: { period } },
    ],
  })

  // Map DepartmentResult[] to the existing departmentStatus shape
  const departmentStatus = {
    controller: {
      confirmed: deptResults.find((r) => r.department === "controller")?.confirmed ?? false,
      summary: deptResults.find((r) => r.department === "controller")?.summary ?? null,
      confidence: deptResults.find((r) => r.department === "controller")?.confidence ?? null,
      confirmedAt: deptResults.find((r) => r.department === "controller")?.confirmed
        ? new Date().toISOString()
        : null,
    },
    treasury: {
      confirmed: deptResults.find((r) => r.department === "treasury")?.confirmed ?? false,
      summary: deptResults.find((r) => r.department === "treasury")?.summary ?? null,
      confidence: deptResults.find((r) => r.department === "treasury")?.confidence ?? null,
      confirmedAt: deptResults.find((r) => r.department === "treasury")?.confirmed
        ? new Date().toISOString()
        : null,
    },
    payrollManager: {
      confirmed: deptResults.find((r) => r.department === "payroll_manager")?.confirmed ?? false,
      summary: deptResults.find((r) => r.department === "payroll_manager")?.summary ?? null,
      confidence: deptResults.find((r) => r.department === "payroll_manager")?.confidence ?? null,
      confirmedAt: deptResults.find((r) => r.department === "payroll_manager")?.confirmed
        ? new Date().toISOString()
        : null,
    },
    compliance: {
      confirmed: deptResults.find((r) => r.department === "compliance")?.confirmed ?? false,
      summary: deptResults.find((r) => r.department === "compliance")?.summary ?? null,
      confidence: deptResults.find((r) => r.department === "compliance")?.confidence ?? null,
      confirmedAt: deptResults.find((r) => r.department === "compliance")?.confirmed
        ? new Date().toISOString()
        : null,
    },
  }

  const confirmedCount = deptResults.filter((r) => r.confirmed).length
  const avgConfidence = deptResults.reduce((sum, r) => sum + r.confidence, 0) / deptResults.length

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "close_initiated_with_department_dispatch",
    details: {
      period,
      confirmedCount,
      totalCount: ALL_DEPARTMENTS.length,
      avgConfidence,
      departments: deptResults.map((r) => ({
        department: r.department,
        confirmed: r.confirmed,
        confidence: r.confidence,
      })),
    },
    confidence: avgConfidence,
  })

  await trace.update({
    output: {
      period,
      confirmedCount,
      totalCount: ALL_DEPARTMENTS.length,
      avgConfidence,
    },
  })

  return {
    closeState: {
      period,
      status: confirmedCount === ALL_DEPARTMENTS.length
        ? ("awaiting_human_approval" as const)
        : ("collecting_confirmations" as const),
      initiatedAt: new Date().toISOString(),
      closedAt: null,
      approvedByHuman: false,
      reopenCount: 0,
    },
    departmentStatus,
    confidence: avgConfidence,
    reasoning: confirmedCount === ALL_DEPARTMENTS.length
      ? `All ${confirmedCount} departments confirmed for ${period}. Ready for human approval.`
      : `${confirmedCount} of ${ALL_DEPARTMENTS.length} departments confirmed for ${period}. ${ALL_DEPARTMENTS.length - confirmedCount} pending.`,
    humanResponse: confirmedCount === ALL_DEPARTMENTS.length
      ? `Close for ${period}: all departments confirmed. Ready to close. Do you approve?`
      : `Close for ${period} in progress. ${confirmedCount}/${ALL_DEPARTMENTS.length} departments confirmed. Waiting on: ${deptResults.filter((r) => !r.confirmed).map((r) => r.department).join(", ")}.`,
    auditTrail: [audit],
  }
}

// ─── Node: Collect Department Status ───────────────────────────────────────

export async function nodeCollectDepartmentStatus(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-collect-dept-status",
    input: { closeState: state.closeState },
  })

  if (!state.departmentStatus || !state.closeState) {
    return { errors: ["No department status or close state"], confidence: 0 }
  }

  const readiness = evaluateCloseReadiness(state.departmentStatus)

  await trace.update({
    output: { ready: readiness.ready, blockers: readiness.blockers },
  })

  if (readiness.ready) {
    return {
      closeState: { ...state.closeState, status: "awaiting_human_approval" as const },
      confidence: readiness.overallConfidence,
      reasoning: "All departments confirmed. Awaiting human approval.",
      humanResponse: `All departments have confirmed for ${state.closeState.period}. Ready to close. Do you approve?`,
    }
  }

  return {
    confidence: 0.6,
    reasoning: `Close not ready: ${readiness.blockers.join("; ")}`,
    humanResponse: `Close for ${state.closeState.period} is in progress. Issues: ${readiness.blockers.join(". ")}.`,
  }
}

// ─── Node: Process Escalation ──────────────────────────────────────────────

export async function nodeProcessEscalation(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-process-escalation",
    input: { escalations: state.escalations.length },
  })

  const unresolved = state.escalations.filter((e) => !e.resolvedAt)
  if (unresolved.length === 0) {
    return { confidence: 0.9, reasoning: "No unresolved escalations" }
  }

  const critical = unresolved.filter((e) => e.severity === "critical")
  const responseLines = unresolved.map(
    (e) => `[${e.severity.toUpperCase()}] From ${e.fromAgent}: ${e.description}`
  )

  await trace.update({ output: { unresolved: unresolved.length, critical: critical.length } })

  return {
    confidence: critical.length > 0 ? 0.4 : 0.7,
    reasoning: `${unresolved.length} unresolved escalations (${critical.length} critical)`,
    humanResponse: `Escalations requiring your attention:\n\n${responseLines.join("\n")}`,
  }
}

// ─── Node: Generate Summary ────────────────────────────────────────────────

export async function nodeGenerateSummary(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-generate-summary",
    input: { entityId: state.entityId },
  })

  const summary = await getEntityFinancialSummary(state.entityId)

  const dataContext = summary.period
    ? `Entity: ${state.entityName}\nPeriod: ${summary.period}\nJournal entries: ${summary.entryCount}\nActive accounts: ${summary.accountCount}\nTotal activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
    : `${state.entityName}: No open fiscal period found.`

  try {
    const result = await callLLM({
      tier: "management",
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "GMD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: summary.period || "none",
        ORG_TYPE: "business",
        TIMEZONE: "Africa/Banjul",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [{
        role: "user",
        content: `Generate a financial summary for the CFO to present to the human.\n\nData:\n${dataContext}\n\nWrite in plain English. Open with the topic and period. Close with a clear next step.`,
      }],
      entityId: state.entityId,
      agentId: "cfo-agent",
    })

    await trace.update({ output: { source: "llm", summary } })

    return {
      result: { type: "summary_generated", summary },
      confidence: 0.9,
      humanResponse: result.content,
    }
  } catch {
    const fallback = summary.period
      ? `Financial Summary for ${state.entityName} (${summary.period}):\n- Journal entries: ${summary.entryCount}\n- Active accounts: ${summary.accountCount}\n- Total activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
      : `${state.entityName}: No open fiscal period found.`

    await trace.update({ output: { source: "deterministic", summary } })

    return {
      result: { type: "summary_generated", summary },
      confidence: 0.9,
      humanResponse: fallback,
    }
  }
}

// ─── Node: Escalate to Human ───────────────────────────────────────────────

export async function nodeEscalateToHuman(state: CfoStateType) {
  langfuse.event({
    name: "cfo-escalation-to-human",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  })

  return {
    result: {
      type: "escalation_to_human",
      agentId: "cfo-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
