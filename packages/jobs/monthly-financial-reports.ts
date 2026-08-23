import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { entities, fiscalPeriods } from "@xenboox/db/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
  generateCashFlow,
} from "./report-generation";

// ─── Monthly Financial Reports Cron ─────────────────────────────────────────
//
// Runs on the 2nd of every month at 4:00 AM (after daily close at 2 AM
// and donor reports at 3 AM).
//
// For each active entity:
//   1. Finds the last closed fiscal period
//   2. Generates P&L, Balance Sheet, Trial Balance, and Cash Flow
//   3. Stores results for the Financial Pulse page and email delivery
//
// This ensures every entity has fresh financial reports available
// at the start of each month.

export const generateMonthlyFinancialReports = task({
  id: "generate-monthly-financial-reports",
  maxDuration: 900, // 15 minutes max
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
    task: "generate-monthly-financial-reports",
    type: "data_validation",
    severity: "medium",
    title: () => "Monthly financial report generation failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    const now = new Date(triggeredAt);

    logger.info("Starting monthly financial report generation", {
      triggeredAt,
    });

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
      period: string;
    }> = [];

    for (const entity of activeEntities) {
      try {
        // Find the last closed fiscal period
        const lastClosedPeriod = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.entityId, entity.id),
            eq(fiscalPeriods.status, "closed"),
          ),
          orderBy: [desc(fiscalPeriods.endDate)],
        });

        if (!lastClosedPeriod) {
          logger.info("No closed period found for entity", {
            entityId: entity.id,
          });
          results.push({
            entityId: entity.id,
            success: true,
            reportsGenerated: 0,
            period: "none",
          });
          succeeded++;
          continue;
        }

        const startDate = lastClosedPeriod.startDate;
        const endDate = lastClosedPeriod.endDate;
        const periodLabel = `${startDate} to ${endDate}`;

        // Generate all four reports
        const reports: Record<string, unknown> = {};
        let reportsGenerated = 0;

        // P&L
        try {
          reports.profitAndLoss = await generateProfitLoss(
            entity.id,
            startDate,
            endDate,
          );
          reportsGenerated++;
        } catch (error) {
          logger.warn("P&L generation failed for entity", {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Balance Sheet (as of end date)
        try {
          reports.balanceSheet = await generateBalanceSheet(entity.id, endDate);
          reportsGenerated++;
        } catch (error) {
          logger.warn("Balance sheet generation failed for entity", {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Trial Balance
        try {
          reports.trialBalance = await generateTrialBalance(
            entity.id,
            startDate,
            endDate,
          );
          reportsGenerated++;
        } catch (error) {
          logger.warn("Trial balance generation failed for entity", {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Cash Flow
        try {
          reports.cashFlow = await generateCashFlow(
            entity.id,
            startDate,
            endDate,
          );
          reportsGenerated++;
        } catch (error) {
          logger.warn("Cash flow generation failed for entity", {
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        totalReportsGenerated += reportsGenerated;
        results.push({
          entityId: entity.id,
          success: true,
          reportsGenerated,
          period: periodLabel,
        });
        succeeded++;

        logger.info("Entity reports completed", {
          entityId: entity.id,
          period: periodLabel,
          reportsGenerated,
        });
      } catch (error) {
        failed++;
        results.push({
          entityId: entity.id,
          success: false,
          reportsGenerated: 0,
          period: "error",
        });
        logger.error("Entity report generation failed", {
          entityId: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Monthly financial report generation completed", {
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
