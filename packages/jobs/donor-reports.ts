import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { sendEmail } from "./lib/email";
import { db } from "@xenboox/db";
import { entities } from "@xenboox/db/schema";
import { customers } from "@xenboox/db/schema/ap-ar";
import { eq, and } from "drizzle-orm";
import { getJobAppUrl } from "./lib/app-url";
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
            const report = await generateDonorReport(entity.id, project.id, period);
            reportsGenerated++;

            logger.info("Donor report generated", {
              entityId: entity.id,
              projectId: project.id,
              projectName: project.projectName,
              period,
              reportingFormat: project.reportingFormat,
            });

            // Send email to the donor
            try {
              const donor = await db.query.customers.findFirst({
                where: and(
                  eq(customers.id, project.donorCustomerId),
                  eq(customers.entityId, entity.id),
                ),
              });

              if (donor?.email) {
                const baseUrl = getJobAppUrl();
                const portalUrl = `${baseUrl}/donor-portal?email=${encodeURIComponent(donor.email)}&entity=${entity.id}`;

                const bva = report.budgetVsActual;
                const totalBudgeted = bva.totalBudgeted;
                const totalActual = bva.totalActual;
                const totalVariance = bva.totalVariance;
                const variancePct = totalBudgeted > 0 ? ((totalVariance / totalBudgeted) * 100).toFixed(1) : "0";

                const html = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h1 style="color: #0f172a; font-size: 20px; margin-bottom: 4px;">Donor Report Ready</h1>
                      <p style="color: #64748b; font-size: 14px;">${project.projectName}</p>
                    </div>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Period: <strong style="color: #0f172a;">${period}</strong></p>
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Format: <strong style="color: #0f172a;">${project.reportingFormat.toUpperCase()}</strong></p>
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Budgeted: <strong style="color: #0f172a;">${totalBudgeted.toLocaleString()}</strong></p>
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Actual: <strong style="color: #0f172a;">${totalActual.toLocaleString()}</strong></p>
                      <p style="margin: 0; color: ${totalVariance > 0 ? '#dc2626' : '#16a34a'}; font-size: 13px;">Variance: <strong>${totalVariance > 0 ? '+' : ''}${totalVariance.toLocaleString()} (${variancePct}%)</strong></p>
                    </div>
                    ${report.narrativeSummary ? `<p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">${report.narrativeSummary}</p>` : ''}
                    <div style="text-align: center; margin-bottom: 24px;">
                      <a href="${portalUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px;">View Full Report</a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">This report was generated by Xenboox AI for ${entity.name || 'your organization'}.</p>
                  </div>
                `;

                const sent = await sendEmail({
                  to: donor.email,
                  subject: `Donor Report — ${project.projectName} (${period})`,
                  html,
                });

                if (sent) {
                  logger.info("Donor report email sent", {
                    entityId: entity.id,
                    projectId: project.id,
                    email: donor.email,
                    period,
                  });
                } else {
                  logger.warn("Failed to send donor report email", {
                    entityId: entity.id,
                    projectId: project.id,
                    email: donor.email,
                  });
                }
              }
            } catch (emailError) {
              // Non-fatal: report was generated, email is best-effort
              logger.warn("Donor report email error (non-fatal)", {
                entityId: entity.id,
                projectId: project.id,
                error: emailError instanceof Error ? emailError.message : String(emailError),
              });
            }
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
