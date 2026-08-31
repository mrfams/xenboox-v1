import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { getAgentGraph, fanOutToDepartments } from "../../core/orchestrator";
import { DEPARTMENT_AGENTS, ALL_DEPARTMENTS } from "../../core/registry";
import type { AgentDepartment } from "../../core/registry";
import { callLLM, callLLMWithTools } from "../../core/llm/agent-llm";
import { CFO_SYSTEM_PROMPT, fillPrompt } from "../../core/prompts";
import {
  routeToDepartments,
  routeToDepartment,
  evaluateCloseReadiness,
  getEntityFinancialSummary,
  getDepartmentDisplayName,
  createSourceRef,
  synthesizeResponse,
  frameEscalation,
  isWaitingOnDepartments,
  extractSourceRefsFromResponses,
} from "./tools";
import type { CfoStateType, DepartmentResponse } from "./state";

// ─── Node: Classify Input (Liveness: INSTRUCTION_RECEIVED) ─────────────────

export async function nodeClassifyInput(state: CfoStateType) {
  const trace = await langfuse.trace({
    name: "cfo-classify-input",
    metadata: { entityId: state.entityId },
  });

  const input = state.currentTask?.description ?? "";
  const fallbackType = state.currentTask?.type ?? "instruction";

  try {
    const result = await callLLM({
      tier: "management",
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "USD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: "current",
        ORG_TYPE: "business",
        TIMEZONE: "UTC",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [
        {
          role: "user",
          content: `Classify this message into exactly one type: question, instruction, close_trigger, close_flag, approval, clarification.\n\nMessage: "${input}"\n\nRespond with ONLY: {"type":"<type>","confidence":<0-1>,"reasoning":"<brief>"}`,
        },
      ],
      entityId: state.entityId,
      agentId: "cfo-agent",
    });

    const parsed = JSON.parse(result.content);
    await trace.update({ output: { classified: parsed.type, source: "llm" } });

    return {
      livenessState: "INSTRUCTION_RECEIVED" as const,
      confidence: parsed.confidence ?? 0.85,
      reasoning: parsed.reasoning ?? `LLM classified as ${parsed.type}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await trace.update({
      output: { classified: fallbackType, source: "deterministic", error: msg },
    });

    return {
      livenessState: "INSTRUCTION_RECEIVED" as const,
      confidence: 0,
      reasoning: `Classified as ${fallbackType} (deterministic fallback)`,
    };
  }
}

// ─── Node: Route to Departments (Liveness: ROUTING_TO_DEPARTMENT_HEAD) ─────

export async function nodeRouteToDepartments(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-route-to-departments",
    input: { description: state.currentTask?.description },
  });

  const description = state.currentTask?.description ?? "";
  const departments = routeToDepartments(description);

  // Create initial department response entries (all pending)
  const initialResponses: DepartmentResponse[] = departments.map((dept) => ({
    department: dept,
    status: "pending" as const,
    summary: null,
    confidence: null,
    receivedAt: null,
    sourceRefs: [],
  }));

  // Dispatch to departments in parallel using fanOutToDepartments
  const deptResults = await fanOutToDepartments({
    entityId: state.entityId,
    entityName: state.entityName,
    currency: state.currency,
    departments: departments.map((dept) => ({
      department: dept as AgentDepartment,
      taskType: "question" as any,
      input: { description },
    })),
  });

  // Merge results into department responses
  const updatedResponses: DepartmentResponse[] = departments.map((dept) => {
    const result = deptResults.find((r) => r.department === dept);
    if (!result) {
      return {
        department: dept,
        status: "timed_out" as const,
        summary: null,
        confidence: null,
        receivedAt: null,
        sourceRefs: [],
      };
    }

    const sourceRefs =
      result.confidence > 0
        ? [
            createSourceRef({
              claim: `Response from ${getDepartmentDisplayName(dept as any)}`,
              sourceDepartment: dept,
              sourceSummaryExcerpt: result.summary.slice(0, 200),
              confidence: result.confidence,
            }),
          ]
        : [];

    return {
      department: dept,
      status:
        result.errors.length > 0 ? ("error" as const) : ("received" as const),
      summary: result.summary || null,
      confidence: result.confidence,
      receivedAt: result.confidence > 0 ? new Date().toISOString() : null,
      sourceRefs,
    };
  });

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "routed_to_departments",
    details: {
      description: description.slice(0, 200),
      departments: departments.map((d) => ({ department: d })),
      responseCount: updatedResponses.filter((r) => r.status === "received")
        .length,
      totalCount: departments.length,
    },
    confidence: 0.95,
  });

  await trace.update({
    output: {
      departments,
      received: updatedResponses.filter((r) => r.status === "received").length,
      total: departments.length,
    },
  });

  // Check for escalations triggered by department responses
  const receivedDepts = updatedResponses.filter((r) => r.status === "received");
  const needsEscalation = receivedDepts.some((r) => (r.confidence ?? 1) < 0.6);
  const escalationDept = updatedResponses.find(
    (r) => (r.confidence ?? 1) < 0.6,
  );

  return {
    livenessState: needsEscalation
      ? ("ESCALATION_RECEIVED_FROM_DEPT_HEAD" as const)
      : ("AWAITING_DEPARTMENT_SUMMARIES" as const),
    routedDepartments: departments,
    departmentResponses: updatedResponses,
    confidence: needsEscalation ? 0.5 : 0.85,
    reasoning: needsEscalation
      ? `${getDepartmentDisplayName(escalationDept?.department as any)} flagged low confidence — routing to escalation`
      : `Routed to ${departments.length} department(s): ${departments.map((d) => getDepartmentDisplayName(d as any)).join(", ")}`,
    humanResponse: needsEscalation
      ? `I checked with ${departments.map((d) => getDepartmentDisplayName(d as any)).join(" and ")}, but ${getDepartmentDisplayName(escalationDept?.department as any)} flagged something that needs your input.`
      : departments.length > 1
        ? `Got it — checking with ${departments.map((d) => getDepartmentDisplayName(d as any)).join(" and ")}...`
        : `Got it — checking with ${getDepartmentDisplayName(departments[0] as any)}...`,
    auditTrail: [audit],
    errors: needsEscalation
      ? [
          `Escalation: ${escalationDept?.department} confidence ${(escalationDept?.confidence ?? 0).toFixed(2)} below 0.6`,
        ]
      : [],
  };
}

// ─── Node: Await Department Summaries (Liveness: AWAITING_DEPARTMENT_SUMMARIES) ─

export async function nodeAwaitDepartmentSummaries(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-await-department-summaries",
    input: { routedDepartments: state.routedDepartments },
  });

  if (!state.departmentResponses || state.departmentResponses.length === 0) {
    return {
      errors: ["No department responses to await"],
      confidence: 0,
    };
  }

  const status = isWaitingOnDepartments(state.departmentResponses);
  const timedOut = status.timedOut.length > 0;

  await trace.update({
    output: {
      waiting: status.waiting,
      waitingOn: status.waitingOn,
      received: status.received,
      timedOut: status.timedOut,
    },
  });

  const waitingMsg = status.waiting
    ? `Still waiting on ${status.waitingOn.join(", ")}.`
    : null;

  // Build human-readable status
  let humanResponse: string;
  if (status.waiting) {
    humanResponse = `I've heard from ${status.received.join(", ")} so far. Still waiting on ${status.waitingOn.join(", ")}.`;
  } else if (timedOut) {
    humanResponse = `${status.timedOut.join(", ")} ${status.timedOut.length === 1 ? "hasn't" : "haven't"} responded yet. I'll proceed with what I have.`;
  } else {
    humanResponse = `All departments have responded. Putting together your answer...`;
  }

  return {
    livenessState: timedOut
      ? ("SYNTHESIZING" as const)
      : status.waiting
        ? ("AWAITING_DEPARTMENT_SUMMARIES" as const)
        : ("SYNTHESIZING" as const),
    humanResponse: waitingMsg || humanResponse,
    confidence: status.waiting ? 0.7 : timedOut ? 0.6 : 0.9,
    reasoning: status.waiting
      ? `Awaiting: ${status.waitingOn.join(", ")}`
      : timedOut
        ? `Proceeding with partial responses: no response from ${status.timedOut.join(", ")}`
        : "All department summaries received, proceeding to synthesis",
  };
}

// ─── Node: Synthesize Answer (Liveness: SYNTHESIZING) ──────────────────────

export async function nodeSynthesizeAnswer(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-synthesize-answer",
    input: {
      departmentCount: state.departmentResponses.length,
    },
  });

  const description = state.currentTask?.description ?? "";

  // Synthesize — composition only, no new facts (§3 step 4)
  const { answer, sourceRefs } = synthesizeResponse({
    departmentResponses: state.departmentResponses,
    originalInstruction: description,
  });

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "synthesized_answer_from_departments",
    details: {
      input: description.slice(0, 200),
      sourceDepartments: state.departmentResponses
        .filter((r) => r.status === "received")
        .map((r) => r.department),
      sourceRefCount: sourceRefs.length,
    },
    confidence: 0.9,
  });

  await trace.update({
    output: {
      sourceCount: state.departmentResponses.filter(
        (r) => r.status === "received",
      ).length,
      sourceRefCount: sourceRefs.length,
    },
  });

  return {
    livenessState: "RESPONDING" as const,
    synthesizedAnswer: answer,
    sourceRefs,
    confidence: 0.9,
    reasoning: `Synthesized answer from ${state.departmentResponses.filter((r) => r.status === "received").length} department(s)`,
    humanResponse: answer,
    auditTrail: [audit],
  };
}

