import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, count, sum } from "drizzle-orm";
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
  avgLatencyMs: number;
  successRate: number;
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

export const adminRouter = router({
  getSystemOverview: adminProcedure.query(async () => {
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
        total: sum(bankAccounts.currentBalance as any),
      })
      .from(bankAccounts)
      .then((r) => parseFloat(r[0]?.total || "0"));

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

  listUsers: adminProcedure.query(async () => {
    return db.query.users.findMany({
      with: {
        userEntityAccess: {
          with: {
            entity: true,
          },
        },
        sessions: true,
      },
      orderBy: [desc(users.createdAt)],
    });
  }),

  listOrganizations: adminProcedure.query(async () => {
    return db.query.organizations.findMany({
      with: {
        owner: true,
        entities: true,
      },
      orderBy: [desc(organizations.createdAt)],
    });
  }),

  getAIComparison: adminProcedure.query(async () => {
    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 850,
        successRate: 0.98,
        monthlySpend: 12500,
        monthlyTokens: 4166667,
        budgetLimit: 25000,
        threshold80: 20000,
        recommendedAt80: 20000,
        recommendedAt90: 22500,
        utilization: 50,
        breakEvenTokens: 833333,
        recommendation: "api",
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPerMTokens: 0.3,
        selfHostCostPerMonth: 500,
        hostingProvider: "aws",
        avgLatencyMs: 320,
        successRate: 0.97,
        monthlySpend: 850,
        monthlyTokens: 2833333,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 17,
        breakEvenTokens: 1666667,
        recommendation: "api",
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPerMTokens: 15.0,
        selfHostCostPerMonth: 5000,
        hostingProvider: "aws",
        avgLatencyMs: 720,
        successRate: 0.96,
        monthlySpend: 9200,
        monthlyTokens: 613333,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 16000,
        recommendedAt90: 18000,
        utilization: 46,
        breakEvenTokens: 333333,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-pro",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 450,
        successRate: 0.96,
        monthlySpend: 2400,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 16,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-coder",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 400,
        successRate: 0.95,
        monthlySpend: 2200,
        monthlyTokens: 27500000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 18,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-m3",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 380,
        successRate: 0.94,
        monthlySpend: 1800,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 12,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-flash",
        deploymentMode: "api",
        costPerMTokens: 1.2,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 280,
        successRate: 0.97,
        monthlySpend: 1200,
        monthlyTokens: 100000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 9000,
        recommendedAt90: 10000,
        utilization: 12,
        breakEvenTokens: 83333333,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-pro",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 550,
        successRate: 0.98,
        monthlySpend: 3600,
        monthlyTokens: 120000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 24,
        breakEvenTokens: 33333333,
        recommendation: "api",
      },
      {
        provider: "qwen",
        model: "qwen3-72b",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 500,
        successRate: 0.96,
        monthlySpend: 4200,
        monthlyTokens: 70000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 28,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "minimax",
        model: "minimax-m3",
        deploymentMode: "api",
        costPerMTokens: 5.0,
        selfHostCostPerMonth: 1200,
        hostingProvider: "aws",
        avgLatencyMs: 350,
        successRate: 0.93,
        monthlySpend: 1800,
        monthlyTokens: 36000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 24000000,
        recommendation: "api",
      },
      {
        provider: "kiwi",
        model: "kiwi-72b-v2",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 2200,
        hostingProvider: "runpod",
        avgLatencyMs: 550,
        successRate: 0.91,
        monthlySpend: 2200,
        monthlyTokens: 25000000,
        budgetLimit: 8000,
        threshold80: 6400,
        recommendedAt80: 7200,
        recommendedAt90: 8000,
        utilization: 27,
        breakEvenTokens: 25000000,
        recommendation: "self-host",
      },
      {
        provider: "cohere",
        model: "command-r-plus",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 3000,
        hostingProvider: "aws",
        avgLatencyMs: 600,
        successRate: 0.95,
        monthlySpend: 4500,
        monthlyTokens: 15000000,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 18000,
        recommendedAt90: 20000,
        utilization: 22,
        breakEvenTokens: 10000000,
        recommendation: "api",
      },
      {
        provider: "mistral",
        model: "mistral-large-2407",
        deploymentMode: "api",
        costPerMTokens: 2.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 520,
        successRate: 0.94,
        monthlySpend: 3500,
        monthlyTokens: 17500000,
        budgetLimit: 18000,
        threshold80: 14400,
        recommendedAt80: 16200,
        recommendedAt90: 18000,
        utilization: 19,
        breakEvenTokens: 12500000,
        recommendation: "api",
      },
      {
        provider: "together",
        model: "llama-3.3-70b",
        deploymentMode: "api",
        costPerMTokens: 1.0,
        selfHostCostPerMonth: 1800,
        hostingProvider: "together",
        avgLatencyMs: 450,
        successRate: 0.92,
        monthlySpend: 1800,
        monthlyTokens: 18000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 18000000,
        recommendation: "api",
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 800,
        hostingProvider: "vastai",
        avgLatencyMs: 200,
        successRate: 0.89,
        monthlySpend: 800,
        monthlyTokens: 10000000,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 16,
        breakEvenTokens: 8000000,
        recommendation: "self-host",
      },
    ];

    return comparison.map((c) => ({
      ...c,
      utilization:
        ((c.monthlySpend + c.selfHostCostPerMonth) / c.budgetLimit) * 100,
      totalCost: c.monthlySpend + c.selfHostCostPerMonth,
    }));
  }),

  getSpendAlerts: adminProcedure.query(async () => {
    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 850,
        successRate: 0.98,
        monthlySpend: 12500,
        monthlyTokens: 4166667,
        budgetLimit: 25000,
        threshold80: 20000,
        recommendedAt80: 20000,
        recommendedAt90: 22500,
        utilization: 50,
        breakEvenTokens: 833333,
        recommendation: "api",
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPerMTokens: 0.3,
        selfHostCostPerMonth: 500,
        hostingProvider: "aws",
        avgLatencyMs: 320,
        successRate: 0.97,
        monthlySpend: 850,
        monthlyTokens: 2833333,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 17,
        breakEvenTokens: 1666667,
        recommendation: "api",
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPerMTokens: 15.0,
        selfHostCostPerMonth: 5000,
        hostingProvider: "aws",
        avgLatencyMs: 720,
        successRate: 0.96,
        monthlySpend: 9200,
        monthlyTokens: 613333,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 16000,
        recommendedAt90: 18000,
        utilization: 46,
        breakEvenTokens: 333333,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-pro",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 450,
        successRate: 0.96,
        monthlySpend: 2400,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 16,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-coder",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 400,
        successRate: 0.95,
        monthlySpend: 2200,
        monthlyTokens: 27500000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 18,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-m3",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 380,
        successRate: 0.94,
        monthlySpend: 1800,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 12,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-flash",
        deploymentMode: "api",
        costPerMTokens: 1.2,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 280,
        successRate: 0.97,
        monthlySpend: 1200,
        monthlyTokens: 100000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 9000,
        recommendedAt90: 10000,
        utilization: 12,
        breakEvenTokens: 83333333,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-pro",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 550,
        successRate: 0.98,
        monthlySpend: 3600,
        monthlyTokens: 120000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 24,
        breakEvenTokens: 33333333,
        recommendation: "api",
      },
      {
        provider: "qwen",
        model: "qwen3-72b",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 500,
        successRate: 0.96,
        monthlySpend: 4200,
        monthlyTokens: 70000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 28,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "minimax",
        model: "minimax-m3",
        deploymentMode: "api",
        costPerMTokens: 5.0,
        selfHostCostPerMonth: 1200,
        hostingProvider: "aws",
        avgLatencyMs: 350,
        successRate: 0.93,
        monthlySpend: 1800,
        monthlyTokens: 36000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 24000000,
        recommendation: "api",
      },
      {
        provider: "kiwi",
        model: "kiwi-72b-v2",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 2200,
        hostingProvider: "runpod",
        avgLatencyMs: 550,
        successRate: 0.91,
        monthlySpend: 2200,
        monthlyTokens: 25000000,
        budgetLimit: 8000,
        threshold80: 6400,
        recommendedAt80: 7200,
        recommendedAt90: 8000,
        utilization: 27,
        breakEvenTokens: 25000000,
        recommendation: "self-host",
      },
      {
        provider: "cohere",
        model: "command-r-plus",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 3000,
        hostingProvider: "aws",
        avgLatencyMs: 600,
        successRate: 0.95,
        monthlySpend: 4500,
        monthlyTokens: 15000000,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 18000,
        recommendedAt90: 20000,
        utilization: 22,
        breakEvenTokens: 10000000,
        recommendation: "api",
      },
      {
        provider: "mistral",
        model: "mistral-large-2407",
        deploymentMode: "api",
        costPerMTokens: 2.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 520,
        successRate: 0.94,
        monthlySpend: 3500,
        monthlyTokens: 17500000,
        budgetLimit: 18000,
        threshold80: 14400,
        recommendedAt80: 16200,
        recommendedAt90: 18000,
        utilization: 19,
        breakEvenTokens: 12500000,
        recommendation: "api",
      },
      {
        provider: "together",
        model: "llama-3.3-70b",
        deploymentMode: "api",
        costPerMTokens: 1.0,
        selfHostCostPerMonth: 1800,
        hostingProvider: "together",
        avgLatencyMs: 450,
        successRate: 0.92,
        monthlySpend: 1800,
        monthlyTokens: 18000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 18000000,
        recommendation: "api",
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 800,
        hostingProvider: "vastai",
        avgLatencyMs: 200,
        successRate: 0.89,
        monthlySpend: 800,
        monthlyTokens: 10000000,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 16,
        breakEvenTokens: 8000000,
        recommendation: "self-host",
      },
    ];

    const alerts: SpendAlert[] = [];

    for (const item of comparison) {
      const percentage = (item.monthlySpend / item.budgetLimit) * 100;
      let alertLevel: "low" | "warning" | "critical" = "low";

      if (percentage >= 90) alertLevel = "critical";
      else if (percentage >= 80) alertLevel = "warning";

      alerts.push({
        provider: item.provider,
        model: item.model,
        currentSpend: item.monthlySpend,
        budgetLimit: item.budgetLimit,
        percentage,
        alertLevel,
      });
    }

    return alerts.filter((a) => a.percentage >= 70);
  }),

  getAIUsage: adminProcedure.query(async () => {
    const activities = await db.query.agentActivity.findMany({
      orderBy: [desc(agentActivity.createdAt)],
      limit: 100,
    });

    const usageByAgent = activities.reduce(
      (acc, act) => {
        if (!acc[act.agentName]) {
          acc[act.agentName] = { count: 0, totalDuration: 0, avgConfidence: 0 };
        }
        acc[act.agentName].count += 1;
        acc[act.agentName].totalDuration += act.durationMs || 0;
        const confidence = act.confidence ? parseFloat(act.confidence) : 0;
        acc[act.agentName].avgConfidence =
          (acc[act.agentName].avgConfidence + confidence) / 2;
        return acc;
      },
      {} as Record<
        string,
        { count: number; totalDuration: number; avgConfidence: number }
      >,
    );

    return Object.entries(usageByAgent).map(([agent, data]) => ({
      agent,
      ...data,
      avgLatency: data.totalDuration / data.count,
    }));
  }),

  getCostComparison: adminProcedure.query(async () => {
    const activities = await db.query.agentActivity.findMany({
      orderBy: [desc(agentActivity.createdAt)],
      limit: 1000,
    });

    const totalTokens = activities.reduce((sum: number, act) => {
      const costCents = act.costCents || 0;
      return sum + (typeof costCents === "number" ? costCents : 0);
    }, 0);

    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 850,
        successRate: 0.98,
        monthlySpend: 12500,
        monthlyTokens: 4166667,
        budgetLimit: 25000,
        threshold80: 20000,
        recommendedAt80: 20000,
        recommendedAt90: 22500,
        utilization: 50,
        breakEvenTokens: 833333,
        recommendation: "api",
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPerMTokens: 0.3,
        selfHostCostPerMonth: 500,
        hostingProvider: "aws",
        avgLatencyMs: 320,
        successRate: 0.97,
        monthlySpend: 850,
        monthlyTokens: 2833333,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 17,
        breakEvenTokens: 1666667,
        recommendation: "api",
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPerMTokens: 15.0,
        selfHostCostPerMonth: 5000,
        hostingProvider: "aws",
        avgLatencyMs: 720,
        successRate: 0.96,
        monthlySpend: 9200,
        monthlyTokens: 613333,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 16000,
        recommendedAt90: 18000,
        utilization: 46,
        breakEvenTokens: 333333,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-pro",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 450,
        successRate: 0.96,
        monthlySpend: 2400,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 16,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-v4-coder",
        deploymentMode: "api",
        costPerMTokens: 8.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 400,
        successRate: 0.95,
        monthlySpend: 2200,
        monthlyTokens: 27500000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 18,
        breakEvenTokens: 18750000,
        recommendation: "api",
      },
      {
        provider: "deepseek",
        model: "deepseek-m3",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 380,
        successRate: 0.94,
        monthlySpend: 1800,
        monthlyTokens: 30000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 12,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-flash",
        deploymentMode: "api",
        costPerMTokens: 1.2,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 280,
        successRate: 0.97,
        monthlySpend: 1200,
        monthlyTokens: 100000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 9000,
        recommendedAt90: 10000,
        utilization: 12,
        breakEvenTokens: 83333333,
        recommendation: "api",
      },
      {
        provider: "glm",
        model: "glm-5.2-pro",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 1000,
        hostingProvider: "aws",
        avgLatencyMs: 550,
        successRate: 0.98,
        monthlySpend: 3600,
        monthlyTokens: 120000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 24,
        breakEvenTokens: 33333333,
        recommendation: "api",
      },
      {
        provider: "qwen",
        model: "qwen3-72b",
        deploymentMode: "api",
        costPerMTokens: 6.0,
        selfHostCostPerMonth: 1500,
        hostingProvider: "aws",
        avgLatencyMs: 500,
        successRate: 0.96,
        monthlySpend: 4200,
        monthlyTokens: 70000000,
        budgetLimit: 15000,
        threshold80: 12000,
        recommendedAt80: 13500,
        recommendedAt90: 15000,
        utilization: 28,
        breakEvenTokens: 25000000,
        recommendation: "api",
      },
      {
        provider: "minimax",
        model: "minimax-m3",
        deploymentMode: "api",
        costPerMTokens: 5.0,
        selfHostCostPerMonth: 1200,
        hostingProvider: "aws",
        avgLatencyMs: 350,
        successRate: 0.93,
        monthlySpend: 1800,
        monthlyTokens: 36000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 24000000,
        recommendation: "api",
      },
      {
        provider: "kiwi",
        model: "kiwi-72b-v2",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 2200,
        hostingProvider: "runpod",
        avgLatencyMs: 550,
        successRate: 0.91,
        monthlySpend: 2200,
        monthlyTokens: 25000000,
        budgetLimit: 8000,
        threshold80: 6400,
        recommendedAt80: 7200,
        recommendedAt90: 8000,
        utilization: 27,
        breakEvenTokens: 25000000,
        recommendation: "self-host",
      },
      {
        provider: "cohere",
        model: "command-r-plus",
        deploymentMode: "api",
        costPerMTokens: 3.0,
        selfHostCostPerMonth: 3000,
        hostingProvider: "aws",
        avgLatencyMs: 600,
        successRate: 0.95,
        monthlySpend: 4500,
        monthlyTokens: 15000000,
        budgetLimit: 20000,
        threshold80: 16000,
        recommendedAt80: 18000,
        recommendedAt90: 20000,
        utilization: 22,
        breakEvenTokens: 10000000,
        recommendation: "api",
      },
      {
        provider: "mistral",
        model: "mistral-large-2407",
        deploymentMode: "api",
        costPerMTokens: 2.0,
        selfHostCostPerMonth: 2500,
        hostingProvider: "aws",
        avgLatencyMs: 520,
        successRate: 0.94,
        monthlySpend: 3500,
        monthlyTokens: 17500000,
        budgetLimit: 18000,
        threshold80: 14400,
        recommendedAt80: 16200,
        recommendedAt90: 18000,
        utilization: 19,
        breakEvenTokens: 12500000,
        recommendation: "api",
      },
      {
        provider: "together",
        model: "llama-3.3-70b",
        deploymentMode: "api",
        costPerMTokens: 1.0,
        selfHostCostPerMonth: 1800,
        hostingProvider: "together",
        avgLatencyMs: 450,
        successRate: 0.92,
        monthlySpend: 1800,
        monthlyTokens: 18000000,
        budgetLimit: 12000,
        threshold80: 9600,
        recommendedAt80: 10800,
        recommendedAt90: 12000,
        utilization: 15,
        breakEvenTokens: 18000000,
        recommendation: "api",
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPerMTokens: 0,
        selfHostCostPerMonth: 800,
        hostingProvider: "vastai",
        avgLatencyMs: 200,
        successRate: 0.89,
        monthlySpend: 800,
        monthlyTokens: 10000000,
        budgetLimit: 5000,
        threshold80: 4000,
        recommendedAt80: 4000,
        recommendedAt90: 4500,
        utilization: 16,
        breakEvenTokens: 8000000,
        recommendation: "self-host",
      },
    ];

    const costComparison = comparison.map((c) => {
      const apiCost = c.monthlySpend;
      const selfHostCost = c.selfHostCostPerMonth;
      const breakEvenPoint =
        c.costPerMTokens > 0
          ? Math.ceil((selfHostCost / c.costPerMTokens) * 1000000)
          : 0;

      let recommendation: "api" | "self-host" | "hybrid" = "api";
      if (selfHostCost < apiCost * 0.7) {
        recommendation = "self-host";
      } else if (selfHostCost < apiCost) {
        recommendation = "hybrid";
      }

      return {
        provider: c.provider,
        model: c.model,
        apiCost,
        selfHostCost,
        totalTokens: c.monthlyTokens,
        breakEvenPoint,
        recommendation,
        monthlySavings: Math.max(0, apiCost - selfHostCost),
      };
    });

    return costComparison;
  }),
});
