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
import { callModel } from "@xenboox/models";
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
import {
  withRetry,
  withTimeout,
  withConcurrencyLimit,
  redactPII,
  redactPIIFromObject,
  checkIdempotency,
  setIdempotencyResult,
  generateIdempotencyKey,
  startCacheCleanup,
  TimeoutError,
  DEFAULT_PIPELINE_TIMEOUT,
} from "./retry";
import type { PipelineTimeoutConfig } from "./retry";

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
  await db.transaction(async (tx) => {
    for (const t of DEFAULT_THRESHOLDS) {
      await tx
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
  });
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

  // Try session-based ambiguous reference resolution first
  let resolvedInput = input;
  if (session) {
    const resolved = resolveAmbiguousReference(session, input);
    if (resolved !== null && resolved !== undefined) {
      resolvedInput = String(resolved);
    }
  }

  // ── Model-based intent classification (replaces regex) ──
  // Uses callModel with a forced classify_intent tool for structured output.
  // Falls back to regex if the model call fails.
  let intentType: IntentType = "query";
  let intentConfidence = 0.85;
  let intentReasoning = "";

  try {
    const response = await callModel({
      agentName: "cfo",
      taskType: "chat_response",
      entityId: event.entityId,
      systemPrompt: `You are Xenboox's intent classifier. Classify the user's message into exactly one intent type.

Intent types:
- query: User is asking a question or requesting information (what, how, show, list, report, summary)
- instruction: User wants you to do something (run, process, create, post, record, pay, send, close)
- correction_dispute: User is correcting something or disputing a result (wrong, error, fix, reopen)
- approval_response: User is responding to an approval request (yes, no, approve, reject, proceed)
- agent_escalation: An agent needs human attention (escalate, flag, review needed)

Also extract: entities mentioned, time period (YYYY-MM format if found), and monetary amount.
Always use the classify_intent tool.`,
      messages: [
        {
          role: "user",
          content: `Classify this user message:\n\n"${resolvedInput.slice(0, 500)}"`,
        },
      ],
      tools: [
        {
          name: "classify_intent",
          description: "Classify user intent and extract entities",
          inputSchema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: [
                  "query",
                  "instruction",
                  "correction_dispute",
                  "approval_response",
                  "agent_escalation",
                ],
                description: "The classified intent type",
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Classification confidence (0-1)",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of the classification",
              },
              entities: {
                type: "array",
                items: { type: "string" },
                description: "Entity names mentioned in the message",
              },
              period: {
                type: "string",
                description: "Time period in YYYY-MM format if mentioned",
              },
              amount: {
                type: "number",
                description: "Monetary amount if mentioned",
              },
            },
            required: ["intent", "confidence", "reasoning"],
          },
        },
      ],
      toolChoice: { type: "tool", name: "classify_intent" },
      maxTokens: 512,
    });

    const toolCall = response.toolCalls.find(
      (tc) => tc.name === "classify_intent",
    );
    if (toolCall?.arguments) {
      const args = toolCall.arguments as Record<string, unknown>;
      intentType = (args.intent as IntentType) ?? "query";
      intentConfidence = (args.confidence as number) ?? 0.85;
      intentReasoning = (args.reasoning as string) ?? "Model classification";
    }
  } catch {
    // Fallback: simple keyword matching if model call fails
    intentReasoning = "Fallback keyword classification (model call failed)";
    intentConfidence = 0.6;

    if (/wrong|error|mistake|fix|reopen|incorrect/i.test(lower)) {
      intentType = "correction_dispute";
    } else if (
      /^(yes|no|approve|reject|confirmed|go ahead|proceed)/i.test(lower)
    ) {
      intentType = "approval_response";
    } else if (/escalat|flag|review.*please|need.*help/i.test(lower)) {
      intentType = "agent_escalation";
    } else if (
      /^(run|process|create|post|record|pay|send|transfer|close)/i.test(lower)
    ) {
      intentType = "instruction";
    }
  }

  // Resolve entities/period from message text (supplement model extraction)
  const periodMatch = input.match(/(\d{4}-\d{2})/);
  const period = periodMatch?.[1] ?? session?.context.periodInFocus ?? null;

  const amountMatch = input.match(
    /(?:GMD|USD|EUR|GBP|NGN|KES|XAF|XOF)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/,
  );
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : null;

  // Map intent → target agents
  const taskType = classifyUserMessage(input);
  const targetAgents = await mapIntentToAgents(intentType, input, taskType);

  return {
    type: intentType,
    originalInput: input,
    resolvedInput,
    entities: [],
    period,
    amount,
    confidence: intentConfidence,
    reasoning: intentReasoning,
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
  // Wrap queue operations in a transaction for atomicity
  await db.transaction(async (tx) => {
    await tx.insert(agentRoutingLogs).values({
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
    // Future: insert into approvals table + notification records here
  });
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

// ─── Per-Step Telemetry ─────────────────────────────────────────────────────
// Tracks timing of each pipeline step for observability / monitoring.

export interface StepTelemetry {
  step: string;
  label: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  metadata?: Record<string, unknown>;
}

function recordStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
): StepTelemetry {
  const durationMs = Date.now() - startedAt;
  const entry: StepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    status: "completed",
  };
  telemetry.push(entry);
  return entry;
}

function recordFailedStep(
  telemetry: StepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
  error?: string,
): void {
  const entry: StepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: "failed",
    metadata: error ? { error } : undefined,
  };
  telemetry.push(entry);
}

