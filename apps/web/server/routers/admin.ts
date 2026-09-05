import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, count, sum, sql } from "drizzle-orm";
import { users } from "@xenboox/db/schema/auth";
import {
  organizations,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { bankAccounts } from "@xenboox/db/schema/treasury";
import { documents } from "@xenboox/db/schema/documents";
import { agentActivity } from "@xenboox/db/schema/documents";
import {
  featureFlags,
  featureFlagAuditLog,
} from "@xenboox/db/schema/ops-feature-flags";
import { opsTokenByModel } from "@xenboox/db/schema/ops-token-usage";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  handleMutationError,
  router,
  protectedProcedure,
  adminProtectedProcedure,
} from "@/lib/trpc/server";

export type AIProvider =
  | "anthropic"
  | "openai"
  | "azure"
  | "deepseek"
  | "glm"
  | "minimax"
  | "qwen"
  | "kiwi"
  | "cohere"
  | "mistral"
  | "together"
  | "replicate"
  | "self-hosted";
export type DeploymentMode = "api" | "self-hosted" | "hybrid";
export type HostingProvider =
  | "aws"
  | "gcp"
  | "azure"
  | "lambda"
  | "modal"
  | "replicate"
  | "together"
  | "runpod"
  | "vastai";

export type AIComparison = {
  provider: AIProvider;
  model: string;
  deploymentMode: DeploymentMode;
  costPerMTokens: number;
  selfHostCostPerMonth: number;
  hostingProvider?: HostingProvider;
  /** Observed average latency — null when no real usage has been recorded. */
  avgLatencyMs: number | null;
  /** Observed success rate — null when no real usage has been recorded. */
  successRate: number | null;
  monthlySpend: number;
  monthlyTokens: number;
  budgetLimit: number;
  threshold80: number;
  recommendedAt80: number;
  recommendedAt90: number;
  utilization: number;
  breakEvenTokens: number;
  recommendation: "api" | "self-host" | "hybrid";
  totalCost?: number;
  /** True when real usage data exists for this model in the last 30 days. */
  hasUsage?: boolean;
};

export type SelfHostedModel = {
  provider: "self-hosted";
  model: string;
  costPer1kTokens: number;
  selfHostCostPerMonth: number;
  avgLatencyMs: number;
  successRate: number;
  monthlySpend: number;
  monthlyTokens: number;
  budgetLimit: number;
  utilization: number;
  breakEvenTokens: number;
  recommendation: "self-host";
};

export type CostComparison = {
  provider: AIProvider;
  model: string;
  apiCost: number;
  selfHostCost: number;
  totalTokens: number;
  breakEvenPoint: number;
  recommendation: "api" | "self-host" | "hybrid";
  monthlySavings: number;
};

export type SpendAlert = {
  provider: AIProvider;
  model: string;
  currentSpend: number;
  budgetLimit: number;
  percentage: number;
  alertLevel: "low" | "warning" | "critical";
};

/**
 * Model unit-economics configuration: pricing, self-host cost, and budget
 * limits. These are admin-maintained configuration values, not telemetry.
 * Every usage figure (spend, tokens) surfaced by the admin AI pages is
 * computed from real recorded usage (ops_token_by_model, trailing 30 days)
 * at query time — previously these numbers were fabricated constants.
 */
