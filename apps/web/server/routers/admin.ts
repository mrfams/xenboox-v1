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

export type AIProvider = "anthropic" | "openai" | "azure"
export type AIComparison = {
  provider: AIProvider
  model: string
  costPer1kTokens: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  budgetLimit: number
  threshold80: number
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
        costPer1kTokens: 0.003,
        avgLatencyMs: 850,
        successRate: 0.98,
        monthlySpend: 12500,
        budgetLimit: 25000,
        threshold80: 20000
      },
      {
        provider: "anthropic",
        model: "claude-haiku-4.5",
        costPer1kTokens: 0.0003,
        avgLatencyMs: 320,
        successRate: 0.97,
        monthlySpend: 850,
        budgetLimit: 5000,
        threshold80: 4000
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        costPer1kTokens: 0.015,
        avgLatencyMs: 720,
        successRate: 0.96,
        monthlySpend: 9200,
        budgetLimit: 20000,
        threshold80: 16000
      }
    ]

    return comparison.map(c => ({
      ...c,
      utilization: (c.monthlySpend / c.budgetLimit) * 100
    }))
  }),

  getSpendAlerts: adminProcedure.query(async () => {
    const comparison = await adminProcedure._ctx.getAIComparison()
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
      acc[act.agentName].totalDuration += act.durationMs
      acc[act.agentName].avgConfidence = (acc[act.agentName].avgConfidence + parseFloat(act.confidence)) / 2
      return acc
    }, {} as Record<string, { count: number; totalDuration: number; avgConfidence: number }>)

    return Object.entries(usageByAgent).map(([agent, data]) => ({
      agent,
      ...data,
      avgLatency: data.totalDuration / data.count
    }))
  }),
})