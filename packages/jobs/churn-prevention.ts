import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";

export const checkChurnRisk = task({
  id: "check-churn-risk",
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
    task: "check-churn-risk",
    type: "data_validation",
    severity: "medium",
    title: () => "Churn prevention check failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    logger.info("Starting churn prevention check", { triggeredAt });

    const { getChurnPreventionSummary } = await import(
      "@/lib/churn-prevention"
    );

    const summary = await getChurnPreventionSummary();

    logger.info("Churn prevention check completed", {
      totalAtRisk: summary.totalAtRisk,
      nudges: summary.nudges,
      outreach: summary.outreach,
      rescue: summary.rescue,
      recentInterventions: summary.recentInterventions,
    });

    // Log high-priority rescues
    for (const user of summary.riskUsers.filter(
      (u) => u.riskLevel === "rescue",
    )) {
      logger.warn(
        {
          userId: user.userId,
          email: user.email,
          score: user.healthScore.overallScore,
          daysSinceLastLogin: user.daysSinceLastLogin,
        },
        "CRITICAL: User needs immediate rescue intervention",
      );
    }

    return {
      success: true,
      totalAtRisk: summary.totalAtRisk,
      nudges: summary.nudges,
      outreach: summary.outreach,
      rescue: summary.rescue,
      recentInterventions: summary.recentInterventions,
    };
  },
});