// ─── Live progress events (streaming UIs) ──────────────────────────────────
//
// The pipeline emits one event per completed step with a plain-English note
// describing what actually happened (intent found, agents dispatched, gate
// result). The web stream route turns these into "thinking" SSE events so the
// live AI Command Center shows the same reasoning reveal the simulations do.

export interface PipelineStepEvent {
  /** Stable step id (e.g. "intent_resolution"). */
  step: string;
  /** Human label (e.g. "Intent & Context Resolution"). */
  label: string;
  /** Plain-English note describing what the step produced. */
  note: string;
  durationMs: number;
  status: StepTelemetry["status"];
}

/** Display names used in routing notes sent to streaming UIs. */
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  cfo: "CFO Agent",
  controller: "Controller Agent",
  treasury: "Treasury Agent",
  ar: "AR Agent",
  ap: "AP Agent",
  payroll: "Payroll Agent",
  payroll_manager: "Payroll Manager",
  ledger: "Ledger Agent",
  reporting: "Reporting Agent",
  document: "Document Agent",
  cash: "Cash Agent",
  compliance: "Compliance Agent",
  reconciliation: "Reconciliation Agent",
  budget: "Budget Agent",
  analytics: "Analytics Agent",
  mobile_money: "Mobile Money Agent",
};

function agentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId] ?? `${agentId} Agent`;
}

function emitStep(
  onStep: ((step: PipelineStepEvent) => void) | undefined,
  entry: StepTelemetry,
  note: string,
): void {
  try {
    onStep?.({
      step: entry.step,
      label: entry.label,
      note,
      durationMs: entry.durationMs,
      status: entry.status,
    });
  } catch {
    // Streaming callbacks must never break the pipeline — a throwing
    // consumer is ignored rather than failing the whole run.
  }
}

// ─── Full Pipeline Orchestrator ────────────────────────────────────────────

