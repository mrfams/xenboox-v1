import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { entities } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import {
  findProjectsDueForReport,
  generateDonorReport,
} from "@xenboox/agents/platform/reporting-agent/tools";

// ─── Donor Report Generation Cron ───────────────────────────────────────────
//
// Runs daily at 3:00 AM (after the daily close pipeline at 2:00 AM).
// Checks all active entities for donor projects that have reports due
// based on their reporting cadence (monthly, quarterly, semi_annual, annual).
//
// For each project due:
//   1. Calculates budget vs actual from the project's budget allocation
//   2. Generates a narrative summary
//   3. Creates a report snapshot (status: draft)
//   4. Reports are reviewed by humans before submission to donors

export const processDonorReports = task({
  id: "process-donor-reports",
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
    task: "process-donor-reports",
    type: "data_validation",
    severity: "medium",
    title: () => "Donor report generation failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();

    logger.info("Starting donor report generation", { triggeredAt });

    // 1. Get all active entities
    const activeEntities = await db.query.entities.findMany({
      where: eq(entities.status, "active"),
    });

    logger.info("Found active entities", { count: activeEntities.length });

    if (activeEntities.length === 0) {
      return { success: true, entitiesProcessed: 0 };
    }

    // 2. Process each entity
    let succeeded = 0;
    let failed = 0;
    let totalReportsGenerated = 0;
    const results: Array<{
      entityId: string;
      success: boolean;
      reportsGenerated: number;
    }> = [];

    for (const entity of activeEntities) {
      try {
        // Find donor projects due for reports
        const projectsDue = await findProjectsDueForReport(entity.id);

        if (projectsDue.length === 0) {
          results.push({
            entityId: entity.id,
            success: true,
            reportsGenerated: 0,
          });
          succeeded++;
          continue;
        }

        let reportsGenerated = 0;

        // Generate reports for each project
        for (const { project, period } of projectsDue) {
          try {
            await generateDonorReport(entity.id, project.id, period);
            reportsGenerated++;

            logger.info("Donor report generated", {
              entityId: entity.id,
              projectId: project.id,
              projectName: project.projectName,
              period,
              reportingFormat: project.reportingFormat,
            });
          } catch (error) {
            logger.error("Failed to generate donor report for project", {
              entityId: entity.id,
              projectId: project.id,
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue with other projects — don't fail the whole entity
          }
        }

        totalReportsGenerated += reportsGenerated;
        results.push({
          entityId: entity.id,
          success: true,
          reportsGenerated,
        });
        succeeded++;

        logger.info("Entity donor reports completed", {
          entityId: entity.id,
          projectsDue: projectsDue.length,
          reportsGenerated,
        });
      } catch (error) {
        failed++;
        results.push({ entityId: entity.id, success: false, reportsGenerated: 0 });
        logger.error("Entity donor report generation failed", {
          entityId: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Donor report generation completed", {
      totalEntities: activeEntities.length,
      succeeded,
      failed,
      totalReportsGenerated,
    });

    return {
      success: failed === 0,
      entitiesProcessed: activeEntities.length,
      succeeded,
      failed,
      totalReportsGenerated,
      results,
    };
  },
});
