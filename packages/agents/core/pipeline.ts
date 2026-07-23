// ─── CFO Agent Orchestration Pipeline ──────────────────────────────────────
//
// The routing brain of Xenboox. Implements the full 11-step pipeline from spec.
//
// Pipeline Steps:
//   1.  Input Intake        — Normalize input source into common event envelope
//   2.  Intent & Context     — Classify intent, resolve ambiguous references
//   3.  Permission & Scope   — Entity scoping check before routing
//   4.  Routing Decision     — Map intent → target agent(s)
//   5.  Task Dispatch        — Fan-out to department heads in parallel
//   6.  Summary Aggregation  — Collect and roll up department head summaries
//   7.  Escalation Gate      — Check confidence vs DB-backed thresholds
//   8a. Autonomous Response  — Proceed without human involvement
//   8b. Human-in-Loop Queue  — Push to approval queue + notify
//   9.  Response Synthesis   — Plain-English answer adapted to user role
//   10. Audit Trail Logging  — Every routing decision logged
//   11. Session/Context State — Update conversation memory

import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import {
  confidenceThresholds,
  agentRoutingLogs,
} from "@xenboox/db/schema/agents";
import { orchestrate, classifyUserMessage } from "./orchestrator";
import type { AgentTaskType, AgentId, DepartmentResult } from "./orchestrator";
import { DEPARTMENT_AGENTS, ALL_DEPARTMENTS } from "./registry";
import type { AgentDepartment } from "./registry";
import { detectConflictingOutputs } from "./confidence";
import { checkEntityAccess } from "./security";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import { langfuse } from "./langfuse";
import {
  getOrCreateSession,
  updateSessionAfterTurn,
  resolveAmbiguousReference,
} from "./session-state";

// ─── Types ──────────────────────────────────────────────────────────────────

/** The 5 intent types from spec Step 2 */
export type IntentType =
  | "query"
  | "instruction"
  | "correction_dispute"
  | "approval_response"
  | "agent_escalation";

/** Input sources from spec Step 1 */
export type InputChannel =
  | "web_chat"
  | "mobile_chat"
  | "desktop_chat"
  | "scheduled_trigger"
  | "agent_escalation"
  | "notification_reply"
  | "approval_action";