// ─── Node: Respond to Human (Liveness: RESPONDING) ─────────────────────────

export async function nodeRespondToHuman(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-respond-to-human",
    input: { hasSynthesizedAnswer: !!state.synthesizedAnswer },
  });

  const answer =
    state.synthesizedAnswer ?? state.humanResponse ?? "Processing complete.";
  const sourceRefs = state.sourceRefs;

  // Build citation appendix
  let responseWithCitations = answer;
  if (sourceRefs.length > 0) {
    const citationBlock = sourceRefs
      .map(
        (ref, i) =>
          `[${i + 1}] Source: ${ref.sourceDepartment} — ${ref.sourceSummaryExcerpt.slice(0, 100)}`,
      )
      .join("\n");
    responseWithCitations = `${answer}\n\n---\n${citationBlock}`;
  }

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "responded_to_human_with_citations",
    details: {
      sourceRefCount: sourceRefs.length,
      departments: [...new Set(sourceRefs.map((r) => r.sourceDepartment))],
    },
    confidence: 0.95,
  });

  await trace.update({
    output: { sourceRefCount: sourceRefs.length },
  });

  return {
    livenessState: "RESPONDING" as const,
    humanResponse: responseWithCitations,
    confidence: 0.95,
    reasoning: `Response delivered with ${sourceRefs.length} source citation(s)`,
    result: {
      type: "response_delivered",
      sourceRefs,
    },
    auditTrail: [audit],
  };
}