const MODEL_CATALOG: Array<{
  provider: AIProvider;
  model: string;
  deploymentMode: DeploymentMode;
  costPerMTokens: number;
  selfHostCostPerMonth: number;
  hostingProvider?: HostingProvider;
  budgetLimit: number;
}> = [
  {
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    deploymentMode: "api",
    costPerMTokens: 3.0,
    selfHostCostPerMonth: 2500,
    hostingProvider: "aws",
    budgetLimit: 25000,
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4.5",
    deploymentMode: "api",
    costPerMTokens: 0.3,
    selfHostCostPerMonth: 500,
    hostingProvider: "aws",
    budgetLimit: 5000,
  },
  {
    provider: "openai",
    model: "gpt-4.1",
    deploymentMode: "api",
    costPerMTokens: 15.0,
    selfHostCostPerMonth: 5000,
    hostingProvider: "aws",
    budgetLimit: 20000,
  },
  {
    provider: "deepseek",
    model: "deepseek-v4-pro",
    deploymentMode: "api",
    costPerMTokens: 8.0,
    selfHostCostPerMonth: 1500,
    hostingProvider: "aws",
    budgetLimit: 15000,
  },
  {
    provider: "deepseek",
    model: "deepseek-v4-coder",
    deploymentMode: "api",
    costPerMTokens: 8.0,
    selfHostCostPerMonth: 1500,
    hostingProvider: "aws",
    budgetLimit: 12000,
  },
  {
    provider: "deepseek",
    model: "deepseek-m3",
    deploymentMode: "api",
    costPerMTokens: 6.0,
    selfHostCostPerMonth: 1500,
    hostingProvider: "aws",
    budgetLimit: 15000,
  },
  {
    provider: "glm",
    model: "glm-5.2-flash",
    deploymentMode: "api",
    costPerMTokens: 1.2,
    selfHostCostPerMonth: 1000,
    hostingProvider: "aws",
    budgetLimit: 10000,
  },
  {
    provider: "glm",
    model: "glm-5.2-pro",
    deploymentMode: "api",
    costPerMTokens: 3.0,
    selfHostCostPerMonth: 1000,
    hostingProvider: "aws",
    budgetLimit: 15000,
  },
  {
    provider: "qwen",
    model: "qwen3-72b",
    deploymentMode: "api",
    costPerMTokens: 6.0,
    selfHostCostPerMonth: 1500,
    hostingProvider: "aws",
    budgetLimit: 15000,
  },
  {
    provider: "minimax",
    model: "minimax-m3",
    deploymentMode: "api",
    costPerMTokens: 5.0,
    selfHostCostPerMonth: 1200,
    hostingProvider: "aws",
    budgetLimit: 12000,
  },
  {
    provider: "kiwi",
    model: "kiwi-72b-v2",
    deploymentMode: "self-hosted",
    costPerMTokens: 0,
    selfHostCostPerMonth: 2200,
    hostingProvider: "runpod",
    budgetLimit: 8000,
  },
  {
    provider: "cohere",
    model: "command-r-plus",
    deploymentMode: "api",
    costPerMTokens: 3.0,
    selfHostCostPerMonth: 3000,
    hostingProvider: "aws",
    budgetLimit: 20000,
  },
  {
    provider: "mistral",
    model: "mistral-large-2407",
    deploymentMode: "api",
    costPerMTokens: 2.0,
    selfHostCostPerMonth: 2500,
    hostingProvider: "aws",
    budgetLimit: 18000,
  },
  {
    provider: "together",
    model: "llama-3.3-70b",
    deploymentMode: "api",
    costPerMTokens: 1.0,
    selfHostCostPerMonth: 1800,
    hostingProvider: "together",
    budgetLimit: 12000,
  },
  {
    provider: "self-hosted",
    model: "llama-3.1-8b",
    deploymentMode: "self-hosted",
    costPerMTokens: 0,
    selfHostCostPerMonth: 800,
    hostingProvider: "vastai",
    budgetLimit: 5000,
  },
];

/** Real trailing-30-day usage per model, from the ops token ledger. */
async function getTrailing30DayModelUsage(): Promise<
  Map<string, { tokens: number; cost: number }>
> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const rows = await db
    .select({
      modelName: opsTokenByModel.modelName,
      tokens: sql<string>`COALESCE(SUM(${opsTokenByModel.totalTokens}), '0')`,
      cost: sql<string>`COALESCE(SUM(${opsTokenByModel.costUsd}), '0')`,
    })
    .from(opsTokenByModel)
    .where(sql`${opsTokenByModel.date} >= ${since}`)
    .groupBy(opsTokenByModel.modelName);
  return new Map(
    rows.map((r) => [
      r.modelName,
      { tokens: Number(r.tokens), cost: Number(r.cost) },
    ]),
  );
}