export async function runCFOPipeline(
  event: InputEvent,
  timeoutConfig?: Partial<PipelineTimeoutConfig>,
  onStep?: (step: PipelineStepEvent) => void,
): Promise<{
  response: string;
  decision: PipelineDecision;
  summaries: SummaryObject[];
  auditEntry: AuditEntry;
  stepTelemetry: StepTelemetry[];
  durationMs: number;
}> {
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...timeoutConfig,
  };
  const stepTelemetry: StepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  // Detect duplicate submissions before any processing
  const idempotencyKey = generateIdempotencyKey(event);
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as {
      response: string;
      decision: PipelineDecision;
      summaries: SummaryObject[];
      auditEntry: AuditEntry;
      stepTelemetry: StepTelemetry[];
      durationMs: number;
    };
    return {
      ...cached,
      stepTelemetry: [
        ...cached.stepTelemetry,
        {
          step: "idempotency_check",
          label: "Request Deduplication",
          startedAt: new Date(telemetryStart).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - telemetryStart,
          status: "completed",
          metadata: { cached: true, key: idempotencyKey.slice(0, 16) },
        },
      ],
      durationMs: Date.now() - startTime,
    };
  }

  // Start cache cleanup on first pipeline run
  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  // The entire pipeline must complete within maxExecutionMs
  const pipelinePromise = (async () => {
    const trace = await langfuse.trace({
      name: "cfo-agent-pipeline",
      metadata: {
        channel: event.channel,
        entityId: event.entityId,
        userId: event.userId,
        sessionId: event.sessionId,
        timeoutMs: pipelineTimeout.maxExecutionMs,
        idempotencyKey: idempotencyKey.slice(0, 16),
      },
    });

    try {
      // ── Step 2: Intent & Context Resolution ───────────────────────────
      let stepStart = Date.now();
      let session: import("./session-state").ConversationMemory | undefined;
      if (event.conversationId) {
        session = await withTimeout(
          () =>
            getOrCreateSession(
              event.entityId,
              event.conversationId as string,
              event.userId,
              event.entityName,
              event.currency,
            ),
          pipelineTimeout.maxStepExecutionMs,
          "getOrCreateSession",
        );
      }
      const sessionStep = recordStep(
        stepTelemetry,
        "session_load",
        "Session/Context Load",
        stepStart,
      );
      emitStep(
        onStep,
        sessionStep,
        session
          ? "Loaded this conversation's context and prior turns."
          : "Starting a fresh conversation thread.",
      );

      stepStart = Date.now();
      const intent = await withTimeout(
        () => resolveIntent(event, session),
        pipelineTimeout.maxStepExecutionMs,
        "resolveIntent",
      );
      const intentStep = recordStep(
        stepTelemetry,
        "intent_resolution",
        "Intent & Context Resolution",
        stepStart,
      );
      const targetNames = intent.targetAgents
        .map((t) => agentDisplayName(t.agentId))
        .join(", ");
      emitStep(
        onStep,
        intentStep,
        `Classified as "${intent.type.replace(/_/g, " ")}" at ${(intent.confidence * 100).toFixed(0)}% confidence — routing to ${targetNames}.`,
      );

      await trace.update({
        metadata: {
          intent: intent.type,
          targetAgentCount: intent.targetAgents.length,
        },
      });

      // ── Step 3: Permission & Entity Scoping Check ──────────────────────
      stepStart = Date.now();
      const permission = await checkPermission(
        event.userId,
        event.entityId,
        event,
      );
      const permissionStep = recordStep(
        stepTelemetry,
        "permission_check",
        "Permission & Entity Scoping",
        stepStart,
      );
      emitStep(
        onStep,
        permissionStep,
        permission.allowed
          ? "Entity access verified — proceeding within scope."
          : "Permission check failed — this request is outside your entity access.",
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
          stepTelemetry,
          durationMs: Date.now() - startTime,
        };

        await trace.update({
          output: { status: "permission_denied", reason: permission.reason },
        });
        return result;
      }

      // ── Step 4-5: Route + Dispatch ────────────────────────────────────
      stepStart = Date.now();
      const routes = await routeToAgents(intent, event);
      const tasks = createScopedTasks(routes, event);

      // Enterprise: Execute tasks with concurrency limit + retry + timeout
      // Limit parallel execution to prevent overwhelming agents
      const CONCURRENCY_LIMIT = 3; // Max 3 agents running at once

      const taskFns = tasks.map(
        (task) => async () =>
          withRetry(
            () =>
              withTimeout(
                () =>
                  orchestrate({
                    taskType: task.taskType,
                    entityId: task.entityId,
                    entityName: task.entityName,
                    currency: task.currency,
                    input: task.params,
                  }),
                pipelineTimeout.maxAgentInvokeMs,
                `orchestrate:${task.agentId}`,
              ),
            {
              agentId: task.agentId,
              operationName: `orchestrate-${task.taskType}`,
              context: { entityId: task.entityId, sessionId: event.sessionId },
            },
          ),
      );

      const orchestrationResults = await withTimeout(
        () => withConcurrencyLimit(taskFns, CONCURRENCY_LIMIT),
        pipelineTimeout.maxStepExecutionMs,
        "task_dispatch_fan_out",
      );

      const dispatchStep = recordStep(
        stepTelemetry,
        "task_dispatch",
        "Route & Task Dispatch",
        stepStart,
      );
      emitStep(
        onStep,
        dispatchStep,
        `Dispatched ${tasks.length} task${tasks.length !== 1 ? "s" : ""} to ${tasks
          .map((t) => agentDisplayName(t.agentId))
          .join(", ")} — up to ${CONCURRENCY_LIMIT} running in parallel.`,
      );

      const results: DepartmentResult[] = tasks.map((task, i) => {
        const orchestrationResult = orchestrationResults[i];
        if (orchestrationResult) {
          return {
            department:
              orchestrationResult.agentId as unknown as AgentDepartment,
            agentId: orchestrationResult.agentId,
            confidence: orchestrationResult.confidence,
            reasoning: orchestrationResult.reasoning,
            confirmed: orchestrationResult.confidence >= 0.8,
            summary:
              orchestrationResult.humanResponse ??
              orchestrationResult.reasoning,
            errors: orchestrationResult.errors,
          };
        }
        // Graceful degradation: if an agent result is missing (shouldn't happen
        // due to retry, but handles edge cases), provide a fallback
        return {
          department: task.agentId as unknown as AgentDepartment,
          agentId: task.agentId,
          confidence: 0,
          reasoning: `Task failed — no result available (graceful degradation)`,
          confirmed: false,
          summary: `Error: Agent ${task.agentId} did not return a result`,
          errors: [`Agent ${task.agentId} did not return a result`],
        };
      });

      // ── Step 6: Summary Aggregation ────────────────────────────────────
      stepStart = Date.now();
      let summaries = aggregateSummaries(results);
      const aggregationStep = recordStep(
        stepTelemetry,
        "summary_aggregation",
        "Summary Aggregation",
        stepStart,
      );
      const cleanCount = results.filter((r) => r.confirmed).length;
      const flaggedCount = results.length - cleanCount;
      emitStep(
        onStep,
        aggregationStep,
        `Collected ${results.length} agent result${results.length !== 1 ? "s" : ""} — ${cleanCount} clean, ${flaggedCount} flagged.`,
      );

      // ── Agent Disagreement Detection ─────────────────────────────────────
      // Enterprise: Check for conflicting outputs between agents
      stepStart = Date.now();
      const conflictCheck = detectConflictingOutputs(
        results.map((r) => ({
          agentId: r.agentId,
          confidence: r.confidence,
          result: { confirmed: r.confirmed, summary: r.summary || r.reasoning },
        })),
      );

      if (conflictCheck.hasConflict) {
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
      const conflictStep = recordStep(
        stepTelemetry,
        "conflict_detection",
        "Agent Disagreement Detection",
        stepStart,
      );
      emitStep(
        onStep,
        conflictStep,
        conflictCheck.hasConflict
          ? `Flagged conflicting outputs between ${conflictCheck.conflictingAgents.join(", ")}.`
          : "No conflicting outputs detected between agents.",
      );

      // ── Step 7: Escalation Gate ────────────────────────────────────────
      stepStart = Date.now();
      const gateDecision = await evaluateConfidenceGate(summaries, event);
      const gateStep = recordStep(
        stepTelemetry,
        "confidence_gate",
        "Escalation & Confidence Gate",
        stepStart,
      );
      emitStep(
        onStep,
        gateStep,
        gateDecision.action === "proceed"
          ? "Confidence gate passed — results meet the threshold, no escalations."
          : gateDecision.action === "rejected"
            ? "Request rejected by the confidence gate."
            : `Confidence gate flagged ${(gateDecision.escalationItems ?? []).length} item${(gateDecision.escalationItems ?? []).length !== 1 ? "s" : ""} for your review.`,
      );

      const agentsInvolved = [...new Set(results.map((r) => r.agentId))];

      // ── Step 8b: Push escalations to queue ──────────────────────────────
      stepStart = Date.now();
      if (gateDecision.action === "escalate_to_human") {
        for (const item of gateDecision.escalationItems) {
          await pushToApprovalQueue(item, event);
        }
      }
      const escalationStep = recordStep(
        stepTelemetry,
        "escalation_push",
        "Human-in-Loop Escalation",
        stepStart,
      );
      if (gateDecision.action === "escalate_to_human") {
        emitStep(
          onStep,
          escalationStep,
          `Pushed ${gateDecision.escalationItems.length} item${gateDecision.escalationItems.length !== 1 ? "s" : ""} to the approval queue for your review.`,
        );
      }

      // ── Step 9: Response Synthesis ──────────────────────────────────────
      stepStart = Date.now();
      const pipelineResponse = synthesizeResponse(
        gateDecision,
        summaries,
        event,
        intent,
      );
      const synthesisStep = recordStep(
        stepTelemetry,
        "response_synthesis",
        "Response Synthesis",
        stepStart,
      );
      emitStep(
        onStep,
        synthesisStep,
        "Synthesizing your answer from the gathered results…",
      );

      // ── Step 10: Audit Trail Logging (with PII Redaction) ──────────────
      stepStart = Date.now();
      const auditEntry = await logRoutingDecision({
        event: { ...event, rawContent: redactPII(event.rawContent) },
        intent: {
          ...intent,
          originalInput: redactPII(intent.originalInput),
          resolvedInput: redactPII(intent.resolvedInput),
        },
        agentsInvolved,
        confidence:
          summaries.reduce((sum, s) => sum + s.confidence, 0) /
          Math.max(summaries.length, 1),
        thresholdUsed: 0.85,
        decision:
          gateDecision.action === "proceed"
            ? "auto"
            : gateDecision.action === "escalate_to_human"
              ? "escalated"
              : "rejected",
        humanResponse: pipelineResponse,
        escalationReason:
          gateDecision.action !== "proceed" ? gateDecision.reason : undefined,
        taskId: undefined,
        durationMs: Date.now() - startTime,
      });
      const auditStep = recordStep(
        stepTelemetry,
        "audit_logging",
        "Audit Trail Logging (PII Redacted)",
        stepStart,
      );
      emitStep(
        onStep,
        auditStep,
        "Audit trail recorded — every step chained onto the tamper-evident log.",
      );

      // ── Step 11: Session/Context State ──────────────────────────────────
      stepStart = Date.now();
      if (session) {
        updateSessionAfterTurn(session, {
          role: "user",
          content: event.rawContent,
        });
        updateSessionAfterTurn(session, {
          role: "assistant",
          content: pipelineResponse,
          agentId: "cfo-agent",
          confidence:
            summaries.reduce((sum, s) => sum + s.confidence, 0) /
            Math.max(summaries.length, 1),
          periodInFocus: intent.period,
          lastTaskType: intent.type,
        });
      }
      recordStep(
        stepTelemetry,
        "session_update",
        "Session/Context State Update",
        stepStart,
      );

      const overallConfidence =
        summaries.reduce((sum, s) => sum + s.confidence, 0) /
        Math.max(summaries.length, 1);

      await trace.update({
        output: {
          status: gateDecision.action,
          agentsInvolved,
          summaryCount: summaries.length,
          overallConfidence,
          stepCount: stepTelemetry.length,
          totalStepDurationMs: stepTelemetry.reduce(
            (sum, s) => sum + s.durationMs,
            0,
          ),
          durationMs: Date.now() - startTime,
        },
      });

      // ── Build final result ─────────────────────────────────────────────
      const finalResult = {
        response: pipelineResponse,
        decision: gateDecision,
        summaries,
        auditEntry,
        stepTelemetry,
        durationMs: Date.now() - startTime,
      };

      // Cache result for idempotency
      setIdempotencyResult(idempotencyKey, finalResult);

      await trace.update({
        output: { status: "completed" },
      });

      return finalResult;
    } catch (error) {
      // Enterprise: catch and wrap any error inside the pipeline timeout
      const msg = error instanceof Error ? error.message : String(error);
      recordFailedStep(
        stepTelemetry,
        "pipeline_timeout",
        "Pipeline Execution",
        telemetryStart,
        msg,
      );

      await trace.update({
        output: { status: "error", error: msg },
        metadata: { error: true },
      });

      const errorAudit = createAuditEntry({
        agentId: "cfo-agent",
        action: "pipeline_error",
        details: { error: msg, channel: event.channel },
        confidence: 0,
      });

      return {
        response: `I encountered an error processing your request: ${msg}`,
        decision: {
          action: "escalate_to_human" as const,
          reason: msg,
          escalationItems: [] as EscalationItem[],
        },
        summaries: [],
        auditEntry: errorAudit,
        stepTelemetry,
        durationMs: Date.now() - startTime,
      };
    }
  })(); // <-- IIFE invoked immediately

  // Execute with pipeline-level timeout
  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "cfo-agent-pipeline",
  );
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
  /** Callback for streaming tool call events */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  /** Callback for streaming tool result events */
  onToolResult?: (toolName: string, success: boolean, data?: unknown) => void;
  /** Callback for live pipeline-step progress events (thinking reveal). */
  onStep?: (step: PipelineStepEvent) => void;
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

  const pipelineResult = await runCFOPipeline(event, undefined, params.onStep);

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
    decision: pipelineResult.decision.action as string,
    escalationItems,
  };
}
