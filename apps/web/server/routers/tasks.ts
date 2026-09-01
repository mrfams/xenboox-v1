import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  closeTasks,
  opsLiveRuns,
  opsLiveRunSteps,
  dailyCloseRuns,
} from "@xenboox/db/schema";

import { db } from "@/lib/db";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";

// ─── Unified Task Type ─────────────────────────────────────────────────────
// Aggregates close tasks, live agent runs, and daily close runs into a
// single normalized shape for the AI-native tasks view.

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
  agentName: string | null;
  agentInitials: string | null;
  agentColor: string | null;
  confidence: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  currentStep: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

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

// ─── Tasks Router ──────────────────────────────────────────────────────────

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
            title: r.agentDisplayName ?? r.agentName,
            description: r.currentStep ?? `Run ${r.runId}`,
            status: r.status as UnifiedTask["status"],
            progress: r.progress,
            agentName: r.agentName,
            agentInitials: r.agentName?.slice(0, 2).toUpperCase() ?? null,
            agentColor: null,
            confidence: null,
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
          tasks.push({
            id: d.id,
            source: "daily_close",
            title: `Daily Close — ${d.closeDate}`,
            description:
              exceptionCount > 0
                ? `${exceptionCount} exception${exceptionCount > 1 ? "s" : ""} need review`
                : `Processed ${d.transactionsProcessed ?? 0} transactions`,
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
        },
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
        return {
          id: task.id,
          source: "close_task" as const,
          title: task.name,
          description: task.description,
          status: mapCloseTaskStatus(task.status),
          progress: task.status === "completed" ? 100 : 0,
          agentName: task.ownerAgent,
          agentInitials: task.ownerInitials,
          agentColor: task.ownerColor,
          confidence: task.confidence ? Number(task.confidence) : null,
          completedAt: task.completedAt,
          error: task.blockedReason,
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

        return {
          id: run.id,
          source: "live_run" as const,
          title: run.agentDisplayName ?? run.agentName,
          description: run.currentStep ?? `Run ${run.runId}`,
          status: run.status as UnifiedTask["status"],
          progress: run.progress,
          agentName: run.agentName,
          agentInitials: run.agentName?.slice(0, 2).toUpperCase() ?? null,
          agentColor: null,
          confidence: null,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          durationMs: run.durationMs,
          currentStep: run.currentStep,
          error: run.error,
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
      return {
        id: run.id,
        source: "daily_close" as const,
        title: `Daily Close — ${run.closeDate}`,
        description: `Processed ${run.transactionsProcessed ?? 0} transactions`,
        status: mapDailyCloseStatus(run.status),
        progress: run.status === "completed" ? 100 : 0,
        agentName: "daily-close-agent",
        agentInitials: "DC",
        agentColor: null,
        confidence: run.overallConfidence
          ? Number(run.overallConfidence)
          : null,
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
});