export const adminRouter = router({
  checkAccess: adminProtectedProcedure.query(async () => {
    return true;
  }),
  getSystemOverview: adminProtectedProcedure.query(async () => {
    const [
      userCount,
      orgCount,
      entityCount,
      journalCount,
      accountCount,
      bankCount,
      docCount,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(users)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(organizations)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(userEntityAccess)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(journalEntries)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(chartOfAccounts)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(bankAccounts)
        .then((r) => r[0]?.count || 0),
      db
        .select({ count: count() })
        .from(documents)
        .then((r) => r[0]?.count || 0),
    ]);

    const totalBalance = await db
      .select({
        total: sql<number>`SUM(${bankAccounts.currentBalance}::numeric)`,
      })
      .from(bankAccounts)
      .then((r) => parseFloat(String(r[0]?.total ?? "0")));

    return {
      users: userCount,
      organizations: orgCount,
      entities: entityCount,
      journalEntries: journalCount,
      chartOfAccounts: accountCount,
      bankAccounts: bankCount,
      documents: docCount,
      totalBankBalance: totalBalance,
    };
  }),

  listUsers: adminProtectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const baseQuery = db.query.users.findMany({
        with: {
          userEntityAccess: {
            with: {
              entity: true,
            },
          },
        },
        orderBy: [desc(users.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const allUsers = await db.query.users.findMany({
        with: {
          userEntityAccess: {
            with: {
              entity: true,
            },
          },
        },
        orderBy: [desc(users.createdAt)],
      });

      let filtered = allUsers;
      if (input.search) {
        const term = input.search.toLowerCase();
        filtered = allUsers.filter(
          (u) =>
            (u.name?.toLowerCase().includes(term) ?? false) ||
            u.email.toLowerCase().includes(term),
        );
      }

      const paginated = filtered.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        items: paginated,
        total: filtered.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  listOrganizations: adminProtectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const allOrgs = await db.query.organizations.findMany({
        with: {
          owner: true,
          entities: true,
        },
        orderBy: [desc(organizations.createdAt)],
      });

      let filtered = allOrgs;
      if (input.search) {
        const term = input.search.toLowerCase();
        filtered = allOrgs.filter(
          (o) =>
            o.name.toLowerCase().includes(term) ||
            o.slug.toLowerCase().includes(term),
        );
      }

      const paginated = filtered.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        items: paginated,
        total: filtered.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getAIComparison: adminProtectedProcedure.query(async () => {
    const usage = await getTrailing30DayModelUsage();

    return MODEL_CATALOG.map((c) => {
      const u = usage.get(c.model);
      const monthlySpend = u?.cost ?? 0;
      const monthlyTokens = u?.tokens ?? 0;
      const recommendation: "api" | "self-host" | "hybrid" =
        monthlySpend > 0 && c.selfHostCostPerMonth < monthlySpend * 0.7
          ? "self-host"
          : monthlySpend > 0 && c.selfHostCostPerMonth < monthlySpend
            ? "hybrid"
            : "api";

      return {
        ...c,
        monthlySpend,
        monthlyTokens,
        // No real per-model latency/success telemetry exists yet — report
        // null (rendered as "—") instead of fabricated values.
        avgLatencyMs: null,
        successRate: null,
        utilization:
          c.budgetLimit > 0 ? (monthlySpend / c.budgetLimit) * 100 : 0,
        totalCost: monthlySpend + c.selfHostCostPerMonth,
        breakEvenTokens:
          c.costPerMTokens > 0
            ? Math.ceil((c.selfHostCostPerMonth / c.costPerMTokens) * 1_000_000)
            : 0,
        recommendation,
        hasUsage: Boolean(u),
      };
    });
  }),

  getSpendAlerts: adminProtectedProcedure.query(async () => {
    const usage = await getTrailing30DayModelUsage();
    const alerts: SpendAlert[] = [];

    for (const item of MODEL_CATALOG) {
      const currentSpend = usage.get(item.model)?.cost ?? 0;
      const percentage =
        item.budgetLimit > 0 ? (currentSpend / item.budgetLimit) * 100 : 0;
      let alertLevel: "low" | "warning" | "critical" = "low";

      if (percentage >= 90) alertLevel = "critical";
      else if (percentage >= 80) alertLevel = "warning";

      alerts.push({
        provider: item.provider,
        model: item.model,
        currentSpend,
        budgetLimit: item.budgetLimit,
        percentage,
        alertLevel,
      });
    }

    return alerts.filter((a) => a.percentage >= 70);
  }),

  getAIUsage: adminProtectedProcedure.query(async () => {
    const activities = await db.query.agentActivity.findMany({
      orderBy: [desc(agentActivity.createdAt)],
      limit: 100,
    });

    const usageByAgent = activities.reduce(
      (acc, act) => {
        if (!acc[act.agentName]) {
          acc[act.agentName] = {
            count: 0,
            totalDuration: 0,
            confidenceSum: 0,
            avgConfidence: 0,
          };
        }
        acc[act.agentName].count += 1;
        acc[act.agentName].totalDuration += act.durationMs || 0;
        const confidence = act.confidence ? parseFloat(act.confidence) : 0;
        acc[act.agentName].confidenceSum += confidence;
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          totalDuration: number;
          confidenceSum: number;
          avgConfidence: number;
        }
      >,
    );

    return Object.entries(usageByAgent).map(([agent, data]) => ({
      agent,
      count: data.count,
      totalDuration: data.totalDuration,
      avgConfidence: data.count > 0 ? data.confidenceSum / data.count : 0,
      avgLatency: data.totalDuration / data.count,
    }));
  }),

  updateSettings: adminProtectedProcedure
    .input(
      z.object({
        emailAlerts: z.boolean(),
        slackAlerts: z.boolean(),
        smsAlerts: z.boolean(),
        autoScaling: z.boolean(),
        costOptimization: z.boolean(),
        providerFallback: z.boolean(),
        maintenanceMode: z.boolean(),
        debugMode: z.boolean(),
        auditLogging: z.boolean(),
        budgets: z.object({
          anthropic: z.string(),
          openai: z.string(),
          haiku: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const actor = ctx.session?.user?.email ?? "unknown";

        // Persist every setting as a platform feature flag
        // (admin.settings.*). Without this the save button lies: values
        // reset on every page load because they were never stored.
        const settings: Record<string, unknown> = { ...input };

        await db.transaction(async (tx) => {
          for (const [key, value] of Object.entries(settings)) {
            const flagKey = `admin.settings.${key}`;
            const flagValue = JSON.stringify(value);

            const [upserted] = await tx
              .insert(featureFlags)
              .values({
                key: flagKey,
                name: key,
                description: "Admin platform setting",
                status:
                  value === true ? "on" : value === false ? "off" : "scheduled",
                targetingRules: { value },
              })
              .onConflictDoUpdate({
                target: featureFlags.key,
                set: {
                  status:
                    value === true
                      ? "on"
                      : value === false
                        ? "off"
                        : "scheduled",
                  targetingRules: { value },
                  updatedAt: new Date(),
                },
              })
              .returning({ id: featureFlags.id });

            await tx.insert(featureFlagAuditLog).values({
              flagId: upserted.id,
              action: "updated",
              performedBy: actor,
              field: key,
              newValue: flagValue,
            });
          }
        });

        logger.info(
          { actor, keys: Object.keys(settings) },
          "Admin settings updated",
        );
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to update settings");
      }
    }),

  getSettings: adminProtectedProcedure.query(async () => {
    const flags = await db.query.featureFlags.findMany({
      where: sql`${featureFlags.key} LIKE 'admin.settings.%'`,
    });

    const defaults = {
      emailAlerts: true,
      slackAlerts: false,
      smsAlerts: false,
      autoScaling: false,
      costOptimization: true,
      providerFallback: true,
      maintenanceMode: false,
      debugMode: false,
      auditLogging: true,
      budgets: { anthropic: "25000", openai: "20000", haiku: "5000" },
    };

    for (const flag of flags) {
      const key = flag.key.replace("admin.settings.", "");
      const value = (flag.targetingRules as { value?: unknown } | null)?.value;
      if (value === undefined || value === null) continue;
      if (key in defaults) {
        (defaults as Record<string, unknown>)[key] = value;
      }
    }

    return defaults;
  }),

  getCostComparison: adminProtectedProcedure.query(async () => {
    const usage = await getTrailing30DayModelUsage();

    const costComparison = MODEL_CATALOG.map((c) => {
      const apiCost = usage.get(c.model)?.cost ?? 0;
      const selfHostCost = c.selfHostCostPerMonth;
      const totalTokens = usage.get(c.model)?.tokens ?? 0;
      const breakEvenPoint =
        c.costPerMTokens > 0
          ? Math.ceil((selfHostCost / c.costPerMTokens) * 1000000)
          : 0;

      let recommendation: "api" | "self-host" | "hybrid" = "api";
      if (apiCost > 0 && selfHostCost < apiCost * 0.7) {
        recommendation = "self-host";
      } else if (apiCost > 0 && selfHostCost < apiCost) {
        recommendation = "hybrid";
      }

      return {
        provider: c.provider,
        model: c.model,
        apiCost,
        selfHostCost,
        totalTokens,
        breakEvenPoint,
        recommendation,
        monthlySavings: Math.max(0, apiCost - selfHostCost),
      };
    });

    return costComparison;
  }),

  createUser: adminProtectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        email: z.string().email("Invalid email address"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .max(128),
        role: z.enum([
          "owner",
          "admin",
          "finance_director",
          "accountant",
          "payroll_officer",
          "cashier",
          "department_manager",
          "employee",
          "external_auditor",
          "donor",
        ]),
        entityId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, input.email),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const [user] = await db
          .insert(users)
          .values({
            name: input.name,
            email: input.email,
            passwordHash,
          })
          .returning();

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        await db.insert(userEntityAccess).values({
          userId: user.id,
          entityId: input.entityId,
          role: input.role,
          grantedBy: input.entityId,
        });

        return user;
      } catch (error) {
        handleMutationError(error, "Failed to create user");
      }
    }),

  updateUser: adminProtectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
        role: z
          .enum([
            "owner",
            "admin",
            "finance_director",
            "accountant",
            "payroll_officer",
            "cashier",
            "department_manager",
            "employee",
            "external_auditor",
            "donor",
          ])
          .optional(),
        entityId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { userId, entityId, role, ...userUpdates } = input;
        if (Object.keys(userUpdates).length > 0) {
          await db.update(users).set(userUpdates).where(eq(users.id, userId));
        }
        if (entityId && role) {
          await db
            .insert(userEntityAccess)
            .values({
              userId,
              entityId,
              role,
              grantedBy: userId,
            })
            .onConflictDoNothing();
        }
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to update user");
      }
    }),

  deleteUser: adminProtectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        await db.delete(users).where(eq(users.id, input.userId));
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete user");
      }
    }),

  createOrganization: adminProtectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Organization name is required").max(200),
        slug: z.string().min(2, "Slug is required").max(100),
        plan: z
          .enum(["free", "starter", "growth", "pro", "firm"])
          .default("free"),
        ownerId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const [org] = await db
          .insert(organizations)
          .values({
            name: input.name,
            slug: input.slug,
            plan: input.plan,
            ownerId: input.ownerId,
          })
          .returning();
        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create organization",
          });
        }
        return org;
      } catch (error) {
        handleMutationError(error, "Failed to create organization");
      }
    }),

  updateOrganization: adminProtectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        name: z.string().min(2).max(200).optional(),
        plan: z.enum(["free", "starter", "growth", "pro", "firm"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { orgId, ...updates } = input;
        await db
          .update(organizations)
          .set(updates)
          .where(eq(organizations.id, orgId));
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to update organization");
      }
    }),

  deleteOrganization: adminProtectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        await db.delete(organizations).where(eq(organizations.id, input.orgId));
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete organization");
      }
    }),
});