/** Common event envelope from spec Step 1 */
export interface InputEvent {
  channel: InputChannel;
  userId: string;
  orgId: string;
  entityId: string;
  entityName: string;
  currency: string;
  rawContent: string;
  timestamp: string;
  sessionId: string;
  conversationId?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

/** Resolved intent from spec Step 2 */
export interface ResolvedIntent {
  type: IntentType;
  originalInput: string;
  resolvedInput: string;
  entities: string[];
  period: string | null;
  amount: number | null;
  confidence: number;
  reasoning: string;
  targetAgents: Array<{
    agentId: AgentId;
    department?: AgentDepartment;
    taskType: AgentTaskType;
    reason: string;
  }>;
}

/** Summary object returned by department heads (spec Step 6) */
export interface SummaryObject {
  agentId: string;
  department: string;
  status: "clean" | "flagged" | "blocked";
  headline: string;
  confidence: number;
  supportingDataRef: string | null;
  escalations: Array<{
    severity: "info" | "warning" | "critical";
    description: string;
  }>;
}

/** Scoped task object for dispatch (spec Step 5) */
export interface ScopedTask {
  orgId: string;
  entityId: string;
  entityName: string;
  currency: string;
  agentId: AgentId;
  taskType: AgentTaskType;
  params: Record<string, unknown>;
  requestingUser: string;
  priority: "low" | "normal" | "high" | "critical";
  sessionId: string;
  deadline: string | null;
}

/** Pipeline decision result (spec Steps 7-8) */
export type PipelineDecision =
  | { action: "proceed"; reason: string }
  | {
      action: "escalate_to_human";
      reason: string;
      escalationItems: EscalationItem[];
    }
  | { action: "rejected"; reason: string; escalationItems?: EscalationItem[] };

/** Item pushed to the human-in-the-loop queue (spec Step 8b) */
export interface EscalationItem {
  id: string;
  what: string;
  why: string;
  whichAgent: string;
  confidence: number;
  amount: number | null;
  recommendedAction: string;
  metadata?: Record<string, unknown>;
}

/** Response from the pipeline (spec Step 9) */
export interface PipelineResponse {
  response: string;
  decision: PipelineDecision;
  summaries: SummaryObject[];
  agentsInvolved: string[];
  overallConfidence: number;
  auditEntry: AuditEntry;
}

// ─── Default Confidence Threshold Seed Data ─────────────────────────────────
//
// Platform ships with sane defaults.
// Lower-dollar/routine types tolerate lower confidence;
// high-dollar/first-time/cross-entity require near-certainty.

export const DEFAULT_THRESHOLDS: Array<{
  agentId: string;
  transactionType: string;
  amountBand: string;
  minConfidence: number;
}> = [
  // Controller domain
  {
    agentId: "controller",
    transactionType: "review_entry",
    amountBand: "any",
    minConfidence: 0.85,
  },
  {
    agentId: "controller",
    transactionType: "trial_balance",
    amountBand: "any",
    minConfidence: 0.9,
  },
  {
    agentId: "controller",
    transactionType: "close_checklist",
    amountBand: "any",
    minConfidence: 0.95,
  },

  // Treasury domain
  {
    agentId: "treasury",
    transactionType: "cash_position",
    amountBand: "any",
    minConfidence: 0.8,
  },
  {
    agentId: "treasury",
    transactionType: "reconciliation",
    amountBand: "any",
    minConfidence: 0.9,
  },
  {
    agentId: "treasury",
    transactionType: "daily_report",
    amountBand: "any",
    minConfidence: 0.8,
  },

  // Payroll domain
  {
    agentId: "payroll_manager",
    transactionType: "process_payroll",
    amountBand: "<10000",
    minConfidence: 0.85,
  },
  {
    agentId: "payroll_manager",
    transactionType: "process_payroll",
    amountBand: "10000-100000",
    minConfidence: 0.92,
  },
  {
    agentId: "payroll_manager",
    transactionType: "process_payroll",
    amountBand: ">100000",
    minConfidence: 0.97,
  },

  // Compliance domain
  {
    agentId: "compliance",
    transactionType: "tax_review",
    amountBand: "any",
    minConfidence: 0.9,
  },
  {
    agentId: "compliance",
    transactionType: "filing_status",
    amountBand: "any",
    minConfidence: 0.85,
  },

  // AP domain
  {
    agentId: "ap",
    transactionType: "process_ap_invoice",
    amountBand: "<1000",
    minConfidence: 0.8,
  },
  {
    agentId: "ap",
    transactionType: "process_ap_invoice",
    amountBand: "1000-50000",
    minConfidence: 0.88,
  },
  {
    agentId: "ap",
    transactionType: "process_ap_invoice",
    amountBand: ">50000",
    minConfidence: 0.95,
  },
  {
    agentId: "ap",
    transactionType: "ap_aging",
    amountBand: "any",
    minConfidence: 0.8,
  },

  // AR domain
  {
    agentId: "ar",
    transactionType: "ar_aging",
    amountBand: "any",
    minConfidence: 0.8,
  },
  {
    agentId: "ar",
    transactionType: "match_payment",
    amountBand: "any",
    minConfidence: 0.85,
  },

  // Reporting domain
  {
    agentId: "reporting",
    transactionType: "report",
    amountBand: "any",
    minConfidence: 0.8,
  },
  {
    agentId: "reporting",
    transactionType: "narrative",
    amountBand: "any",
    minConfidence: 0.75,
  },

  // Budget domain
  {
    agentId: "budget",
    transactionType: "budget_vs_actual",
    amountBand: "any",
    minConfidence: 0.8,
  },

  // Analytics domain
  {
    agentId: "analytics",
    transactionType: "kpi_dashboard",
    amountBand: "any",
    minConfidence: 0.75,
  },
];

/**
 * Seed the default thresholds into the DB if none exist.
 * Safe to call on every startup — INSERT ON CONFLICT DO NOTHING.
 */
export async function seedDefaultThresholds(): Promise<void> {
  for (const t of DEFAULT_THRESHOLDS) {
    await db
      .insert(confidenceThresholds)
      .values({
        orgId: null, // platform default
        agentId: t.agentId,
        transactionType: t.transactionType,
        amountBand: t.amountBand,
        minConfidence: t.minConfidence.toString(),
      })
      .onConflictDoNothing({
        target: [
          confidenceThresholds.orgId,
          confidenceThresholds.agentId,
          confidenceThresholds.transactionType,
          confidenceThresholds.amountBand,
        ],
      });
  }
}

// ─── Step 1: Input Intake ──────────────────────────────────────────────────
//
// Normalize any input source into a common event envelope.

export function createInputEvent(params: {
  channel: InputChannel;
  userId: string;
  orgId: string;
  entityId: string;
  entityName: string;
  currency: string;
  rawContent: string;
  conversationId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): InputEvent {
  return {
    channel: params.channel,
    userId: params.userId,
    orgId: params.orgId,
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    rawContent: params.rawContent,
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId ?? crypto.randomUUID(),
    conversationId: params.conversationId,
    metadata: params.metadata,
  };
}

// ─── Step 2: Intent & Context Resolution ───────────────────────────────────
//
// Classify input into one of 5 intent types.
// Resolve ambiguous references against session history.

export async function resolveIntent(
  event: InputEvent,
  session?: import("./session-state").ConversationMemory,
): Promise<ResolvedIntent> {
  const input = event.rawContent;
  const lower = input.toLowerCase().trim();
  let intentType: IntentType = "query";

  // Try session-based ambiguous reference resolution first
  if (session) {
    const resolved = resolveAmbiguousReference(session, input);
    if (resolved) {
      // Reference was resolved — this is likely a follow-up query
      intentType = "query";
    }
  }

  // Classification: Correction/Dispute
  if (
    /wrong|error|mistake|fix|reopen|incorrect|issue|not right|should be/i.test(
      lower,
    )
  ) {
    intentType = "correction_dispute";
  }

  // Classification: Approval Response
  else if (
    /^(yes|no|approve|reject|confirmed|go ahead|proceed|deny|decline)/i.test(
      lower,
    )
  ) {
    intentType = "approval_response";
  }

  // Classification: Escalation from agent
  else if (
    /escalat|flag|review.*please|need.*help|help.*needed|attention.*required/i.test(
      lower,
    )
  ) {
    intentType = "agent_escalation";
  }

  // Classification: Instruction (action-oriented)
  else if (
    /^(run|process|create|post|record|enter|register|pay|send|transfer|close|start|begin)/i.test(
      lower,
    ) ||
    /please (run|process|create|post|record|pay|send)/i.test(lower)
  ) {
    intentType = "instruction";
  }

  // Classification: Query (information-seeking)
  else if (
    /what|how|when|where|why|who|show|give me|tell me|list|report|summary|view|display|find|search/i.test(
      lower,
    )
  ) {
    intentType = "query";
  }

  // Resolve entities/period from message text
  const entities: string[] = [];
  const periodMatch = input.match(/(\d{4}-\d{2})/);
  const period = periodMatch?.[1] ?? session?.context.periodInFocus ?? null;

  // Resolve amount references
  const amountMatch = input.match(
    /(?:GMD|USD|EUR|GBP|NGN|KES|XAF|XOF)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/,
  );
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : null;

  // Map intent → target agents using existing classification
  const taskType = classifyUserMessage(input);
  const targetAgents = await mapIntentToAgents(intentType, input, taskType);

  const reasoning = `Classified as "${intentType}" from ${event.channel} input: "${input.slice(0, 80)}..."`;
  const confidence =
    intentType === "query" || intentType === "instruction" ? 0.85 : 0.75;

  return {
    type: intentType,
    originalInput: input,
    resolvedInput: input,
    entities,
    period,
    amount,
    confidence,
    reasoning,
    targetAgents,
  };
}

async function mapIntentToAgents(
  intentType: IntentType,
  input: string,
  taskType: AgentTaskType,
): Promise<ResolvedIntent["targetAgents"]> {
  const lower = input.toLowerCase();
  const targets: ResolvedIntent["targetAgents"] = [];

  // Compound request detection — check for multiple domain keywords
  const domains: Array<{
    keyword: string;
    agentId: AgentId;
    department?: AgentDepartment;
    taskType: AgentTaskType;
  }> = [
    {
      keyword: "payroll|salary|wage",
      agentId: "payroll_manager" as AgentId,
      department: "payroll_manager" as AgentDepartment,
      taskType: "process_payroll" as AgentTaskType,
    },
    {
      keyword: "cash|bank|balance|mobile money|treasury",
      agentId: "treasury" as AgentId,
      department: "treasury" as AgentDepartment,
      taskType: "cash_position" as AgentTaskType,
    },
    {
      keyword: "tax|filing|compliance|vat|audit",
      agentId: "compliance" as AgentId,
      department: "compliance" as AgentDepartment,
      taskType: "tax_review" as AgentTaskType,
    },
    {
      keyword: "journal|entry|ledger|trial balance|ap |payable|ar |receivable",
      agentId: "controller" as AgentId,
      department: "controller" as AgentDepartment,
      taskType: "review_entry" as AgentTaskType,
    },
    {
      keyword: "report|p&l|profit|income statement|balance sheet|cash flow",
      agentId: "reporting" as AgentId,
      taskType: "report" as AgentTaskType,
    },
    {
      keyword: "budget|variance|forecast",
      agentId: "budget" as AgentId,
      taskType: "budget_vs_actual" as AgentTaskType,
    },
    {
      keyword: "analy|trend|kpi|anomaly|ratio|health",
      agentId: "analytics" as AgentId,
      taskType: "kpi_dashboard" as AgentTaskType,
    },
    {
      keyword: "document|invoice|receipt|attachment|upload",
      agentId: "document" as AgentId,
      taskType: "document_ingest" as AgentTaskType,
    },
  ];

  const matchedDomains = domains.filter((d) =>
    new RegExp(d.keyword, "i").test(lower),
  );

  if (matchedDomains.length === 0) {
    // No specific domain — default to chat/question
    targets.push({
      agentId: "cfo" as AgentId,
      taskType:
        intentType === "query"
          ? ("question" as AgentTaskType)
          : ("chat" as AgentTaskType),
      reason: "General query — routing to CFO agent",
    });
    return targets;
  }

  // For close_trigger, always fan out to all departments
  if (taskType === "close_trigger") {
    for (const dept of ALL_DEPARTMENTS) {
      targets.push({
        agentId: DEPARTMENT_AGENTS[dept],
        department: dept,
        taskType: "close_checklist" as AgentTaskType,
        reason: `Close trigger — checking ${dept}`,
      });
    }
    return targets;
  }

  for (const domain of matchedDomains) {
    targets.push({
      agentId: domain.agentId,
      department: domain.department,
      taskType: domain.taskType,
      reason: `Matched keyword "${domain.keyword}" in input`,
    });
  }

  return targets;
}

// ─── Step 3: Permission & Entity Scoping Check ────────────────────────────
//
// Confirm user_entity_access grants this user this entity + role.
// Reject anything outside the user's scoped entities.

export async function checkPermission(
  userId: string,
  entityId: string,
  event: InputEvent,
): Promise<{ allowed: boolean; role?: string; reason?: string }> {
  if (!entityId) {
    return { allowed: false, reason: "entityId is required" };
  }

  const access = await checkEntityAccess(userId, entityId);

  if (!access.hasAccess) {
    return {
      allowed: false,
      reason: `User ${userId} does not have access to entity ${entityId}`,
    };
  }

  // Payroll-scoped data additionally checked against Payroll Officer restriction
  const isPayrollRequest =
    /payroll|salary|wage/i.test(event.rawContent) &&
    /run|process|calculate/i.test(event.rawContent);

  if (
    isPayrollRequest &&
    access.role &&
    !["owner", "admin", "finance_director", "payroll_officer"].includes(
      access.role,
    )
  ) {
    return {
      allowed: false,
      role: access.role,
      reason: `Payroll operations require owner/admin/finance_director/payroll_officer role, but user has ${access.role}`,
    };
  }

  return { allowed: true, role: access.role };
}

// ─── Step 4: Routing Decision Engine ───────────────────────────────────────

/**
 * Route a resolved intent to the appropriate department head agent(s).
 * Compound requests fan out to multiple agents in parallel.
 */
export async function routeToAgents(
  intent: ResolvedIntent,
  event: InputEvent,
): Promise<
  Array<{
    agentId: AgentId;
    taskType: AgentTaskType;
    params: Record<string, unknown>;
  }>
> {
  const routes = intent.targetAgents.map((target) => ({
    agentId: target.agentId,
    taskType: target.taskType,
    params: {
      description: event.rawContent,
      period: intent.period,
      amount: intent.amount,
      userId: event.userId,
      sessionId: event.sessionId,
    },
  }));

  return routes;
}

// ─── Step 5: Task Dispatch ──────────────────────────────────────────────────

export function createScopedTasks(
  routes: Array<{
    agentId: AgentId;
    taskType: AgentTaskType;
    params: Record<string, unknown>;
  }>,
  event: InputEvent,
): ScopedTask[] {
  return routes.map((route) => ({
    orgId: event.orgId,
    entityId: event.entityId,
    entityName: event.entityName,
    currency: event.currency,
    agentId: route.agentId,
    taskType: route.taskType,
    params: route.params,
    requestingUser: event.userId,
    priority: "normal",
    sessionId: event.sessionId,
    deadline: null,
  }));
}

// ─── Step 6: Summary Aggregation ────────────────────────────────────────────

export function aggregateSummaries(
  departmentResults: DepartmentResult[],
): SummaryObject[] {
  return departmentResults.map((r) => ({
    agentId: r.agentId,
    department: r.department,
    status: r.confirmed ? "clean" : r.errors.length > 0 ? "blocked" : "flagged",
    headline: r.summary || r.reasoning,
    confidence: r.confidence,
    supportingDataRef: null,
    escalations: r.errors.map((e) => ({
      severity: "warning" as const,
      description: e,
    })),
  }));
}

// ─── Step 7: Escalation & Confidence Gate ─────────────────────────────────

/**
 * Look up the confidence threshold from DB for a given agent/transaction/amount.
 * Falls back to platform defaults, then to hardcoded defaults.
 */
export async function getConfidenceThreshold(
  agentId: string,
  transactionType: string,
  amount: number | null,
  orgId: string | null,
): Promise<number> {
  // Determine amount band
  let amountBand = "any";
  if (amount !== null) {
    if (amount < 100) amountBand = "<100";
    else if (amount < 1000) amountBand = "100-1000";
    else if (amount < 10000) amountBand = "1000-10000";
    else if (amount < 100000) amountBand = "10000-100000";
    else amountBand = ">100000";
  }

  // Try org-specific override first
  if (orgId) {
    const orgThreshold = await db.query.confidenceThresholds.findFirst({
      where: and(
        eq(confidenceThresholds.orgId, orgId),
        eq(confidenceThresholds.agentId, agentId),
        eq(confidenceThresholds.transactionType, transactionType),
        eq(confidenceThresholds.amountBand, amountBand),
      ),
    });
    if (orgThreshold) {
      return parseFloat(orgThreshold.minConfidence);
    }
  }

  // Fall back to platform default
  const platformThreshold = await db.query.confidenceThresholds.findFirst({
    where: and(
      eq(confidenceThresholds.orgId, null as unknown as string),
      eq(confidenceThresholds.agentId, agentId),
      eq(confidenceThresholds.transactionType, transactionType),
      eq(confidenceThresholds.amountBand, amountBand),
    ),
  });

  if (platformThreshold) {
    return parseFloat(platformThreshold.minConfidence);
  }

  // Hardcoded fallback
  return 0.85;
}

export async function evaluateConfidenceGate(
  summaries: SummaryObject[],
  event: InputEvent,
): Promise<PipelineDecision> {
  const escalationItems: EscalationItem[] = [];
  const overallConfidence =
    summaries.reduce((sum, s) => sum + s.confidence, 0) / summaries.length;

  for (const summary of summaries) {
    const threshold = await getConfidenceThreshold(
      summary.agentId,
      summary.department,
      null,
      event.orgId,
    );

    if (summary.confidence < threshold) {
      escalationItems.push({
        id: crypto.randomUUID(),
        what: `${summary.department} report flagged`,
        why: `Confidence ${summary.confidence.toFixed(3)} below threshold ${threshold.toFixed(3)}`,
        whichAgent: summary.agentId,
        confidence: summary.confidence,
        amount: null,
        recommendedAction: `Review ${summary.department} output and approve, reject, or request corrections`,
        metadata: { headline: summary.headline, status: summary.status },
      });
    }

    // Blocked summaries always escalate
    if (summary.status === "blocked") {
      escalationItems.push({
        id: crypto.randomUUID(),
        what: `${summary.department} is blocked`,
        why: `Blocked status: ${summary.headline}`,
        whichAgent: summary.agentId,
        confidence: summary.confidence,
        amount: null,
        recommendedAction: `Unblock ${summary.department} before proceeding`,
      });
    }
  }

  if (escalationItems.length > 0) {
    return {
      action: "escalate_to_human",
      reason: `${escalationItems.length} item(s) below confidence threshold or blocked`,
      escalationItems,
    };
  }

  if (overallConfidence >= 0.85) {
    return {
      action: "proceed",
      reason: `Overall confidence ${overallConfidence.toFixed(3)} meets threshold`,
    };
  }

  return {
    action: "escalate_to_human",
    reason: `Overall confidence ${overallConfidence.toFixed(3)} below 0.85`,
    escalationItems: [
      {
        id: crypto.randomUUID(),
        what: "Overall confidence below threshold",
        why: `Aggregate confidence ${overallConfidence.toFixed(3)} is below 0.85`,
        whichAgent: "orchestrator",
        confidence: overallConfidence,
        amount: null,
        recommendedAction:
          "Review the aggregated results and approve or request changes",
      },
    ],
  };
}

// ─── Step 8b: Push to Human-in-the-Loop Queue ─────────────────────────────

/**
 * Record an escalation in the system for the human-in-the-loop queue.
 * In production, this would also trigger notifications (email, push, etc.).
 */
export async function pushToApprovalQueue(
  escalation: EscalationItem,
  event: InputEvent,
): Promise<void> {
  // Record in routing log with escalation flag
  await db.insert(agentRoutingLogs).values({
    entityId: event.entityId,
    userId: event.userId,
    sessionId: event.sessionId,
    conversationId: event.conversationId
      ? (event.conversationId as string)
      : undefined,
    intentType: "approval_response",
    inputSummary: escalation.what,
    agentsInvolved: [escalation.whichAgent],
    confidence: escalation.confidence.toString(),
    decision: "escalated",
    escalationReason: escalation.why,
    taskId: escalation.id,
    metadata: JSON.stringify({
      recommendedAction: escalation.recommendedAction,
      amount: escalation.amount,
    }),
  });

  // Note: In production, this should also:
  // 1. Create an approval queue item in the approvals table
  // 2. Send a notification (email/push/in-app) to the human
  // 3. Update any dashboard realtime feeds
}

// ─── Step 9: Response Synthesis ────────────────────────────────────────────

export function synthesizeResponse(
  decision: PipelineDecision,
  summaries: SummaryObject[],
  event: InputEvent,
  intent: ResolvedIntent,
): string {
  const lines: string[] = [];

  if (decision.action === "proceed") {
    const cleanCount = summaries.filter((s) => s.status === "clean").length;
    const flaggedCount = summaries.filter((s) => s.status === "flagged").length;

    const confirmations = summaries
      .filter((s) => s.status !== "blocked")
      .map((s) => `  ✅ **${s.department}**: ${s.headline}`)
      .join("\n");

    lines.push(`## Complete`);
    lines.push("");
    lines.push(
      `All ${cleanCount + flaggedCount} departments processed. ${cleanCount} clean, ${flaggedCount} flagged (within threshold).`,
    );
    lines.push("");
    lines.push(confirmations);
    lines.push("");

    if (intent.type === "instruction") {
      lines.push(
        "Your instruction has been completed. No action needed from you.",
      );
    } else {
      lines.push(
        "Everything looks good. Let me know if you need more details on any item.",
      );
    }
  } else {
    // Escalated to human
    const items = decision.escalationItems ?? [];
    lines.push(`## Review Needed`);
    lines.push("");

    for (const item of items) {
      lines.push(`### ${item.what}`);
      lines.push(`- **Why**: ${item.why}`);
      lines.push(
        `- **Agent**: ${item.whichAgent} (confidence: ${(item.confidence * 100).toFixed(0)}%)`,
      );
      lines.push(`- **Recommended action**: ${item.recommendedAction}`);
      lines.push("");
    }

    lines.push("---");
    lines.push("Please review each item above. You can:");
    lines.push("- **Approve** — let the system proceed");
    lines.push("- **Reject** — with a reason, and I'll adjust");
    lines.push("- **Ask a follow-up** — I'll get more details");
  }

  return lines.join("\n");
}

// ─── Step 10: Audit Trail Logging ──────────────────────────────────────────

export async function logRoutingDecision(params: {
  event: InputEvent;
  intent: ResolvedIntent;
  agentsInvolved: string[];
  confidence: number;
  thresholdUsed: number | null;
  decision: "auto" | "escalated" | "rejected";
  humanResponse: string;
  escalationReason?: string;
  taskId?: string;
  durationMs?: number;
}): Promise<AuditEntry> {
  const auditEntry = createAuditEntry({
    agentId: "cfo-agent",
    action: `routing_${params.decision}`,
    details: {
      channel: params.event.channel,
      intentType: params.intent.type,
      inputSummary: params.event.rawContent.slice(0, 200),
      agentsInvolved: params.agentsInvolved,
      confidence: params.confidence,
      thresholdUsed: params.thresholdUsed,
      decision: params.decision,
      taskId: params.taskId,
      durationMs: params.durationMs,
    },
    confidence: params.confidence,
  });

  // Write to routing_logs table
  try {
    await db.insert(agentRoutingLogs).values({
      entityId: params.event.entityId,
      userId: params.event.userId,
      sessionId: params.event.sessionId,
      conversationId: params.event.conversationId
        ? (params.event.conversationId as string)
        : undefined,
      intentType: params.intent.type,
      inputSummary: params.event.rawContent.slice(0, 200),
      agentsInvolved: params.agentsInvolved,
      confidence: params.confidence.toString(),
      thresholdUsed: params.thresholdUsed?.toString() ?? null,
      decision: params.decision,
      humanResponse: params.humanResponse,
      escalationReason: params.escalationReason,
      taskId: params.taskId,
      durationMs: params.durationMs?.toString() ?? null,
      metadata: JSON.stringify({
        channel: params.event.channel,
        intentReasoning: params.intent.reasoning,
        entities: params.intent.entities,
        period: params.intent.period,
      }),
    });
  } catch {
    // Logging failure should not crash the pipeline
    // In production, this would be a metric/alert
  }

  // Langfuse trace
  langfuse.event({
    name: "cfo-routing-decision",
    metadata: {
      sessionId: params.event.sessionId,
      intentType: params.intent.type,
      agentCount: params.agentsInvolved.length,
      confidence: params.confidence,
      decision: params.decision,
      thresholdUsed: params.thresholdUsed,
    },
  });

  return auditEntry;
}

// ─── Full Pipeline Orchestrator ────────────────────────────────────────────

export async function runCFOPipeline(event: InputEvent): Promise<{
  response: string;
  decision: PipelineDecision;
  summaries: SummaryObject[];
  auditEntry: AuditEntry;
  durationMs: number;
}> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "cfo-agent-pipeline",
    metadata: {
      channel: event.channel,
      entityId: event.entityId,
      userId: event.userId,
      sessionId: event.sessionId,
    },
  });

  try {
    // ── Step 2: Intent & Context Resolution ───────────────────────────
    let session: import("./session-state").ConversationMemory | undefined;
    if (event.conversationId) {
      session = await getOrCreateSession(
        event.entityId,
        event.conversationId,
        event.userId,
        event.entityName,
        event.currency,
      );
    }
    const intent = await resolveIntent(event, session);
    await trace.update({
      metadata: {
        intent: intent.type,
        targetAgentCount: intent.targetAgents.length,
      },
    });

    // ── Step 3: Permission & Entity Scoping Check ──────────────────────
    const permission = await checkPermission(
      event.userId,
      event.entityId,
      event,
    );
    if (!permission.allowed) {
      const result = {
        response: `I'm sorry, I cannot process this request. ${permission.reason}`,
        decision: { action: "rejected" as const, reason: permission.reason! },
        summaries: [] as SummaryObject[],
        auditEntry: createAuditEntry({
          agentId: "cfo-agent",
          action: "permission_denied",
          details: { reason: permission.reason, userId: event.userId },
          confidence: 1,
        }),
        durationMs: Date.now() - startTime,
      };

      await trace.update({
        output: { status: "permission_denied", reason: permission.reason },
      });
      return result;
    }

    // ── Step 4-5: Route + Dispatch ────────────────────────────────────
    const routes = await routeToAgents(intent, event);
    const tasks = createScopedTasks(routes, event);

    // Execute tasks in parallel (fan-out per spec Step 5)
    const taskResults = await Promise.allSettled(
      tasks.map(async (task) => {
        const result = await orchestrate({
          taskType: task.taskType,
          entityId: task.entityId,
          entityName: task.entityName,
          currency: task.currency,
          input: task.params,
        });
        return {
          department: result.agentId as unknown as AgentDepartment,
          agentId: result.agentId,
          confidence: result.confidence,
          reasoning: result.reasoning,
          confirmed: result.confidence >= 0.8,
          summary: result.humanResponse ?? result.reasoning,
          errors: result.errors,
        };
      }),
    );

    const results: DepartmentResult[] = taskResults.map((settled, i) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      const task = tasks[i];
      const msg =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);
      return {
        department: task.agentId as unknown as AgentDepartment,
        agentId: task.agentId,
        confidence: 0,
        reasoning: `Task failed: ${msg}`,
        confirmed: false,
        summary: `Error: ${msg}`,
        errors: [msg],
      };
    });

    // ── Step 6: Summary Aggregation ────────────────────────────────────
    let summaries = aggregateSummaries(results);

    // ── Agent Disagreement Detection ─────────────────────────────────────
    // Check for conflicting outputs between agents (spec Step 7 requirement)
    const conflictCheck = detectConflictingOutputs(
      results.map((r) => ({
        agentId: r.agentId,
        confidence: r.confidence,
        result: { confirmed: r.confirmed, summary: r.summary || r.reasoning },
      })),
    );

    if (conflictCheck.hasConflict) {
      // Flag conflicting agents as escalated items for human review
      // This pushes them through the escalation gate rather than auto-deciding
      const conflictSummary: SummaryObject = {
        agentId: "cfo-agent",
        department: "orchestrator",
        status: "flagged",
        headline: `Conflicting outputs between: ${conflictCheck.conflictingAgents.join(", ")}`,
        confidence: 0.5,
        supportingDataRef: null,
        escalations: [
          {
            severity: "warning",
            description: conflictCheck.description,
          },
        ],
      };
      summaries = [...summaries, conflictSummary];
    }

    // ── Step 7: Escalation Gate ────────────────────────────────────────
    const decision = await evaluateConfidenceGate(summaries, event);

    const agentsInvolved = [...new Set(results.map((r) => r.agentId))];

    // ── Step 8b: Push escalations to queue ──────────────────────────────
    if (decision.action === "escalate_to_human") {
      for (const item of decision.escalationItems) {
        await pushToApprovalQueue(item, event);
      }
    }

    // ── Step 9: Response Synthesis ──────────────────────────────────────
    const response = synthesizeResponse(decision, summaries, event, intent);

    // ── Step 10: Audit Trail Logging ────────────────────────────────────
    const auditEntry = await logRoutingDecision({
      event,
      intent,
      agentsInvolved,
      confidence:
        summaries.reduce((sum, s) => sum + s.confidence, 0) /
        Math.max(summaries.length, 1),
      thresholdUsed: 0.85,
      decision:
        decision.action === "proceed"
          ? "auto"
          : decision.action === "escalate_to_human"
            ? "escalated"
            : "rejected",
      humanResponse: response,
      escalationReason:
        decision.action !== "proceed" ? decision.reason : undefined,
      taskId: undefined,
      durationMs: Date.now() - startTime,
    });

    // ── Step 11: Session/Context State ──────────────────────────────────
    if (session) {
      updateSessionAfterTurn(session, {
        role: "user",
        content: event.rawContent,
      });
      updateSessionAfterTurn(session, {
        role: "assistant",
        content: response,
        agentId: "cfo-agent",
        confidence:
          summaries.reduce((sum, s) => sum + s.confidence, 0) /
          Math.max(summaries.length, 1),
        periodInFocus: intent.period,
        lastTaskType: intent.type,
      });
    }

    await trace.update({
      output: {
        status: decision.action,
        agentsInvolved,
        summaryCount: summaries.length,
        overallConfidence:
          summaries.reduce((sum, s) => sum + s.confidence, 0) /
          Math.max(summaries.length, 1),
        durationMs: Date.now() - startTime,
      },
    });

    return {
      response,
      decision,
      summaries,
      auditEntry,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorAudit = createAuditEntry({
      agentId: "cfo-agent",
      action: "pipeline_error",
      details: { error: msg, channel: event.channel },
      confidence: 0,
    });

    await trace.update({
      output: { status: "error", error: msg },
      metadata: { error: true },
    });

    return {
      response: `I encountered an error processing your request. Please try again or contact support.`,
      decision: {
        action: "escalate_to_human",
        reason: msg,
        escalationItems: [],
      },
      summaries: [],
      auditEntry: errorAudit,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Convenience wrapper: takes raw chat input and produces a pipeline response.
 * Used by the chat/agent tRPC routers.
 */
export async function processChatInput(params: {
  userId: string;
  orgId: string;
  entityId: string;
  entityName: string;
  currency: string;
  message: string;
  conversationId?: string;
  channel?: InputChannel;
}): Promise<{
  response: string;
  confidence: number;
  agentId: string;
  errors: string[];
  durationMs: number;
  decision: string;
  escalationItems: EscalationItem[];
}> {
  const event = createInputEvent({
    channel: params.channel ?? "web_chat",
    userId: params.userId,
    orgId: params.orgId,
    entityId: params.entityId,
    entityName: params.entityName,
    currency: params.currency,
    rawContent: params.message,
    conversationId: params.conversationId,
  });

  const pipelineResult = await runCFOPipeline(event);

  const escalationItems =
    pipelineResult.decision.action === "escalate_to_human"
      ? pipelineResult.decision.escalationItems
      : [];

  return {
    response: pipelineResult.response,
    confidence:
      pipelineResult.summaries.reduce((sum, s) => sum + s.confidence, 0) /
      Math.max(pipelineResult.summaries.length, 1),
    agentId: pipelineResult.auditEntry.agentId,
    errors: pipelineResult.summaries.flatMap((s) =>
      s.escalations.map((e) => e.description),
    ),
    durationMs: pipelineResult.durationMs,
    decision: pipelineResult.decision.action,
    escalationItems,
  };
}
