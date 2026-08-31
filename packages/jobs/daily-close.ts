import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { entities, dailyCloseRuns } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";
import { runDailyClose } from "@xenboox/agents/core/daily-close-pipeline";

export const processDailyClose = task({
  id: "process-daily-close",
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{ triggeredAt: string }>({
    task: "process-daily-close",
    type: "data_validation",
    severity: "high",
    title: () => "Daily close pipeline failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    const closeDate = new Date(triggeredAt).toISOString().split("T")[0]!;

    logger.info("Starting daily close pipeline", { closeDate });

    // 1. Get all active entities
    const activeEntities = await db.query.entities.findMany({
      where: eq(entities.status, "active"),
    });

    logger.info("Found active entities", { count: activeEntities.length });

    if (activeEntities.length === 0) {
      return { success: true, entitiesProcessed: 0 };
    }

    // 2. Check idempotency — skip entities already processed today
    const existingRuns = await db.query.dailyCloseRuns.findMany({
      where: eq(dailyCloseRuns.closeDate, closeDate),
    });

    const processedEntityIds = new Set(existingRuns.map((r) => r.entityId));
    const entitiesToProcess = activeEntities.filter(
      (e) => !processedEntityIds.has(e.id),
    );

    if (entitiesToProcess.length === 0) {
      logger.info("All entities already processed for today", { closeDate });
      return {
        success: true,
        entitiesProcessed: 0,
        skipped: activeEntities.length,
      };
    }

    // 3. Run daily close for each entity
    let succeeded = 0;
    let failed = 0;
    const results: Array<{
      entityId: string;
      success: boolean;
      exceptions: number;
    }> = [];

    for (const entity of entitiesToProcess) {
      try {
        const result = await runDailyClose({
          entityId: entity.id,
          entityName: entity.name,
          currency: entity.baseCurrency ?? "USD",
          closeDate,
        });

        results.push({
          entityId: entity.id,
          success: result.success,
          exceptions: result.exceptions.length,
        });

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }

        logger.info("Daily close completed for entity", {
          entityId: entity.id,
          success: result.success,
          transactionsProcessed: result.transactionsProcessed,
          anomaliesDetected: result.anomaliesDetected,
        });
      } catch (error) {
        failed++;
        results.push({ entityId: entity.id, success: false, exceptions: 1 });
        logger.error("Daily close failed for entity", {
          entityId: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Daily close pipeline completed", {
      closeDate,
      totalEntities: activeEntities.length,
      processed: entitiesToProcess.length,
      succeeded,
      failed,
    });

    return {
      success: failed === 0,
      closeDate,
      entitiesProcessed: entitiesToProcess.length,
      succeeded,
      failed,
      results,
    };
  },
});
