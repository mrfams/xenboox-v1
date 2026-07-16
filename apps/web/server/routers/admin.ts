import { z } from "zod"
import { router, protectedProcedure, adminProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, and, desc, count, sum } from "drizzle-orm"
import { users } from "@xenboox/db/schema/auth"
import { organizations, userEntityAccess } from "@xenboox/db/schema/organization"
import { chartOfAccounts, journalEntries, journalEntryLines } from "@xenboox/db/schema/accounting"
import { bankAccounts } from "@xenboox/db/schema/treasury"
import { documents } from "@xenboox/db/schema/documents"
import { agentActivity } from "@xenboox/db/schema/documents"

export type AIProvider = "anthropic" | "openai" | "azure" | "self-hosted"
export type DeploymentMode = "api" | "self-hosted" | "hybrid"

export type AIComparison = {
  provider: AIProvider
  model: string
  deploymentMode: DeploymentMode
  costPer1kTokens: number
  selfHostCostPerMonth: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  monthlyTokens: number
  budgetLimit: number
  threshold80: number
  recommendedAt80: number
  recommendedAt90: number
  utilization: number
  breakEvenTokens: number
  recommendation: "api" | "self-host" | "hybrid"
  totalCost?: number
}

export type SelfHostedModel = {
  provider: "self-hosted"
  model: string
  costPer1kTokens: number
  selfHostCostPerMonth: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  monthlyTokens: number
  budgetLimit: number
  utilization: number
  breakEvenTokens: number
  recommendation: "self-host"
}

export type CostComparison = {
  provider: AIProvider
  model: string
  apiCost: number
  selfHostCost: number
  totalTokens: number
  breakEvenPoint: number
  recommendation: "api" | "self-host" | "hybrid"
  monthlySavings: number
}

export type SpendAlert = {
  provider: AIProvider
  model: string
  currentSpend: number
  budgetLimit: number
  percentage: number
  alertLevel: "low" | "warning" | "critical"
}

