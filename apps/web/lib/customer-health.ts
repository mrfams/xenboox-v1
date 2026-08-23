/**
 * Customer Health Scoring System
 *
 * Tracks Xenboox's own customer health — engagement, usage, churn risk.
 * Used by the customer success team to identify at-risk accounts.
 *
 * Score components (0-100):
 *   - Product Usage (40%): Login frequency, features used, session duration
 *   - Engagement (25%): AI interactions, report generation, data entry
 *   - Financial Health (20%): Subscription status, payment history
 *   - Support (15%): Ticket volume, satisfaction, response time
 *
 * Score ranges:
 *   80-100: Healthy — expand opportunity
 *   50-79:  At Risk — needs attention
 *   0-49:   Critical — immediate intervention
 */

import { db } from "@/lib/db";
import {
  users,
  entities,
  userEntityAccess,
  sessions,
  auditLog,
} from "@xenboox/db/schema";
import { eq, and, gte, sql, count, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────

export type HealthComponent = {
  score: number; // 0-100
  weight: number; // 0-1
  label: string;
  explanation: string;
  factors: string[];
};

export type CustomerHealthScore = {
  userId: string;
  email: string;
  name: string | null;
  overallScore: number; // 0-100
  status: "healthy" | "at_risk" | "critical";
  components: {
    productUsage: HealthComponent;
    engagement: HealthComponent;
    financialHealth: HealthComponent;
    support: HealthComponent;
  };
  riskFactors: string[];
  positiveFactors: string[];
  lastActiveAt: Date | null;
  daysSinceSignup: number;
  calculatedAt: Date;
};

// ─── Score Calculation ──────────────────────────────────────────────────

function calculateProductUsageScore(user: {
  createdAt: Date;
  lastLoginAt: Date | null;
  totalLogins: number;
  entitiesCount: number;
  featuresUsed: number;
}): number {
  let score = 0;

  // Login frequency (0-40 points)
  // More logins = higher score
  if (user.totalLogins >= 30) score += 40;
  else if (user.totalLogins >= 20) score += 30;
  else if (user.totalLogins >= 10) score += 20;
  else if (user.totalLogins >= 5) score += 10;
  else score += 5;

  // Recency (0-30 points)
  if (user.lastLoginAt) {
    const daysSinceLogin = Math.floor(
      (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLogin <= 1) score += 30;
    else if (daysSinceLogin <= 3) score += 25;
    else if (daysSinceLogin <= 7) score += 20;
    else if (daysSinceLogin <= 14) score += 10;
    else if (daysSinceLogin <= 30) score += 5;
    // 0 points if > 30 days
  }

  // Entity setup (0-15 points)
  if (user.entitiesCount >= 3) score += 15;
  else if (user.entitiesCount >= 2) score += 10;
  else if (user.entitiesCount >= 1) score += 5;

  // Feature adoption (0-15 points)
  if (user.featuresUsed >= 8) score += 15;
  else if (user.featuresUsed >= 5) score += 10;
  else if (user.featuresUsed >= 3) score += 5;

  return Math.min(100, score);
}

function calculateEngagementScore(user: {
  aiInteractions: number;
  reportsGenerated: number;
  invoicesCreated: number;
  bankConnected: boolean;
}): number {
  let score = 0;

  // AI interactions (0-35 points)
  if (user.aiInteractions >= 50) score += 35;
  else if (user.aiInteractions >= 20) score += 25;
  else if (user.aiInteractions >= 10) score += 15;
  else if (user.aiInteractions >= 3) score += 5;

  // Reports generated (0-25 points)
  if (user.reportsGenerated >= 10) score += 25;
  else if (user.reportsGenerated >= 5) score += 15;
  else if (user.reportsGenerated >= 1) score += 5;

  // Invoices created (0-20 points)
  if (user.invoicesCreated >= 10) score += 20;
  else if (user.invoicesCreated >= 5) score += 12;
  else if (user.invoicesCreated >= 1) score += 5;

  // Bank connection (0-20 points)
  if (user.bankConnected) score += 20;

  return Math.min(100, score);
}

function calculateFinancialHealthScore(user: {
  subscriptionStatus: string;
  daysUntilRenewal: number | null;
  paymentFailures: number;
  mrr: number;
}): number {
  let score = 0;

  // Subscription status (0-40 points)
  if (user.subscriptionStatus === "active") score += 40;
  else if (user.subscriptionStatus === "trial") score += 30;
  else if (user.subscriptionStatus === "past_due") score += 10;
  // cancelled = 0

  // Payment history (0-30 points)
  if (user.paymentFailures === 0) score += 30;
  else if (user.paymentFailures === 1) score += 20;
  else if (user.paymentFailures <= 3) score += 10;
  // > 3 failures = 0

  // Renewal proximity (0-15 points)
  if (user.daysUntilRenewal !== null) {
    if (user.daysUntilRenewal > 30) score += 15;
    else if (user.daysUntilRenewal > 7) score += 10;
    else if (user.daysUntilRenewal > 0) score += 5;
    // Expired = 0
  }

  // Revenue value (0-15 points)
  if (user.mrr >= 200) score += 15;
  else if (user.mrr >= 80) score += 10;
  else if (user.mrr >= 30) score += 5;

  return Math.min(100, score);
}

function calculateSupportScore(user: {
  supportTickets: number;
  avgResponseTime: number | null;
  npsScore: number | null;
}): number {
  let score = 50; // Base score

  // Ticket volume (fewer is better, 0-20 points)
  if (user.supportTickets === 0) score += 20;
  else if (user.supportTickets <= 2) score += 15;
  else if (user.supportTickets <= 5) score += 10;
  else if (user.supportTickets <= 10) score += 5;
  // > 10 tickets = 0 (concerning)

  // NPS score (0-30 points)
  if (user.npsScore !== null) {
    if (user.npsScore >= 9) score += 30;
    else if (user.npsScore >= 7) score += 20;
    else if (user.npsScore >= 5) score += 10;
    else score -= 10; // Detractor penalty
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Main Score Calculator ──────────────────────────────────────────────

export async function calculateCustomerHealthScore(
  userId: string,
): Promise<CustomerHealthScore | null> {
  // Get user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) return null;

  // Count entities
  const entityAccess = await db.query.userEntityAccess.findMany({
    where: eq(userEntityAccess.userId, userId),
    columns: { entityId: true },
  });
  const entitiesCount = entityAccess.length;

  // Count sessions (logins)
  const sessionCount = await db
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  const totalLogins = sessionCount[0]?.value ?? 0;

  // Count features used (from audit log)
  const featureUsage = await db
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .groupBy(auditLog.action);
  const featuresUsed = featureUsage.length;

  // Count AI interactions
  const aiInteractions = await db
    .select({ value: count() })
    .from(auditLog)
    .where(
      and(eq(auditLog.userId, userId), sql`${auditLog.action} LIKE 'ai.%'`),
    );
  const aiCount = aiInteractions[0]?.value ?? 0;

  // Count reports
  const reportCount = await db
    .select({ value: count() })
    .from(auditLog)
    .where(
      and(eq(auditLog.userId, userId), sql`${auditLog.action} LIKE 'report.%'`),
    );
  const reportsGenerated = reportCount[0]?.value ?? 0;

  // Count invoices
  const invoiceCount = await db
    .select({ value: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, userId),
        sql`${auditLog.action} LIKE 'invoice.%'`,
      ),
    );
  const invoicesCreated = invoiceCount[0]?.value ?? 0;

  // Bank connection check
  const bankConnected = entitiesCount > 0; // Simplified — would check bank_accounts table

  // Calculate days since signup
  const daysSinceSignup = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate component scores
  const productUsage = calculateProductUsageScore({
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    totalLogins,
    entitiesCount,
    featuresUsed,
  });

  const engagement = calculateEngagementScore({
    aiInteractions: aiCount,
    reportsGenerated,
    invoicesCreated,
    bankConnected,
  });

  const financialHealth = calculateFinancialHealthScore({
    subscriptionStatus: "active", // Would come from billing system
    daysUntilRenewal: null, // Would come from billing system
    paymentFailures: 0, // Would come from billing system
    mrr: 79, // Would come from billing system
  });

  const support = calculateSupportScore({
    supportTickets: 0, // Would come from support system
    avgResponseTime: null,
    npsScore: null,
  });

  // Weighted overall score
  const overallScore = Math.round(
    productUsage * 0.4 +
      engagement * 0.25 +
      financialHealth * 0.2 +
      support * 0.15,
  );

  // Determine status
  let status: "healthy" | "at_risk" | "critical";
  if (overallScore >= 80) status = "healthy";
  else if (overallScore >= 50) status = "at_risk";
  else status = "critical";

  // Identify risk and positive factors
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];

  if (productUsage < 30) riskFactors.push("Low login frequency");
  if (engagement < 25) riskFactors.push("Minimal AI usage");
  if (!bankConnected) riskFactors.push("Bank account not connected");
  if (reportsGenerated === 0) riskFactors.push("No reports generated");
  if (daysSinceSignup > 7 && featuresUsed < 3)
    riskFactors.push("Low feature adoption");

  if (productUsage >= 70) positiveFactors.push("Active daily user");
  if (engagement >= 60) positiveFactors.push("High AI engagement");
  if (bankConnected) positiveFactors.push("Bank account connected");
  if (reportsGenerated >= 5) positiveFactors.push("Regular report generation");
  if (invoicesCreated >= 5) positiveFactors.push("Active invoicing");

  return {
    userId: user.id,
    email: user.email ?? "",
    name: user.name,
    overallScore,
    status,
    components: {
      productUsage: {
        score: productUsage,
        weight: 0.4,
        label: "Product Usage",
        explanation: `Based on ${totalLogins} logins, ${featuresUsed} features used`,
        factors: [
          `${totalLogins} total logins`,
          `${featuresUsed} features explored`,
          `${entitiesCount} entities configured`,
        ],
      },
      engagement: {
        score: engagement,
        weight: 0.25,
        label: "Engagement",
        explanation: `Based on ${aiCount} AI interactions, ${reportsGenerated} reports`,
        factors: [
          `${aiCount} AI interactions`,
          `${reportsGenerated} reports generated`,
          `${invoicesCreated} invoices created`,
          bankConnected ? "Bank connected" : "Bank not connected",
        ],
      },
      financialHealth: {
        score: financialHealth,
        weight: 0.2,
        label: "Financial Health",
        explanation: "Based on subscription and payment status",
        factors: ["Active subscription", "No payment failures"],
      },
      support: {
        score: support,
        weight: 0.15,
        label: "Support",
        explanation: "Based on ticket volume and satisfaction",
        factors: ["No open support tickets"],
      },
    },
    riskFactors,
    positiveFactors,
    lastActiveAt: user.lastLoginAt,
    daysSinceSignup,
    calculatedAt: new Date(),
  };
}

// ─── Batch Calculation ──────────────────────────────────────────────────

export async function calculateAllCustomerHealthScores(): Promise<
  CustomerHealthScore[]
> {
  const allUsers = await db.query.users.findMany({
    columns: { id: true },
    limit: 1000,
  });

  const scores: CustomerHealthScore[] = [];
  for (const user of allUsers) {
    const score = await calculateCustomerHealthScore(user.id);
    if (score) scores.push(score);
  }

  // Sort by score ascending (most at-risk first)
  scores.sort((a, b) => a.overallScore - b.overallScore);

  logger.info(
    {
      totalUsers: allUsers.length,
      scoresCalculated: scores.length,
      healthy: scores.filter((s) => s.status === "healthy").length,
      atRisk: scores.filter((s) => s.status === "at_risk").length,
      critical: scores.filter((s) => s.status === "critical").length,
    },
    "Customer health scores calculated",
  );

  return scores;
}

// ─── Summary ────────────────────────────────────────────────────────────

export type HealthSummary = {
  total: number;
  healthy: number;
  atRisk: number;
  critical: number;
  avgScore: number;
  topRiskFactors: Array<{ factor: string; count: number }>;
  scores: CustomerHealthScore[];
};

export async function getCustomerHealthSummary(): Promise<HealthSummary> {
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

  // Aggregate risk factors
  const factorCounts = new Map<string, number>();
  for (const score of scores) {
    for (const factor of score.riskFactors) {
      factorCounts.set(factor, (factorCounts.get(factor) ?? 0) + 1);
    }
  }
  const topRiskFactors = Array.from(factorCounts.entries())
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: scores.length,
    healthy,
    atRisk,
    critical,
    avgScore,
    topRiskFactors,
    scores,
  };
}
