import { z } from "zod";
import { router, adminProtectedProcedure } from "@/lib/trpc/server";
import {
  calculateCustomerHealthScore,
  calculateAllCustomerHealthScores,
  type CustomerHealthScore,
} from "@/lib/customer-health";
import {
  detectAtRiskUsers,
  logIntervention,
  getChurnPreventionSummary,
  type ChurnRiskUser,
  type ChurnPreventionSummary,
} from "@/lib/churn-prevention";
import { logger } from "@/lib/logger";

export const customerHealthRouter = router({
  /**
   * Get health score for a specific user
   */
  getUserHealth: adminProtectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const score = await calculateCustomerHealthScore(input.userId);
      return score;
    }),

  /**
   * Get all customer health scores with summary
   */
  getOverview: adminProtectedProcedure.query(async () => {
    const scores = await calculateAllCustomerHealthScores();

    const healthy = scores.filter((s) => s.status === "healthy").length;
    const atRisk = scores.filter((s) => s.status === "at_risk").length;
    const critical = scores.filter((s) => s.status === "critical").length;
    const avgScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length,
          )
        : 0;

    return {
      summary: {
        total: scores.length,
        healthy,
        atRisk,
        critical,
        avgScore,
      },
      scores,
    };
  }),

  /**
   * Get churn prevention summary with at-risk users
   */
  getChurnRisk: adminProtectedProcedure.query(async () => {
    const summary = await getChurnPreventionSummary();
    return summary;
  }),

  /**
   * Log a churn prevention intervention
   */
  logIntervention: adminProtectedProcedure
    .input(
      z.object({
        userId: z.string(),
        tier: z.enum(["nudge", "outreach", "rescue"]),
        action: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await logIntervention(
        input.userId,
        input.tier,
        input.action,
        input.notes,
      );

      logger.info(
        {
          userId: input.userId,
          tier: input.tier,
          action: input.action,
        },
        "Churn prevention intervention logged via admin",
      );

      return { success: true };
    }),

  /**
   * Get health score distribution for charts
   */
  getDistribution: adminProtectedProcedure.query(async () => {
    const scores = await calculateAllCustomerHealthScores();

    // Bucket scores into ranges
    const distribution = {
      excellent: scores.filter((s) => s.overallScore >= 80).length, // 80-100
      good: scores.filter((s) => s.overallScore >= 60 && s.overallScore < 80)
        .length, // 60-79
      fair: scores.filter((s) => s.overallScore >= 40 && s.overallScore < 60)
        .length, // 40-59
      poor: scores.filter((s) => s.overallScore >= 20 && s.overallScore < 40)
        .length, // 20-39
      critical: scores.filter((s) => s.overallScore < 20).length, // 0-19
    };

    // Component averages
    const componentAverages = {
      productUsage: 0,
      engagement: 0,
      financialHealth: 0,
      support: 0,
    };

    if (scores.length > 0) {
      componentAverages.productUsage = Math.round(
        scores.reduce((sum, s) => sum + s.components.productUsage.score, 0) /
          scores.length,
      );
      componentAverages.engagement = Math.round(
        scores.reduce((sum, s) => sum + s.components.engagement.score, 0) /
          scores.length,
      );
      componentAverages.financialHealth = Math.round(
        scores.reduce((sum, s) => sum + s.components.financialHealth.score, 0) /
          scores.length,
      );
      componentAverages.support = Math.round(
        scores.reduce((sum, s) => sum + s.components.support.score, 0) /
          scores.length,
      );
    }

    return {
      distribution,
      componentAverages,
      total: scores.length,
    };
  }),
});