export const adminRouter = router({
  getSystemOverview: adminProcedure.query(async () => {
    const [userCount, orgCount, entityCount, journalCount, accountCount, bankCount, docCount] = await Promise.all([
      db.select({ count: count() }).from(users).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(organizations).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(userEntityAccess).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(journalEntries).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(chartOfAccounts).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(bankAccounts).then(r => r[0]?.count || 0),
      db.select({ count: count() }).from(documents).then(r => r[0]?.count || 0),
    ])

    const totalBalance = await db.select({
      total: sum(bankAccounts.currentBalance as any)
    }).from(bankAccounts).then(r => parseFloat(r[0]?.total || "0"))

    return {
      users: userCount,
      organizations: orgCount,
      entities: entityCount,
      journalEntries: journalCount,
      chartOfAccounts: accountCount,
      bankAccounts: bankCount,
      documents: docCount,
      totalBankBalance: totalBalance,
    }
  }),

  listUsers: adminProcedure.query(async () => {
    return db.query.users.findMany({
      with: {
        userEntityAccess: {
          with: {
            entity: true
          }
        },
        sessions: true
      },
      orderBy: [desc(users.createdAt)]
    })
  }),

  listOrganizations: adminProcedure.query(async () => {
    return db.query.organizations.findMany({
      with: {
        owner: true,
        entities: true
      },
      orderBy: [desc(organizations.createdAt)]
    })
  }),

  getAIComparison: adminProcedure.query(async () => {
    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPer1kTokens: 0.003,
        selfHostCostPerMonth: 2500,
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
        recommendation: "api"
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPer1kTokens: 0.0003,
        selfHostCostPerMonth: 500,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPer1kTokens: 0.015,
        selfHostCostPerMonth: 5000,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-mini",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0.0001,
        selfHostCostPerMonth: 1500,
        avgLatencyMs: 150,
        successRate: 0.92,
        monthlySpend: 1500,
        monthlyTokens: 15000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 8000,
        recommendedAt90: 9000,
        utilization: 15,
        breakEvenTokens: 15000000,
        recommendation: "self-host"
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0,
        selfHostCostPerMonth: 800,
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
        recommendation: "self-host"
      }
    ]

    return comparison.map(c => ({
      ...c,
      utilization: ((c.monthlySpend + c.selfHostCostPerMonth) / c.budgetLimit) * 100,
      totalCost: c.monthlySpend + c.selfHostCostPerMonth
    }))
  }),

  getSpendAlerts: adminProcedure.query(async () => {
    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPer1kTokens: 0.003,
        selfHostCostPerMonth: 2500,
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
        recommendation: "api"
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPer1kTokens: 0.0003,
        selfHostCostPerMonth: 500,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPer1kTokens: 0.015,
        selfHostCostPerMonth: 5000,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-mini",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0.0001,
        selfHostCostPerMonth: 1500,
        avgLatencyMs: 150,
        successRate: 0.92,
        monthlySpend: 1500,
        monthlyTokens: 15000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 8000,
        recommendedAt90: 9000,
        utilization: 15,
        breakEvenTokens: 15000000,
        recommendation: "self-host"
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0,
        selfHostCostPerMonth: 800,
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
        recommendation: "self-host"
      }
    ]

    const alerts: SpendAlert[] = []

    for (const item of comparison) {
      const percentage = (item.monthlySpend / item.budgetLimit) * 100
      let alertLevel: "low" | "warning" | "critical" = "low"
      
      if (percentage >= 90) alertLevel = "critical"
      else if (percentage >= 80) alertLevel = "warning"

      alerts.push({
        provider: item.provider,
        model: item.model,
        currentSpend: item.monthlySpend,
        budgetLimit: item.budgetLimit,
        percentage,
        alertLevel
      })
    }

    return alerts.filter(a => a.percentage >= 70)
  }),

  getAIUsage: adminProcedure.query(async () => {
    const activities = await db.query.agentActivity.findMany({
      orderBy: [desc(agentActivity.createdAt)],
      limit: 100
    })

    const usageByAgent = activities.reduce((acc, act) => {
      if (!acc[act.agentName]) {
        acc[act.agentName] = { count: 0, totalDuration: 0, avgConfidence: 0 }
      }
      acc[act.agentName].count += 1
      acc[act.agentName].totalDuration += act.durationMs || 0
      acc[act.agentName].avgConfidence = (acc[act.agentName].avgConfidence + parseFloat(act.confidence)) / 2
      return acc
    }, {} as Record<string, { count: number; totalDuration: number; avgConfidence: number }>)

    return Object.entries(usageByAgent).map(([agent, data]) => ({
      agent,
      ...data,
      avgLatency: data.totalDuration / data.count
    }))
  }),

  getCostComparison: adminProcedure.query(async () => {
    const activities = await db.query.agentActivity.findMany({
      orderBy: [desc(agentActivity.createdAt)],
      limit: 1000
    })

    const totalTokens = activities.reduce((sum: number, act) => {
      const costCents = act.costCents || 0
      return sum + (typeof costCents === 'number' ? costCents : 0)
    }, 0)

    const comparison: AIComparison[] = [
      {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        deploymentMode: "api",
        costPer1kTokens: 0.003,
        selfHostCostPerMonth: 2500,
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
        recommendation: "api"
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        deploymentMode: "api",
        costPer1kTokens: 0.0003,
        selfHostCostPerMonth: 500,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        deploymentMode: "api",
        costPer1kTokens: 0.015,
        selfHostCostPerMonth: 5000,
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
        recommendation: "api"
      },
      {
        provider: "openai",
        model: "gpt-mini",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0.0001,
        selfHostCostPerMonth: 1500,
        avgLatencyMs: 150,
        successRate: 0.92,
        monthlySpend: 1500,
        monthlyTokens: 15000000,
        budgetLimit: 10000,
        threshold80: 8000,
        recommendedAt80: 8000,
        recommendedAt90: 9000,
        utilization: 15,
        breakEvenTokens: 15000000,
        recommendation: "self-host"
      },
      {
        provider: "self-hosted",
        model: "llama-3.1-8b",
        deploymentMode: "self-hosted",
        costPer1kTokens: 0,
        selfHostCostPerMonth: 800,
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
        recommendation: "self-host"
      }
    ]

    const costComparison = comparison.map(c => {
      const apiCost = c.monthlySpend
      const selfHostCost = c.selfHostCostPerMonth
      const breakEvenPoint = c.costPer1kTokens > 0 ? Math.ceil((selfHostCost / c.costPer1kTokens) * 1000) : 0
      
      let recommendation: "api" | "self-host" | "hybrid" = "api"
      if (selfHostCost < apiCost * 0.7) {
        recommendation = "self-host"
      } else if (selfHostCost < apiCost) {
        recommendation = "hybrid"
      }

      return {
        provider: c.provider,
        model: c.model,
        apiCost,
        selfHostCost,
        totalTokens: c.monthlyTokens,
        breakEvenPoint,
        recommendation,
        monthlySavings: Math.max(0, apiCost - selfHostCost)
      }
    })

    return costComparison
  }),
})