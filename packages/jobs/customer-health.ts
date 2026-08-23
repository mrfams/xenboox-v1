import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";

export const calculateCustomerHealth = task({
  id: "calculate-customer-health",
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
    task: "calculate-customer-health",
    type: "data_validation",
    severity: "medium",
    title: () => "Customer health calculation failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    logger.info("Starting customer health calculation", { triggeredAt });

    const { calculateAllCustomerHealthScores } = await import(
      "@/lib/customer-health"
    );

    const scores = await calculateAllCustomerHealthScores();

    const healthy = scores.filter((s) => s.status === "healthy").length;
    const atRisk = scores.filter((s) => s.status === "at_risk").length;
    const critical = scores.filter((s) => s.status === "critical").length;

    logger.info("Customer health calculation completed", {
      total: scores.length,
      healthy,
      atRisk,
      critical,
      avgScore:
        scores.length > 0
          ? Math.round(
              scores.reduce((sum, s) => sum + s.overallScore, 0) /
                scores.length,
            )
          : 0,
    });

    return {
      success: true,
      total: scores.length,
      healthy,
      atRisk,
      critical,
      scores: scores.slice(0, 10), // Return top 10 for logging
    };
  },
});