// ─── Node: Frame Escalation (Liveness: FRAMING_FOR_HUMAN) ──────────────────

export async function nodeFrameEscalation(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-frame-escalation",
    input: { escalationCount: state.escalations.length },
  });

  const unresolved = state.escalations.filter((e) => !e.resolvedAt);
  const deptResponses = state.departmentResponses;
  const lowConfDept = deptResponses.find((r) => (r.confidence ?? 1) < 0.6);

  // Frame the escalation with specific triggering data (§5, §6)
  const escalationFrame = frameEscalation({
    triggeringAgent:
      lowConfDept?.department ?? state.escalations[0]?.fromAgent ?? "unknown",
    triggeringDataRef:
      lowConfDept?.summary?.slice(0, 200) ?? unresolved[0]?.context ?? "",
    originalInput: state.currentTask?.description ?? "",
    departmentAssessment:
      lowConfDept?.summary ??
      unresolved[0]?.description ??
      "No assessment available",
    recommendation:
      "Review the flagged issue and provide guidance on how to proceed.",
    timeSensitivity: unresolved.some((e) => e.severity === "critical")
      ? "critical"
      : null,
  });

  // Build framed escalation message (§5.2)
  const framedMessage = `[${getDepartmentDisplayName(escalationFrame.triggeringAgent as any)}] flagged the following:\n"${escalationFrame.departmentAssessment.slice(0, 300)}"\n\nHere's why I'm asking you: ${escalationFrame.recommendation}`;

  const audit = createAuditEntry({
    agentId: "cfo-agent",
    action: "escalation_framed_for_human",
    details: {
      triggeringAgent: escalationFrame.triggeringAgent,
      originalInput: escalationFrame.originalInput.slice(0, 200),
      recommendation: escalationFrame.recommendation,
    },
    confidence: 0.85,
  });

  await trace.update({
    output: {
      triggeringAgent: escalationFrame.triggeringAgent,
      timeSensitivity: escalationFrame.timeSensitivity,
    },
  });

  return {
    livenessState: "PRESENTED_TO_HUMAN" as const,
    escalationFrame,
    humanResponse: framedMessage,
    confidence: 0.85,
    reasoning: `Escalation framed from ${escalationFrame.triggeringAgent} for human review`,
    auditTrail: [audit],
  };
}

