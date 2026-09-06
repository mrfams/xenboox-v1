import { z } from "zod";
import { eq, and, desc, ne, inArray, sql } from "drizzle-orm";
import {
  closeTasks,
  opsLiveRuns,
  opsLiveRunSteps,
  opsLiveRunEvents,
  dailyCloseRuns,
  chatMessages,
  agentRoutingLogs,
  agentActivity,
  notifications,
} from "@xenboox/db/schema";

import { db } from "@/lib/db";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { parseChatArtifacts } from "@/lib/chat/artifact-types";

// ─── Unified Task Type ─────────────────────────────────────────────────────
// Aggregates close tasks, live agent runs, and daily close runs into a
// single normalized shape for the AI-native tasks view.
//
// Task-as-session (§toAINative): every task carries the chat conversation it
// belongs to, so clicking a task reloads its thread inline. Agent identity
// (agentName/agentInitials/agentColor/confidence) is server truth kept for
// observability — the user-facing UI must NOT render it.

type UnifiedTask = {
  id: string;
  source: "close_task" | "live_run" | "daily_close";
  title: string;
  description: string | null;
  status:
    | "queued"
    | "in_progress"
    | "waiting"
    | "completed"
    | "failed"
    | "blocked"
    | "skipped";
  progress: number; // 0-100
  /** @deprecated — server truth only, never render in user UI. */
  agentName: string | null;
  /** @deprecated — server truth only, never render in user UI. */
  agentInitials: string | null;
  /** @deprecated — server truth only, never render in user UI. */
  agentColor: string | null;
  /** @deprecated — server truth only, never render in user UI. */
  confidence: number | null;
  /** Chat conversation this task belongs to. Null for pre-link rows. */
  conversationId: string | null;
  /** True when the task is blocked on a human (waiting/blocked/failed/error). */
  needsDecision: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  currentStep: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

/**
 * Read the task→conversation link. Prefers the `conversation_id` column
 * (migration 0039) and falls back to `metadata.conversationId` so linking
 * works even before the migration lands.
 */
function readConversationId(row: {
  conversationId?: string | null;
  metadata?: unknown;
}): string | null {
  if (typeof row.conversationId === "string" && row.conversationId.length > 0)
    return row.conversationId;
  const meta = row.metadata;
  if (meta && typeof meta === "object") {
    const cid = (meta as Record<string, unknown>).conversationId;
    if (typeof cid === "string" && cid.length > 0) return cid;
  }
  return null;
}

function mapCloseTaskStatus(status: string): UnifiedTask["status"] {
  switch (status) {
    case "pending":
      return "queued";
    case "in_progress":
      return "in_progress";
    case "in_review":
      return "waiting";
    case "completed":
      return "completed";
    case "blocked":
      return "blocked";
    case "skipped":
      return "skipped";
    default:
      return "queued";
  }
}

function mapDailyCloseStatus(status: string): UnifiedTask["status"] {
  switch (status) {
    case "pending":
      return "queued";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "exception":
      return "blocked";
    default:
      return "queued";
  }
}

// ─── Human-Readable Task Names ─────────────────────────────────────────────
// Users don't care about agent names. They care about WHAT is being done.

const AGENT_TASK_NAMES: Record<string, string> = {
  // Core agents
  "bank-reconciler-agent": "Reconciling bank accounts",
  bank_reconciler_agent: "Reconciling bank accounts",
  "reconciliation-agent": "Reconciling accounts",
  reconciliation_agent: "Reconciling accounts",
  "ledger-agent": "Updating general ledger",
  ledger_agent: "Updating general ledger",
  "controller-agent": "Running month-end close",
  controller_agent: "Running month-end close",
  "treasury-agent": "Managing cash flow",
  treasury_agent: "Managing cash flow",
  "payroll-agent": "Processing payroll",
  payroll_agent: "Processing payroll",
  "compliance-agent": "Checking compliance",
  compliance_agent: "Checking compliance",
  "ar-agent": "Processing receivables",
  ar_agent: "Processing receivables",
  "ap-agent": "Processing payables",
  ap_agent: "Processing payables",
  "cash-agent": "Counting cash",
  cash_agent: "Counting cash",
  "document-agent": "Processing documents",
  document_agent: "Processing documents",
  "reporting-agent": "Generating reports",
  reporting_agent: "Generating reports",
  "mobile-money-agent": "Reconciling mobile money",
  mobile_money_agent: "Reconciling mobile money",
  // Tier names
  "cfo-agent": "Running financial analysis",
  cfo_agent: "Running financial analysis",
  "finance-director": "Reviewing financials",
  finance_director: "Reviewing financials",
  // Generic fallbacks
  "daily-close-agent": "Running daily close",
  daily_close_agent: "Running daily close",
};

function getTaskTitle(
  agentName: string | null,
  currentStep: string | null,
): string {
  if (currentStep && currentStep.length > 5) return currentStep;
  if (!agentName) return "Working on task";
  const normalized = agentName
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return (
    AGENT_TASK_NAMES[normalized] ??
    agentName
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ─── Tasks Router ──────────────────────────────────────────────────────────

/**
 * Thread extras for the task detail view: artifacts produced in the linked
 * conversation plus any still-open escalations against it. Entity-scoped; a
 * task without a linked conversation returns empties.
 */
async function getTaskThreadExtras(
  entityId: string,
  conversationId: string | null,
): Promise<{
  artifacts: Array<{
    artifactId: string;
    name: string;
    docType: string;
    mimeType?: string;
    sizeBytes?: number;
    url?: string;
  }>;
  openEscalations: number;
}> {
  if (!conversationId) return { artifacts: [], openEscalations: 0 };

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [desc(chatMessages.createdAt)],
    limit: 200,
  });
  const artifacts = messages.flatMap((m) => parseChatArtifacts(m.metadata));

  // Escalation rows carry conversation_id (uuid) — guard the shape since
  // task conversation ids always come from the conversations table.
  let openEscalations = 0;
  if (/^[0-9a-f-]{36}$/i.test(conversationId)) {
    const escalations = await db.query.agentRoutingLogs.findMany({
      where: and(
        eq(agentRoutingLogs.entityId, entityId),
        eq(agentRoutingLogs.decision, "escalated"),
        eq(agentRoutingLogs.conversationId, conversationId),
      ),
      limit: 20,
    });
    openEscalations = escalations.length;
  }

  return { artifacts, openEscalations };
}

export const tasksRouter = router({
  /**
   * List all tasks for the current entity — aggregated from close tasks,
   * live agent runs, and daily close runs. Returns a unified task shape.
   */
  list: rlsProtectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "running", "completed", "failed"]).optional(),
        source: z
          .enum(["all", "close_task", "live_run", "daily_close"])
          .optional(),
        limit: z.number().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const statusFilter = input.status ?? "all";
      const sourceFilter = input.source ?? "all";
      const limit = input.limit ?? 50;

      const tasks: UnifiedTask[] = [];

      // 1. Close tasks (month-end close)
      if (sourceFilter === "all" || sourceFilter === "close_task") {
        const closeTaskRows = await db.query.closeTasks.findMany({
          where: eq(closeTasks.entityId, entityId),
          orderBy: [desc(closeTasks.createdAt)],
          limit: limit,
        });

        for (const t of closeTaskRows) {
          const taskStatus = mapCloseTaskStatus(t.status);
          if (statusFilter !== "all") {
            if (
              statusFilter === "running" &&
              taskStatus !== "in_progress" &&
              taskStatus !== "waiting"
            )
              continue;
            if (statusFilter === "completed" && taskStatus !== "completed")
              continue;
            if (
              statusFilter === "failed" &&
              taskStatus !== "failed" &&
              taskStatus !== "blocked"
            )
              continue;
          }

          tasks.push({
            id: t.id,
            source: "close_task",
            title: t.name,
            description: t.description,
            status: taskStatus,
            progress:
              t.status === "completed"
                ? 100
                : t.status === "in_progress"
                  ? 50
                  : 0,
            agentName: t.ownerAgent,
            agentInitials: t.ownerInitials,
            agentColor: t.ownerColor,
            confidence: t.confidence ? Number(t.confidence) : null,
            conversationId: readConversationId(t),
            needsDecision: needsDecisionFor(taskStatus, t.blockedReason),
            startedAt: t.completedAt
              ? new Date(t.completedAt.getTime() - 45 * 60 * 1000)
              : null,
            completedAt: t.completedAt,
            durationMs: t.completedAt ? 45 * 60 * 1000 : null,
            currentStep: t.status === "in_progress" ? t.name : null,
            error: t.blockedReason,
            metadata: t.resultDetails as Record<string, unknown> | null,
            createdAt: t.createdAt ?? new Date(),
          });
        }
      }

      // 2. Live agent runs
      if (sourceFilter === "all" || sourceFilter === "live_run") {
        const liveRunRows = await db.query.opsLiveRuns.findMany({
          where: eq(opsLiveRuns.entityId, entityId),
          orderBy: [desc(opsLiveRuns.startedAt)],
          limit: limit,
        });

        for (const r of liveRunRows) {
          if (statusFilter !== "all") {
            if (
              statusFilter === "running" &&
              r.status !== "in_progress" &&
              r.status !== "queued" &&
              r.status !== "waiting"
            )
              continue;
            if (statusFilter === "completed" && r.status !== "completed")
              continue;
            if (statusFilter === "failed" && r.status !== "failed") continue;
          }

          tasks.push({
            id: r.id,
            source: "live_run",
            title: getTaskTitle(r.agentName, r.currentStep),
            description: r.currentStep ?? `Run ${r.runId}`,
            status: r.status as UnifiedTask["status"],
            progress: r.progress,
            agentName: r.agentName,
            agentInitials: r.agentName?.slice(0, 2).toUpperCase() ?? null,
            agentColor: null,
            confidence: null,
            conversationId: readConversationId(r),
            needsDecision: needsDecisionFor(
              r.status as UnifiedTask["status"],
              r.error,
            ),
            startedAt: r.startedAt,
            completedAt: r.completedAt,
            durationMs: r.durationMs,
            currentStep: r.currentStep,
            error: r.error,
            metadata: r.metadata as Record<string, unknown> | null,
            createdAt: r.startedAt,
          });
        }
      }

      // 3. Daily close runs
      if (sourceFilter === "all" || sourceFilter === "daily_close") {
        const dailyRows = await db.query.dailyCloseRuns.findMany({
          where: eq(dailyCloseRuns.entityId, entityId),
          orderBy: [desc(dailyCloseRuns.createdAt)],
          limit: limit,
        });

        for (const d of dailyRows) {
          const taskStatus = mapDailyCloseStatus(d.status);
          if (statusFilter !== "all") {
            if (statusFilter === "running" && taskStatus !== "in_progress")
              continue;
            if (statusFilter === "completed" && taskStatus !== "completed")
              continue;
            if (
              statusFilter === "failed" &&
              taskStatus !== "failed" &&
              taskStatus !== "blocked"
            )
              continue;
          }

          const exceptionCount = d.exceptions?.length ?? 0;
          const date = new Date(d.closeDate + "T00:00:00");
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          tasks.push({
            id: d.id,
            source: "daily_close",
            title: `Daily reconciliation — ${dateStr}`,
            description:
              exceptionCount > 0
                ? `${exceptionCount} exception${exceptionCount > 1 ? "s" : ""} need review`
                : `Matched ${d.autoMatched ?? 0} of ${d.transactionsProcessed ?? 0} transactions`,
            status: taskStatus,
            progress:
              d.status === "completed"
                ? 100
                : d.status === "in_progress"
                  ? 50
                  : 0,
            agentName: "daily-close-agent",
            agentInitials: "DC",
            agentColor: null,
            confidence: d.overallConfidence
              ? Number(d.overallConfidence)
              : null,
            conversationId: readConversationId(d),
            needsDecision: needsDecisionFor(
              taskStatus,
              exceptionCount > 0 ? `${exceptionCount} exceptions` : null,
            ),
            startedAt: d.startedAt,
            completedAt: d.completedAt,
            durationMs:
              d.startedAt && d.completedAt
                ? d.completedAt.getTime() - d.startedAt.getTime()
                : null,
            currentStep:
              d.status === "in_progress" ? "Processing transactions" : null,
            error: exceptionCount > 0 ? `${exceptionCount} exceptions` : null,
            metadata: {
              transactionsProcessed: d.transactionsProcessed,
              anomaliesDetected: d.anomaliesDetected,
              autoMatched: d.autoMatched,
              needsHumanReview: d.needsHumanReview,
            },
            createdAt: d.createdAt,
          });
        }
      }

      // Sort: in_progress first, then queued, then waiting, then completed/failed/blocked
      const statusOrder: Record<string, number> = {
        in_progress: 0,
        queued: 1,
        waiting: 2,
        blocked: 3,
        failed: 4,
        skipped: 5,
        completed: 6,
      };

      tasks.sort((a, b) => {
        const sa = statusOrder[a.status] ?? 5;
        const sb = statusOrder[b.status] ?? 5;
        if (sa !== sb) return sa - sb;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      return {
        tasks: tasks.slice(0, limit),
        counts: {
          total: tasks.length,
          running: tasks.filter(
            (t) =>
              t.status === "in_progress" ||
              t.status === "queued" ||
              t.status === "waiting",
          ).length,
          completed: tasks.filter((t) => t.status === "completed").length,
          failed: tasks.filter(
            (t) => t.status === "failed" || t.status === "blocked",
          ).length,
          needsDecision: tasks.filter((t) => t.needsDecision).length,
        },
      };
    }),

  /**
   * Get step-by-step progress for a specific run (AI-native live feed).
   */
  getSteps: rlsProtectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        source: z.enum(["live_run", "daily_close", "close_task"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      let runId: string | null = null;

      if (input.source === "live_run") {
        const run = await db.query.opsLiveRuns.findFirst({
          where: and(
            eq(opsLiveRuns.id, input.taskId),
            eq(opsLiveRuns.entityId, entityId),
          ),
        });
        runId = run?.runId ?? null;
      } else if (input.source === "daily_close") {
        const run = await db.query.dailyCloseRuns.findFirst({
          where: and(
            eq(dailyCloseRuns.id, input.taskId),
            eq(dailyCloseRuns.entityId, entityId),
          ),
        });
        runId = run?.runId ?? null;
      }

      if (!runId) {
        return { steps: [], events: [] };
      }

      const steps = await db.query.opsLiveRunSteps.findMany({
        where: eq(opsLiveRunSteps.runId, runId),
        orderBy: [opsLiveRunSteps.stepNumber],
      });

      const events = await db.query.opsLiveRunEvents.findMany({
        where: eq(opsLiveRunEvents.runId, runId),
        orderBy: [desc(opsLiveRunEvents.createdAt)],
        limit: 20,
      });

      return {
        steps: steps.map((s) => ({
          stepNumber: s.stepNumber,
          name: s.name,
          status: s.status,
          durationMs: s.durationMs,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          error: s.error,
        })),
        events: events.map((e) => ({
          type: e.eventType,
          message: e.message,
          metadata: e.metadata as Record<string, unknown> | null,
          createdAt: e.createdAt,
        })),
      };
    }),

  /**
   * Get a single task's details (for the brief pane).
   */
  get: rlsProtectedProcedure
    .input(
      z.object({
        id: z.string(),
        source: z.enum(["close_task", "live_run", "daily_close"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      if (input.source === "close_task") {
        const task = await db.query.closeTasks.findFirst({
          where: and(
            eq(closeTasks.id, input.id),
            eq(closeTasks.entityId, entityId),
          ),
        });
        if (!task) return null;
        const taskStatus = mapCloseTaskStatus(task.status);
        const conversationId = readConversationId(task);
        const extras = await getTaskThreadExtras(entityId, conversationId);
        return {
          id: task.id,
          source: "close_task" as const,
          title: task.name,
          description: task.description,
          status: taskStatus,
          progress: task.status === "completed" ? 100 : 0,
          agentName: task.ownerAgent,
          agentInitials: task.ownerInitials,
          agentColor: task.ownerColor,
          confidence: task.confidence ? Number(task.confidence) : null,
          conversationId,
          needsDecision: needsDecisionFor(taskStatus, task.blockedReason),
          completedAt: task.completedAt,
          error: task.blockedReason,
          artifacts: extras.artifacts,
          openEscalations: extras.openEscalations,
          metadata: {
            phase: task.phase,
            phaseOrder: task.phaseOrder,
            isAutoCompletable: task.isAutoCompletable,
            autoCompleted: task.autoCompleted,
            resultDetails: task.resultDetails,
          },
          createdAt: task.createdAt ?? new Date(),
        };
      }

      if (input.source === "live_run") {
        const run = await db.query.opsLiveRuns.findFirst({
          where: and(
            eq(opsLiveRuns.id, input.id),
            eq(opsLiveRuns.entityId, entityId),
          ),
        });
        if (!run) return null;

        const steps = await db.query.opsLiveRunSteps.findMany({
          where: eq(opsLiveRunSteps.runId, run.runId),
          orderBy: [opsLiveRunSteps.stepNumber],
        });

        const runStatus = run.status as UnifiedTask["status"];
        const runConversationId = readConversationId(run);
        const runExtras = await getTaskThreadExtras(entityId, runConversationId);
        return {
          id: run.id,
          source: "live_run" as const,
          title: getTaskTitle(run.agentName, run.currentStep),
          description: run.currentStep ?? `Run ${run.runId}`,
          status: runStatus,
          progress: run.progress,
          agentName: run.agentName,
          agentInitials: run.agentName?.slice(0, 2).toUpperCase() ?? null,
          agentColor: null,
          confidence: null,
          conversationId: runConversationId,
          needsDecision: needsDecisionFor(runStatus, run.error),
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          durationMs: run.durationMs,
          currentStep: run.currentStep,
          error: run.error,
          artifacts: runExtras.artifacts,
          openEscalations: runExtras.openEscalations,
          metadata: {
            runId: run.runId,
            model: run.model,
            costUsd: run.costUsd,
            inputTokens: run.inputTokens,
            outputTokens: run.outputTokens,
            steps: steps.map((s) => ({
              name: s.name,
              status: s.status,
              durationMs: s.durationMs,
            })),
          },
          createdAt: run.startedAt,
        };
      }

      // daily_close
      const run = await db.query.dailyCloseRuns.findFirst({
        where: and(
          eq(dailyCloseRuns.id, input.id),
          eq(dailyCloseRuns.entityId, entityId),
        ),
      });
      if (!run) return null;
      const date = new Date(run.closeDate + "T00:00:00");
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const exceptionCount = run.exceptions?.length ?? 0;
      const dailyStatus = mapDailyCloseStatus(run.status);
      const dailyConversationId = readConversationId(run);
      const dailyExtras = await getTaskThreadExtras(
        entityId,
        dailyConversationId,
      );
      return {
        id: run.id,
        source: "daily_close" as const,
        title: `Daily reconciliation — ${dateStr}`,
        description:
          exceptionCount > 0
            ? `${exceptionCount} exception${exceptionCount > 1 ? "s" : ""} need review`
            : `Matched ${run.autoMatched ?? 0} of ${run.transactionsProcessed ?? 0} transactions`,
        status: dailyStatus,
        progress: run.status === "completed" ? 100 : 0,
        agentName: "daily-close-agent",
        agentInitials: "DC",
        agentColor: null,
        confidence: run.overallConfidence
          ? Number(run.overallConfidence)
          : null,
        conversationId: dailyConversationId,
        needsDecision: needsDecisionFor(
          dailyStatus,
          exceptionCount > 0 ? `${exceptionCount} exceptions` : null,
        ),
        artifacts: dailyExtras.artifacts,
        openEscalations: dailyExtras.openEscalations,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        error: run.exceptions?.length
          ? `${run.exceptions.length} exceptions`
          : null,
        metadata: {
          closeDate: run.closeDate,
          transactionsProcessed: run.transactionsProcessed,
          anomaliesDetected: run.anomaliesDetected,
          autoMatched: run.autoMatched,
          needsHumanReview: run.needsHumanReview,
          bankReconciliationStatus: run.bankReconciliationStatus,
          cashCountStatus: run.cashCountStatus,
          mobileMoneyStatus: run.mobileMoneyStatus,
          transactionCategorizationStatus: run.transactionCategorizationStatus,
          exceptions: run.exceptions,
        },
        createdAt: run.createdAt,
      };
    }),

  // ─── Needs-you queue (Batch 3 / N19) ──────────────────────────────────
  // The ONE server-side source for things blocked on a human. Replaces the
  // client stitching of ingestion.listAgentApprovals + notifications.list +
  // tasks.list on the Tasks page (toAInative §4: "never stitch in the
  // client"). Decision-typed notifications are folded in here — completed
  // work stays under Tasks → Done and never appears in this queue.
  needsYou: rlsProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      type DecisionItem = {
        id: string;
        category: "agent_activity" | "ingestion" | "notification";
        title: string;
        summary: string;
        rationale?: string;
        amount?: string;
        documentId?: string;
        notificationType?: string;
        notificationData?: Record<string, unknown>;
        createdAt?: string | Date;
        evidence?: Record<string, unknown>;
      };

      const out: DecisionItem[] = [];
      const seen = new Set<string>();

      // 1. Agent activity awaiting review (same conditions as
      //    ingestion.listAgentApprovals — resolved items leave the queue).
      const agentNames = [
        "ap-agent",
        "ar-agent",
        "cash-agent",
        "compliance-agent",
        "treasury-agent",
        "payroll-manager-agent",
        "controller-agent",
        "asset-agent",
        "inventory-agent",
      ];
      const reviewActions = [
        "escalate",
        "escalated",
        "flag_for_review",
        "needs_review",
        "approval_needed",
        "review_required",
      ];

      const [activities, escalationActivities] = await Promise.all([
        db.query.agentActivity.findMany({
          where: and(
            eq(agentActivity.entityId, ctx.entityId!),
            inArray(agentActivity.agentName, agentNames),
            sql`(
              COALESCE(${agentActivity.confidence}::numeric, 0) < 0.8
              OR ${agentActivity.status} = 'review_needed'
            )`,
            ne(agentActivity.status, "resolved"),
          ),
          orderBy: [desc(agentActivity.createdAt)],
          limit,
        }),
        db.query.agentActivity.findMany({
          where: and(
            eq(agentActivity.entityId, ctx.entityId!),
            inArray(agentActivity.action, reviewActions),
            ne(agentActivity.status, "resolved"),
          ),
          orderBy: [desc(agentActivity.createdAt)],
          limit: 10,
        }),
      ]);

      for (const a of [...activities, ...escalationActivities]) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        const outputData = (a.output ?? {}) as Record<string, unknown>;
        const inputData = (a.input ?? {}) as Record<string, unknown>;
        const title =
          (outputData.title as string) ??
          (outputData.message as string) ??
          "Needs your decision";
        const summary =
          (outputData.message as string) ??
          (outputData.description as string) ??
          "Review the recommendation below.";
        out.push({
          id: a.id,
          category: "agent_activity",
          title,
          summary,
          rationale:
            (outputData.recommendation as string) ?? (summary || undefined),
          createdAt: a.createdAt ?? undefined,
          evidence: inputData,
        });
      }

      // 2. Decision-typed notifications (escalations, reviews, overdue, budget).
      const decisionTypes = [
        "agent_escalation",
        "agent_flag",
        "overdue_invoice",
        "budget_exceeded",
        "ingestion_review",
        "ingestion_escalated",
      ];
      const decisionNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.entityId, ctx.entityId!),
          inArray(notifications.type, decisionTypes),
        ),
        orderBy: [desc(notifications.createdAt)],
        limit,
      });

      for (const n of decisionNotifications) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        let notificationData: Record<string, unknown> = {};
        if (n.data && typeof n.data === "object") {
          notificationData = n.data as Record<string, unknown>;
        } else if (typeof n.data === "string") {
          try {
            notificationData = JSON.parse(n.data) as Record<string, unknown>;
          } catch {
            notificationData = {};
          }
        }
        const typeKey = n.type ?? "info";
        const isIngestion =
          typeKey === "ingestion_review" || typeKey === "ingestion_escalated";
        const documentId =
          typeof notificationData.documentId === "string"
            ? notificationData.documentId
            : undefined;
        out.push({
          id: n.id,
          category: isIngestion ? "ingestion" : "notification",
          title: n.title,
          summary: n.body ?? "",
          createdAt: n.createdAt ?? undefined,
          documentId,
          notificationType: typeKey,
          notificationData,
        });
      }

      // 3. Newest first.
      out.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      return { items: out.slice(0, limit) };
    }),
});
