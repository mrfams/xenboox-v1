import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  opsLlmProviders,
  opsLlmModels,
  opsLlmRoutingPolicies,
  opsLlmRoutingRules,
  opsLlmRecentChanges,
} from "@xenboox/db/schema/ops-llm-router";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── LLM Router ─────────────────────────────────────────────────────────────

export const llmRouter = router({
  // ── Dashboard Overview ────────────────────────────────────────────────

  getOverview: adminProtectedProcedure.query(async () => {
    // Providers
    const providers = await db.query.opsLlmProviders.findMany({
      orderBy: [desc(opsLlmProviders.totalRequests24h)],
    });

    const activeProviders = providers.filter((p) => p.isActive).length;
    const activeModels = providers.reduce((sum, p) => sum + p.modelCount, 0);
    const totalRequests24h = providers.reduce(
      (sum, p) => sum + p.totalRequests24h,
      0,
    );
    const totalTokens24h = providers.reduce(
      (sum, p) => sum + parseFloat(p.totalTokens24h),
      0,
    );
    const avgLatency =
      providers.length > 0
        ? providers.reduce((sum, p) => sum + p.avgLatencyMs, 0) /
          providers.length /
          1000
        : 0;
    const avgErrorRate =
      providers.length > 0
        ? providers.reduce((sum, p) => sum + parseFloat(p.errorRate), 0) /
          providers.length
        : 0;

    // Routing policies
    const policies = await db.query.opsLlmRoutingPolicies.findMany({
      orderBy: [opsLlmRoutingPolicies.priority],
    });

    // Routing rules
    const rules = await db.query.opsLlmRoutingRules.findMany({
      orderBy: [opsLlmRoutingRules.priority],
      limit: 5,
    });

    // Recent changes
    const recentChanges = await db.query.opsLlmRecentChanges.findMany({
      orderBy: [desc(opsLlmRecentChanges.createdAt)],
      limit: 5,
    });

    // Traffic distribution by provider
    const trafficDistribution = providers.map((p) => ({
      name: p.displayName,
      requests: p.totalRequests24h,
      percentage:
        totalRequests24h > 0
          ? ((p.totalRequests24h / totalRequests24h) * 100).toFixed(1)
          : "0",
    }));

    return {
      summary: {
        activeProviders,
        activeModels,
        totalRequests24h,
        totalRequestsDisplay: formatLargeNumber(totalRequests24h),
        totalTokens24h: Math.round(totalTokens24h),
        totalTokensDisplay: formatLargeNumber(totalTokens24h),
        avgLatency: avgLatency.toFixed(2),
        avgErrorRate: avgErrorRate.toFixed(2),
      },
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        status: p.status,
        modelCount: p.modelCount,
        requests24h: p.totalRequests24h,
        requestsDisplay: formatLargeNumber(p.totalRequests24h),
        tokens24h: parseFloat(p.totalTokens24h),
        tokensDisplay: formatLargeNumber(parseFloat(p.totalTokens24h)),
        avgLatencyMs: p.avgLatencyMs,
        avgLatency: (p.avgLatencyMs / 1000).toFixed(2),
        errorRate: p.errorRate,
        costPerMillionTokens: p.costPerMillionTokens,
        isActive: p.isActive,
      })),
      policies: policies.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        iconType: p.iconType,
        status: p.status,
        isDefault: p.isDefault,
      })),
      rules: rules.map((r) => ({
        id: r.id,
        priority: r.priority,
        ruleName: r.ruleName,
        conditions: r.conditions,
        target: r.target,
        policyName: r.policyName,
        status: r.status,
        hitRate24h: r.hitRate24h,
      })),
      trafficDistribution,
      recentChanges: recentChanges.map((c) => ({
        id: c.id,
        changeType: c.changeType,
        title: c.title,
        actorName: c.actorName,
        actorType: c.actorType,
        createdAt: c.createdAt,
      })),
    };
  }),

  // ── List Providers ────────────────────────────────────────────────────

  listProviders: adminProtectedProcedure.query(async () => {
    const providers = await db.query.opsLlmProviders.findMany({
      orderBy: [desc(opsLlmProviders.totalRequests24h)],
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      status: p.status,
      modelCount: p.modelCount,
      requests24h: p.totalRequests24h,
      tokens24h: parseFloat(p.totalTokens24h),
      avgLatencyMs: p.avgLatencyMs,
      errorRate: p.errorRate,
      costPerMillionTokens: p.costPerMillionTokens,
      isActive: p.isActive,
    }));
  }),

  // ── Seed demo data ────────────────────────────────────────────────────

  seedLlmRouterData: adminProtectedProcedure.mutation(async () => {
    const existing = await db
      .select({ count: count() })
      .from(opsLlmProviders)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) {
      return { seeded: false, reason: "Data already exists" };
    }

    // Seed providers
    const providerData = [
      {
        name: "anthropic",
        displayName: "Anthropic",
        status: "healthy" as const,
        modelCount: 5,
        totalRequests24h: 512000,
        totalTokens24h: "1420000000",
        avgLatencyMs: 1210,
        errorRate: "0.21",
        costPerMillionTokens: "4.12",
      },
      {
        name: "openai",
        displayName: "OpenAI",
        status: "healthy" as const,
        modelCount: 6,
        totalRequests24h: 328000,
        totalTokens24h: "987000000",
        avgLatencyMs: 1420,
        errorRate: "0.38",
        costPerMillionTokens: "3.65",
      },
      {
        name: "google",
        displayName: "Google Vertex AI",
        status: "healthy" as const,
        modelCount: 4,
        totalRequests24h: 186000,
        totalTokens24h: "541000000",
        avgLatencyMs: 1670,
        errorRate: "0.32",
        costPerMillionTokens: "2.76",
      },
      {
        name: "azure",
        displayName: "Azure OpenAI",
        status: "degraded" as const,
        modelCount: 5,
        totalRequests24h: 132000,
        totalTokens24h: "412000000",
        avgLatencyMs: 2180,
        errorRate: "1.24",
        costPerMillionTokens: "2.95",
      },
      {
        name: "meta",
        displayName: "Meta (Llama)",
        status: "healthy" as const,
        modelCount: 3,
        totalRequests24h: 68000,
        totalTokens24h: "198000000",
        avgLatencyMs: 1050,
        errorRate: "0.19",
        costPerMillionTokens: "1.15",
      },
      {
        name: "mistral",
        displayName: "Mistral AI",
        status: "healthy" as const,
        modelCount: 3,
        totalRequests24h: 20000,
        totalTokens24h: "72000000",
        avgLatencyMs: 980,
        errorRate: "0.11",
        costPerMillionTokens: "0.85",
      },
    ];

    for (const p of providerData) {
      await db.insert(opsLlmProviders).values(p);
    }

    // Seed routing policies
    const policies = [
      {
        name: "default",
        displayName: "Default Policy",
        description: "Primary routing for general requests",
        iconType: "default",
        status: "active" as const,
        isDefault: true,
        priority: 1,
      },
      {
        name: "cost_optimized",
        displayName: "Cost Optimized",
        description: "Routes to cheapest capable model",
        iconType: "cost",
        status: "active" as const,
        isDefault: false,
        priority: 2,
      },
      {
        name: "latency_optimized",
        displayName: "Latency Optimized",
        description: "Routes to fastest available model",
        iconType: "latency",
        status: "active" as const,
        isDefault: false,
        priority: 3,
      },
      {
        name: "high_quality",
        displayName: "High Quality",
        description: "Routes to highest quality models",
        iconType: "quality",
        status: "active" as const,
        isDefault: false,
        priority: 4,
      },
      {
        name: "fallback",
        displayName: "Fallback Policy",
        description: "Fallback when primary fails",
        iconType: "fallback",
        status: "active" as const,
        isDefault: false,
        priority: 5,
      },
    ];

    for (const p of policies) {
      await db.insert(opsLlmRoutingPolicies).values(p);
    }

    // Seed routing rules
    const rules = [
      {
        priority: 1,
        ruleName: "Critical Tasks",
        conditions: "Task priority = critical",
        target: "Claude 3.5 Sonnet",
        policyName: "High Quality",
        status: "active",
        hitRate24h: "18.70",
      },
      {
        priority: 2,
        ruleName: "Cost Sensitive",
        conditions: "cost_sensitive = true",
        target: "GPT-4o Mini",
        policyName: "Cost Optimized",
        status: "active",
        hitRate24h: "24.30",
      },
      {
        priority: 3,
        ruleName: "Long Context",
        conditions: "input_tokens > 50k",
        target: "Claude 3.5 Sonnet (200k)",
        policyName: "Latency Optimized",
        status: "active",
        hitRate24h: "7.80",
      },
      {
        priority: 4,
        ruleName: "EU Region",
        conditions: "region = eu-west",
        target: "Azure OpenAI GPT-4o",
        policyName: "Default Policy",
        status: "active",
        hitRate24h: "12.10",
      },
      {
        priority: 5,
        ruleName: "Default Rule",
        conditions: "All other requests",
        target: "Auto (Best Available)",
        policyName: "Default Policy",
        status: "active",
        hitRate24h: "37.10",
      },
    ];

    for (const r of rules) {
      await db.insert(opsLlmRoutingRules).values(r);
    }

    // Seed recent changes
    const changes = [
      {
        changeType: "model_added",
        title: "Added Claude 3.5 Sonnet (200k)",
        actorName: "Famara Touray",
        actorType: "admin",
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        changeType: "routing_updated",
        title: 'Updated routing rule "Long Context"',
        actorName: "System",
        actorType: "system",
        createdAt: new Date(Date.now() - 5 * 3600000),
      },
      {
        changeType: "fallback_enabled",
        title: "Enabled fallback for Azure OpenAI",
        actorName: "Famara Touray",
        actorType: "admin",
        createdAt: new Date(Date.now() - 24 * 3600000),
      },
      {
        changeType: "provider_degraded",
        title: "Degraded: Azure OpenAI latency high",
        actorName: "System",
        actorType: "system",
        createdAt: new Date(Date.now() - 25 * 3600000),
      },
    ];

    for (const c of changes) {
      await db.insert(opsLlmRecentChanges).values(c);
    }

    return { seeded: true };
  }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