// ─── Node: Answer Question (unchanged, adapted for liveness) ───────────────

export async function nodeAnswerQuestion(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-answer-question",
    input: { description: state.currentTask?.description },
  });

  const summary = await getEntityFinancialSummary(state.entityId);
  const question = state.currentTask?.description ?? "";

  const dataContext = summary.period
    ? `Period: ${summary.period}\nJournal entries: ${summary.entryCount}\nActive accounts: ${summary.accountCount}\nTotal activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
    : "No open fiscal period found.";

  try {
    const result = await callLLMWithTools({
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "USD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: summary.period || "none",
        ORG_TYPE: "business",
        TIMEZONE: "UTC",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [
        {
          role: "user",
          content: `Financial data:\n${dataContext}\n\nUser question: "${question}"\n\nAnswer in plain English. Open with the topic and period. Close with a clear next step.\n\nYou have access to tools like get_account_balance and get_journal_entry_lines. Use them if you need specific data to answer the question.`,
        },
      ],
      entityId: state.entityId,
      agentId: "cfo",
    });

    await trace.update({
      output: { source: "llm", toolCalls: result.toolCalls?.length ?? 0 },
    });

    return {
      livenessState: "RESPONDING" as const,
      result: { type: "question_answered", summary },
      confidence: 0.9,
      reasoning:
        "LLM-generated answer from financial summary (with tool access)",
      humanResponse: result.content,
    };
  } catch {
    const fallback = summary.period
      ? `For period ${summary.period}: ${summary.entryCount} journal entries posted, ${summary.accountCount} accounts with activity, total activity of ${state.currency} ${summary.totalActivity.toLocaleString()}.`
      : "No open fiscal period found. Please ensure a period is open before querying financial data.";

    await trace.update({ output: { source: "deterministic" } });

    return {
      livenessState: "RESPONDING" as const,
      result: { type: "question_answered", summary },
      confidence: 0.9,
      reasoning: "Retrieved entity financial summary (deterministic fallback)",
      humanResponse: fallback,
    };
  }
}

// ─── Node: Initiate Close ──────────────────────────────────────────────────

export async function nodeInitiateClose(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-initiate-close",
    input: { entityId: state.entityId },
  });

  const description = state.currentTask?.description ?? "";
  const periodMatch = description.match(/(\d{4}-\d{2})/);
  const period = periodMatch?.[1] ?? "current period";

  const deptResults = await fanOutToDepartments({
    entityId: state.entityId,
    entityName: state.entityName,
    currency: state.currency,
    departments: [
      {
        department: "controller",
        taskType: "close_checklist",
        input: { period },
      },
      { department: "treasury", taskType: "daily_report", input: { period } },
      {
        department: "payroll_manager",
        taskType: "process_payroll",
        input: { period },
      },
      {
        department: "compliance",
        taskType: "filing_status",
        input: { period },
      },
    ],
  });

  const departmentStatus = {
    controller: {
      confirmed:
        deptResults.find((r) => r.department === "controller")?.confirmed ??
        false,
      summary:
        deptResults.find((r) => r.department === "controller")?.summary ?? null,
      confidence:
        deptResults.find((r) => r.department === "controller")?.confidence ??
        null,
      confirmedAt: deptResults.find((r) => r.department === "controller")
        ?.confirmed
        ? new Date().toISOString()
        : null,
    },
    treasury: {
      confirmed:
        deptResults.find((r) => r.department === "treasury")?.confirmed ??
        false,
      summary:
        deptResults.find((r) => r.department === "treasury")?.summary ?? null,
      confidence:
        deptResults.find((r) => r.department === "treasury")?.confidence ??
        null,
      confirmedAt: deptResults.find((r) => r.department === "treasury")
        ?.confirmed
        ? new Date().toISOString()
        : null,
    },
    payrollManager: {
      confirmed:
        deptResults.find((r) => r.department === "payroll_manager")
          ?.confirmed ?? false,
      summary:
        deptResults.find((r) => r.department === "payroll_manager")?.summary ??
        null,
      confidence:
        deptResults.find((r) => r.department === "payroll_manager")
          ?.confidence ?? null,
      confirmedAt: deptResults.find((r) => r.department === "payroll_manager")
        ?.confirmed
        ? new Date().toISOString()
        : null,
    },
    compliance: {
      confirmed:
        deptResults.find((r) => r.department === "compliance")?.confirmed ??
        false,
      summary:
        deptResults.find((r) => r.department === "compliance")?.summary ?? null,
      confidence:
        deptResults.find((r) => r.department === "compliance")?.confidence ??
        null,
      confirmedAt: deptResults.find((r) => r.department === "compliance")
        ?.confirmed
        ? new Date().toISOString()
        : null,
    },
  };

  const confirmedCount = deptResults.filter((r) => r.confirmed).length;
  const avgConfidence =
    deptResults.reduce((sum, r) => sum + r.confidence, 0) / deptResults.length;

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
  });

  await trace.update({
    output: {
      period,
      confirmedCount,
      totalCount: ALL_DEPARTMENTS.length,
      avgConfidence,
    },
  });

  return {
    livenessState: "AWAITING_DEPARTMENT_SUMMARIES" as const,
    closeState: {
      period,
      status:
        confirmedCount === ALL_DEPARTMENTS.length
          ? ("awaiting_human_approval" as const)
          : ("collecting_confirmations" as const),
      initiatedAt: new Date().toISOString(),
      closedAt: null,
      approvedByHuman: false,
      reopenCount: 0,
    },
    departmentStatus,
    confidence: avgConfidence,
    reasoning:
      confirmedCount === ALL_DEPARTMENTS.length
        ? `All ${confirmedCount} departments confirmed for ${period}. Ready for human approval.`
        : `${confirmedCount} of ${ALL_DEPARTMENTS.length} departments confirmed for ${period}. ${ALL_DEPARTMENTS.length - confirmedCount} pending.`,
    humanResponse:
      confirmedCount === ALL_DEPARTMENTS.length
        ? `Close for ${period}: all departments confirmed. Ready to close. Do you approve?`
        : `Close for ${period} in progress. ${confirmedCount}/${ALL_DEPARTMENTS.length} departments confirmed. Waiting on: ${deptResults
            .filter((r) => !r.confirmed)
            .map((r) => r.department)
            .join(", ")}.`,
    auditTrail: [audit],
  };
}

// ─── Node: Collect Department Status ───────────────────────────────────────

export async function nodeCollectDepartmentStatus(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-collect-dept-status",
    input: { closeState: state.closeState },
  });

  if (!state.departmentStatus || !state.closeState) {
    return { errors: ["No department status or close state"], confidence: 0 };
  }

  const readiness = evaluateCloseReadiness(state.departmentStatus);

  await trace.update({
    output: { ready: readiness.ready, blockers: readiness.blockers },
  });

  if (readiness.ready) {
    return {
      closeState: {
        ...state.closeState,
        status: "awaiting_human_approval" as const,
      },
      confidence: readiness.overallConfidence,
      reasoning: "All departments confirmed. Awaiting human approval.",
      humanResponse: `All departments have confirmed for ${state.closeState.period}. Ready to close. Do you approve?`,
    };
  }

  return {
    confidence: 0.6,
    reasoning: `Close not ready: ${readiness.blockers.join("; ")}`,
    humanResponse: `Close for ${state.closeState.period} is in progress. Issues: ${readiness.blockers.join(". ")}.`,
  };
}

// ─── Node: Process Escalation (legacy) ─────────────────────────────────────

export async function nodeProcessEscalation(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-process-escalation",
    input: { escalations: state.escalations.length },
  });

  const unresolved = state.escalations.filter((e) => !e.resolvedAt);
  if (unresolved.length === 0) {
    return { confidence: 0.9, reasoning: "No unresolved escalations" };
  }

  const critical = unresolved.filter((e) => e.severity === "critical");
  const responseLines = unresolved.map(
    (e) =>
      `[${e.severity.toUpperCase()}] From ${e.fromAgent}: ${e.description}`,
  );

  await trace.update({
    output: { unresolved: unresolved.length, critical: critical.length },
  });

  return {
    livenessState: "ESCALATION_RECEIVED_FROM_DEPT_HEAD" as const,
    confidence: critical.length > 0 ? 0.4 : 0.7,
    reasoning: `${unresolved.length} unresolved escalations (${critical.length} critical)`,
    humanResponse: `Escalations requiring your attention:\n\n${responseLines.join("\n")}`,
  };
}

// ─── Node: Generate Summary ────────────────────────────────────────────────

export async function nodeGenerateSummary(state: CfoStateType) {
  const trace = await langfuse.span({
    name: "cfo-generate-summary",
    input: { entityId: state.entityId },
  });

  const summary = await getEntityFinancialSummary(state.entityId);

  const dataContext = summary.period
    ? `Entity: ${state.entityName}\nPeriod: ${summary.period}\nJournal entries: ${summary.entryCount}\nActive accounts: ${summary.accountCount}\nTotal activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
    : `${state.entityName}: No open fiscal period found.`;

  try {
    const result = await callLLMWithTools({
      systemPrompt: fillPrompt(CFO_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        BASE_CURRENCY: state.currency || "USD",
        FISCAL_YEAR_END: "December",
        CURRENT_PERIOD: summary.period || "none",
        ORG_TYPE: "business",
        TIMEZONE: "UTC",
        LAST_CLOSE_DATE: "N/A",
        AUTHORITY_LIMIT: "500,000",
      }),
      messages: [
        {
          role: "user",
          content: `Generate a financial summary for the CFO to present to the human.\n\nData:\n${dataContext}\n\nWrite in plain English. Open with the topic and period. Close with a clear next step.\n\nYou have access to tools like get_account_balance and get_recent_journal_entries. Use them if you need specific data to make the summary more accurate.`,
        },
      ],
      entityId: state.entityId,
      agentId: "cfo",
    });

    await trace.update({
      output: {
        source: "llm",
        toolCalls: result.toolCalls?.length ?? 0,
        summary,
      },
    });

    return {
      livenessState: "RESPONDING" as const,
      result: { type: "summary_generated", summary },
      confidence: 0.9,
      humanResponse: result.content,
    };
  } catch {
    const fallback = summary.period
      ? `Financial Summary for ${state.entityName} (${summary.period}):\n- Journal entries: ${summary.entryCount}\n- Active accounts: ${summary.accountCount}\n- Total activity: ${state.currency} ${summary.totalActivity.toLocaleString()}`
      : `${state.entityName}: No open fiscal period found.`;

    await trace.update({ output: { source: "deterministic", summary } });

    return {
      livenessState: "RESPONDING" as const,
      result: { type: "summary_generated", summary },
      confidence: 0.9,
      humanResponse: fallback,
    };
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
      livenessState: state.livenessState,
    },
  });

  return {
    livenessState: "PRESENTED_TO_HUMAN" as const,
    result: {
      type: "escalation_to_human",
      agentId: "cfo-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
      livenessState: state.livenessState,
      escalationFrame: state.escalationFrame,
    },
  };
}
