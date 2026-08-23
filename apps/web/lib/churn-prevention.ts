/**
 * Churn Prevention System
 *
 * Detects at-risk customers using health scores and triggers interventions.
 * Works with the health scoring system to prevent cancellations.
 *
 * Intervention tiers:
 *   1. Nudge (score 50-69): In-app tip, feature suggestion
 *   2. Outreach (score 30-49): Email from success team
 *   3. Rescue (score 0-29): Personal call, discount offer, escalation
 *
 * All actions logged to audit trail for tracking.
 */

import { db } from "@/lib/db";
import { users, auditLog, entities } from "@xenboox/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  calculateCustomerHealthScore,
  type CustomerHealthScore,
} from "./customer-health";

// ─── Types ──────────────────────────────────────────────────────────────

export type InterventionTier = "nudge" | "outreach" | "rescue";

export type ChurnRiskUser = {
  userId: string;
  email: string;
  name: string | null;
  healthScore: CustomerHealthScore;
  riskLevel: InterventionTier;
  daysSinceSignup: number;
  daysSinceLastLogin: number | null;
  recommendedActions: string[];
  lastIntervention: Date | null;
  interventionCount: number;
};

export type ChurnPreventionSummary = {
  totalAtRisk: number;
  nudges: number;
  outreach: number;
  rescue: number;
  recentInterventions: number;
  riskUsers: ChurnRiskUser[];
};

// ─── Risk Detection ─────────────────────────────────────────────────────

function determineRiskTier(
  score: number,
  daysSinceSignup: number,
  lastLoginDays: number | null,
): InterventionTier {
  // New users (signed up < 7 days) get more lenient thresholds
  if (daysSinceSignup < 7) {
    if (score < 30) return "outreach";
    return "nudge";
  }

  // Established users
  if (score < 30) return "rescue";
  if (score < 50) return "outreach";
  return "nudge";
}

function generateRecommendedActions(
  healthScore: CustomerHealthScore,
  tier: InterventionTier,
): string[] {
  const actions: string[] = [];

  // Product usage actions
  if (healthScore.components.productUsage.score < 30) {
    actions.push("Send 'Getting Started' email with quick-win tips");
    actions.push("Schedule onboarding call");
  }

  // Engagement actions
  if (healthScore.components.engagement.score < 25) {
    actions.push("Show in-app tour of underused features");
    actions.push("Send AI success stories email");
  }

  // Bank connection
  if (!healthScore.positiveFactors.includes("Bank account connected")) {
    actions.push("Send bank connection guide");
    actions.push("Offer 1:1 setup assistance");
  }

  // AI usage
  if (healthScore.components.engagement.score < 40) {
    actions.push("Highlight AI auto-categorization benefit");
    actions.push("Send '5 things AI can do for you' email");
  }

  // Tier-specific actions
  if (tier === "rescue") {
    actions.push("Personal phone call from success team");
    actions.push("Offer extended trial or discount");
    actions.push("Schedule executive business review");
  } else if (tier === "outreach") {
    actions.push("Send personalized check-in email");
    actions.push("Invite to upcoming webinar");
  }

  return actions;
}

// ─── At-Risk User Detection ─────────────────────────────────────────────

export async function detectAtRiskUsers(): Promise<ChurnRiskUser[]> {
  // Get all users
  const allUsers = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      lastLoginAt: true,
    },
    limit: 1000,
  });

  const atRiskUsers: ChurnRiskUser[] = [];

  for (const user of allUsers) {
    const healthScore = await calculateCustomerHealthScore(user.id);
    if (!healthScore) continue;

    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const daysSinceLastLogin = user.lastLoginAt
      ? Math.floor(
          (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    // Only include users who are at risk (score < 80)
    if (healthScore.overallScore >= 80) continue;

    const tier = determineRiskTier(
      healthScore.overallScore,
      daysSinceSignup,
      daysSinceLastLogin,
    );

    // Check last intervention
    const lastIntervention = await db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.userId, user.id),
        sql`${auditLog.action} LIKE 'churn_prevention.%'`,
      ),
      orderBy: [auditLog.timestamp],
      columns: { timestamp: true },
    });

    // Count interventions
    const interventionCount = await db
      .select({ value: count() })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.userId, user.id),
          sql`${auditLog.action} LIKE 'churn_prevention.%'`,
        ),
      );

    atRiskUsers.push({
      userId: user.id,
      email: user.email ?? "",
      name: user.name,
      healthScore,
      riskLevel: tier,
      daysSinceSignup,
      daysSinceLastLogin,
      recommendedActions: generateRecommendedActions(healthScore, tier),
      lastIntervention: lastIntervention?.timestamp ?? null,
      interventionCount: interventionCount[0]?.value ?? 0,
    });
  }

  // Sort by score ascending (most at-risk first)
  atRiskUsers.sort(
    (a, b) => a.healthScore.overallScore - b.healthScore.overallScore,
  );

  return atRiskUsers;
}

// ─── Intervention Logging ───────────────────────────────────────────────

export async function logIntervention(
  userId: string,
  tier: InterventionTier,
  action: string,
  notes?: string,
): Promise<void> {
  await db.insert(auditLog).values({
    entityId: "", // System-level intervention
    userId,
    action: `churn_prevention.${tier}`,
    entityType: "user",
    entityIdRef: userId,
    changes: {
      intervention: action,
      tier,
      notes,
      timestamp: new Date().toISOString(),
    },
    confidence: 1.0,
    source: "churn_prevention_system",
  });

  logger.info({ userId, tier, action }, "Churn prevention intervention logged");
}

// ─── Summary ────────────────────────────────────────────────────────────

export async function getChurnPreventionSummary(): Promise<ChurnPreventionSummary> {
  const riskUsers = await detectAtRiskUsers();

  const nudges = riskUsers.filter((u) => u.riskLevel === "nudge").length;
  const outreach = riskUsers.filter((u) => u.riskLevel === "outreach").length;
  const rescue = riskUsers.filter((u) => u.riskLevel === "rescue").length;

  // Count interventions in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentInterventions = await db
    .select({ value: count() })
    .from(auditLog)
    .where(
      and(
        sql`${auditLog.action} LIKE 'churn_prevention.%'`,
        sql`${auditLog.timestamp} >= ${sevenDaysAgo}`,
      ),
    );

  return {
    totalAtRisk: riskUsers.length,
    nudges,
    outreach,
    rescue,
    recentInterventions: recentInterventions[0]?.value ?? 0,
    riskUsers,
  };
}
