import { z } from "zod";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";
import {
  opsLiveRuns,
  opsLiveRunSteps,
  opsLiveRunEvents,
} from "@xenboox/db/schema/ops-live-runs";

import { router, adminProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Live Runs Router ───────────────────────────────────────────────────────

export const liveRunsRouter = router({
  // ── List Live Runs ────────────────────────────────────────────────────

  list: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "queued",
              "in_progress",
              "waiting",
              "completed",
              "failed",
              "cancelled",
            ])
            .optional(),
          agentName: z.string().optional(),
          limit: z.number().min(1).max(100).default(10),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.status) conditions.push(eq(opsLiveRuns.status, input.status));
      if (input?.agentName)
        conditions.push(eq(opsLiveRuns.agentName, input.agentName));

      const runs = await db.query.opsLiveRuns.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(opsLiveRuns.startedAt)],
        limit: input?.limit ?? 10,
        offset: input?.offset ?? 0,
      });

      const total = await db
        .select({ count: count() })
        .from(opsLiveRuns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .then((r) => r[0]?.count ?? 0);

      return {
        items: runs.map((r) => ({
          id: r.id,
          runId: r.runId,
          agentName: r.agentName,
          agentDisplayName: r.agentDisplayName,
          agentCategory: r.agentCategory,
          organizationName: r.organizationName,
          status: r.status,
          progress: r.progress,
          currentStep: r.currentStep,
          durationMs: r.durationMs,
          duration: formatDuration(r.durationMs),
          startedAt: r.startedAt,
          model: r.model,
          userName: r.userName,
        })),
        total,
        limit: input?.limit ?? 10,
        offset: input?.offset ?? 0,
      };
    }),

  // ── Get Run Summary Counts ────────────────────────────────────────────

  getSummary: adminProcedure.query(async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Current status counts
    const statusCounts = await db
      .select({
        status: opsLiveRuns.status,
        count: count(),
      })
      .from(opsLiveRuns)
      .where(gte(opsLiveRuns.startedAt, oneHourAgo))
      .groupBy(opsLiveRuns.status);

    const counts: Record<string, number> = {
      queued: 0,
      in_progress: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
    };
    for (const row of statusCounts) {
      counts[row.status] = row.count;
    }

    // Total live (queued + in_progress + waiting)
    const liveRuns =
      (counts.queued ?? 0) + (counts.in_progress ?? 0) + (counts.waiting ?? 0);

    // Completed in last hour
    const completed1h = counts.completed ?? 0;

    // Failed in last hour
    const failed1h = counts.failed ?? 0;

    // Get previous hour counts for deltas
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    const prevStatusCounts = await db
      .select({
        status: opsLiveRuns.status,
        count: count(),
      })
      .from(opsLiveRuns)
      .where(
        and(
          gte(opsLiveRuns.startedAt, twoHoursAgo),
          lte(opsLiveRuns.startedAt, oneHourAgo),
        ),
      )
      .groupBy(opsLiveRuns.status);

    const prevCounts: Record<string, number> = {
      queued: 0,
      in_progress: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
    };
    for (const row of prevStatusCounts) {
      prevCounts[row.status] = row.count;
    }

    const prevLive =
      (prevCounts.queued ?? 0) +
      (prevCounts.in_progress ?? 0) +
      (prevCounts.waiting ?? 0);
    const prevCompleted = prevCounts.completed ?? 0;
    const prevFailed = prevCounts.failed ?? 0;

    return {
      liveRuns,
      liveRunsDelta: liveRuns - prevLive,
      queued: counts.queued ?? 0,
      queuedDelta: (counts.queued ?? 0) - (prevCounts.queued ?? 0),
      inProgress: counts.in_progress ?? 0,
      inProgressDelta: Math.round(
        prevCounts.in_progress > 0
          ? (((counts.in_progress ?? 0) - (prevCounts.in_progress ?? 0)) /
              (prevCounts.in_progress ?? 1)) *
              100
          : 0,
      ),
      waiting: counts.waiting ?? 0,
      waitingDelta: (counts.waiting ?? 0) - (prevCounts.waiting ?? 0),
      completed1h,
      completed1hDelta: Math.round(
        prevCompleted > 0
          ? ((completed1h - prevCompleted) / prevCompleted) * 100
          : 0,
      ),
      failed1h,
      failed1hDelta: failed1h - prevFailed,
    };
  }),

  // ── Get Run Detail ────────────────────────────────────────────────────

  getDetail: adminProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input }) => {
      const run = await db.query.opsLiveRuns.findFirst({
        where: eq(opsLiveRuns.runId, input.runId),
      });

      if (!run) {
        return null;
      }

      const steps = await db.query.opsLiveRunSteps.findMany({
        where: eq(opsLiveRunSteps.runId, input.runId),
        orderBy: [opsLiveRunSteps.stepNumber],
      });

      return {
        id: run.id,
        runId: run.runId,
        agentName: run.agentName,
        agentDisplayName: run.agentDisplayName,
        agentCategory: run.agentCategory,
        organizationName: run.organizationName,
        status: run.status,
        progress: run.progress,
        currentStep: run.currentStep,
        durationMs: run.durationMs,
        duration: formatDuration(run.durationMs),
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        model: run.model,
        userName: run.userName,
        error: run.error,
        liveOutput: run.liveOutput,
        costUsd: run.costUsd,
        steps: steps.map((s) => ({
          stepNumber: s.stepNumber,
          name: s.name,
          status: s.status,
          durationMs: s.durationMs,
          duration: s.durationMs ? formatDuration(s.durationMs) : "--",
          startedAt: s.startedAt,
          completedAt: s.completedAt,
        })),
      };
    }),

  // ── Get Run Events ────────────────────────────────────────────────────

  getEvents: adminProcedure
    .input(z.object({ runId: z.string(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const events = await db.query.opsLiveRunEvents.findMany({
        where: eq(opsLiveRunEvents.runId, input.runId),
        orderBy: [desc(opsLiveRunEvents.createdAt)],
        limit: input.limit,
      });

      return events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        message: e.message,
        metadata: e.metadata,
        createdAt: e.createdAt,
      }));
    }),

  // ── Seed demo data ────────────────────────────────────────────────────

  seedLiveRunsData: adminProcedure.mutation(async () => {
    const existing = await db
      .select({ count: count() })
      .from(opsLiveRuns)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) {
      return { seeded: false, reason: "Data already exists" };
    }

    const agents = [
      {
        agentName: "bookkeeping",
        displayName: "Bookkeeping Agent",
        category: "Accounting",
        model: "Claude 3.5 Sonnet",
      },
      {
        agentName: "reconciliation",
        displayName: "Reconciliation Agent",
        category: "Accounting",
        model: "Claude 3.5 Sonnet",
      },
      {
        agentName: "invoice_processing",
        displayName: "Invoice Processing Agent",
        category: "Accounting",
        model: "Claude 3 Haiku",
      },
      {
        agentName: "ap_automation",
        displayName: "AP Automation Agent",
        category: "Accounting",
        model: "Claude 3 Haiku",
      },
      {
        agentName: "payroll",
        displayName: "Payroll Agent",
        category: "HR",
        model: "Claude 3.5 Sonnet",
      },
      {
        agentName: "tax_preparation",
        displayName: "Tax Preparation Agent",
        category: "Tax",
        model: "Claude 3.5 Sonnet",
      },
      {
        agentName: "document_understanding",
        displayName: "Document Understanding",
        category: "AI Service",
        model: "GPT-4o",
      },
      {
        agentName: "report_generation",
        displayName: "Report Generation Agent",
        category: "Analytics",
        model: "Claude 3 Haiku",
      },
      {
        agentName: "cash_flow_forecasting",
        displayName: "Cash Flow Forecasting Agent",
        category: "Finance",
        model: "Claude 3.5 Sonnet",
      },
      {
        agentName: "audit_support",
        displayName: "Audit Support Agent",
        category: "Audit",
        model: "Claude 3.5 Sonnet",
      },
    ];

    const orgs = [
      "Acme Solutions Ltd.",
      "Power Solutions Ltd.",
      "GTM Traders",
      "Bakau Traders Co.",
      "Ministry of Health",
      "Africell Gambia Ltd.",
      "Delta Shipping Co.",
      "Indigo Farms Ltd.",
      "Sunu Supermarket",
      "OMC Group",
    ];

    const statuses: Array<
      "in_progress" | "queued" | "waiting" | "completed" | "failed"
    > = [
      "in_progress",
      "in_progress",
      "in_progress",
      "waiting",
      "in_progress",
      "in_progress",
      "in_progress",
      "in_progress",
      "queued",
      "queued",
    ];

    const steps = [
      "Ingest data",
      "Extract entities",
      "Classify transaction",
      "Categorize transaction",
      "Post to ledger",
      "Generate summary",
    ];

    const stepStatuses: Array<"completed" | "in_progress" | "pending"> = [
      "completed",
      "completed",
      "completed",
      "in_progress",
      "pending",
      "pending",
    ];

    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const agent = agents[i]!;
      const runId = `RUN-${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}F8T7${String.fromCharCode(65 + i)}`;
      const startedAt = new Date(
        now.getTime() - (10 - i) * 60000 - Math.random() * 30000,
      );
      const progress =
        statuses[i] === "queued" ? 0 : Math.floor(20 + Math.random() * 70);
      const durationMs =
        statuses[i] === "queued"
          ? 0
          : Math.floor(30000 + Math.random() * 180000);

      const [run] = await db
        .insert(opsLiveRuns)
        .values({
          runId,
          agentName: agent.agentName,
          agentDisplayName: agent.displayName,
          agentCategory: agent.category,
          organizationName: orgs[i],
          status: statuses[i],
          progress,
          currentStep: steps[Math.floor(progress / 20)] ?? steps[0],
          durationMs,
          startedAt,
          model: agent.model,
          userName: [
            "Mariam C.",
            "Ousman J.",
            "Fatou S.",
            "Ibrahim K.",
            "Aisha D.",
            "Musa T.",
            "Sona B.",
            "Lamin F.",
            "Abdou N.",
            "Juka M.",
          ][i],
          liveOutput:
            statuses[i] === "in_progress"
              ? {
                  transaction_id: `TXN-${920000 + i}`,
                  description: `Payment to ${orgs[i]}`,
                  amount: 500 + Math.floor(Math.random() * 5000),
                  currency: "GMD",
                  date: "2025-05-16",
                  category: "Office Supplies",
                  confidence: 0.85 + Math.random() * 0.15,
                }
              : null,
        })
        .returning();

      if (run) {
        // Insert steps
        for (let s = 0; s < steps.length; s++) {
          const sStatus =
            s < Math.floor(progress / 20)
              ? "completed"
              : s === Math.floor(progress / 20)
                ? "in_progress"
                : "pending";
          const sDuration =
            sStatus === "completed"
              ? Math.floor(15000 + Math.random() * 30000)
              : sStatus === "in_progress"
                ? Math.floor(5000 + Math.random() * 15000)
                : null;

          await db.insert(opsLiveRunSteps).values({
            runId,
            stepNumber: s + 1,
            name: steps[s]!,
            status: sStatus,
            durationMs: sDuration,
            startedAt:
              sStatus !== "pending"
                ? new Date(startedAt.getTime() + s * 30000)
                : null,
            completedAt:
              sStatus === "completed"
                ? new Date(startedAt.getTime() + (s + 1) * 30000)
                : null,
          });
        }
      }
    }

    return { seeded: true };
  }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
