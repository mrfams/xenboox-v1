import type {
  ProviderId,
  ProviderRoute,
  ModelAssignmentRecord,
  ModelRegistryEntry,
  RouteHealth,
  ProviderAdapter,
} from "./types";
import { getAdapter } from "./adapters";
import { db } from "@xenboox/db";
import { modelAssignments, modelRegistry } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Prompt Cache ──────────────────────────────────────────────────
// Shared context (system prompts, entity settings) cached per entity.
// Reduces token costs and speeds up repeat requests.

class PromptCache {
  private cache = new Map<string, { content: string; cachedAt: number }>();
  private ttlMs = 5 * 60 * 1000; // 5 minutes

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.content;
  }

  set(key: string, content: string): void {
    this.cache.set(key, { content, cachedAt: Date.now() });
    // Evict oldest if cache exceeds 500 entries
    if (this.cache.size > 500) {
      const oldest = [...this.cache.entries()].sort(
        (a, b) => a[1].cachedAt - b[1].cachedAt,
      )[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
  }

  makeKey(entityId: string, systemPrompt: string): string {
    return `${entityId}:${hashString(systemPrompt)}`;
  }
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Route Health Tracker ─────────────────────────────────────────
// Tracks per-route health for load balancing

class RouteHealthTracker {
  private health = new Map<string, RouteHealth>();

  recordSuccess(
    routeId: string,
    provider: ProviderId,
    model: string,
    latencyMs: number,
  ): void {
    const current =
      this.health.get(routeId) ?? this.createDefault(routeId, provider, model);
    current.avgLatencyMs = current.avgLatencyMs * 0.9 + latencyMs * 0.1; // EMA
    current.consecutiveErrors = 0;
    current.errorRate *= 0.95; // Decay
    current.isHealthy = true;
    this.health.set(routeId, current);
  }

  recordError(routeId: string, provider: ProviderId, model: string): void {
    const current =
      this.health.get(routeId) ?? this.createDefault(routeId, provider, model);
    current.consecutiveErrors++;
    current.lastErrorAt = Date.now();
    current.errorRate = current.errorRate * 0.9 + 0.1;
    if (current.consecutiveErrors >= 3) {
      current.isHealthy = false;
    }
    this.health.set(routeId, current);
  }

  updateRateLimit(routeId: string, remaining: number, resetAt: number): void {
    const current = this.health.get(routeId);
    if (current) {
      current.rateLimitRemaining = remaining;
      current.rateLimitResetAt = resetAt;
    }
  }

  getHealth(routeId: string): RouteHealth | undefined {
    const h = this.health.get(routeId);
    if (!h) return undefined;
    // Auto-recover after 30s
    if (!h.isHealthy && h.lastErrorAt && Date.now() - h.lastErrorAt > 30_000) {
      h.isHealthy = true;
      h.consecutiveErrors = 0;
    }
    return h;
  }

  private createDefault(
    routeId: string,
    provider: ProviderId,
    model: string,
  ): RouteHealth {
    return {
      routeId,
      provider,
      model,
      isHealthy: true,
      lastErrorAt: null,
      consecutiveErrors: 0,
      avgLatencyMs: 1000,
      errorRate: 0,
      rateLimitRemaining: 100,
      rateLimitResetAt: null,
    };
  }
}

// ─── Model Router ──────────────────────────────────────────────────

export class ModelRouter {
  private promptCache = new PromptCache();
  private healthTracker = new RouteHealthTracker();
  private assignmentCache = new Map<string, ModelAssignmentRecord>();
  private registryCache = new Map<string, ModelRegistryEntry>();
  private lastFetch = 0;
  private readonly cacheTtlMs = 60_000; // 1 minute

  /**
   * Get all available provider routes for a given agent/task.
   * Looks up the model_assignments table for live + fallback configuration,
   * then resolves to concrete provider routes.
   */
  async getRoutes(
    agentName: string,
    taskType: string,
    entityId: string,
  ): Promise<ProviderRoute[]> {
    await this.refreshCache();
    const assignment = await this.getAssignment(agentName, taskType);
    if (!assignment) {
      return [];
    }

    const routes: ProviderRoute[] = [];

    // Live route
    const liveAdapter = getAdapter(assignment.liveProvider);
    if (liveAdapter) {
      const routeId = `${assignment.liveProvider}:${assignment.liveModelId}`;
      const health = this.healthTracker.getHealth(routeId);
      if (!health || health.isHealthy) {
        routes.push({
          provider: assignment.liveProvider,
          model: assignment.liveModelId,
          priority: 0,
        });
      }
    }

    // Traffic-split routes (for canary rollouts)
    if (
      assignment.trafficSplit &&
      Object.keys(assignment.trafficSplit).length > 0
    ) {
      const splitEntries = Object.entries(assignment.trafficSplit).filter(
        ([modelId]) => modelId !== assignment.liveModelId,
      );
      for (const [modelId, percent] of splitEntries) {
        if (percent > 0 && Math.random() * 100 < percent) {
          // Try to find the provider for this model
          const entry = this.registryCache.get(modelId);
          if (entry) {
            const adapter = getAdapter(entry.provider);
            if (adapter) {
              routes.push({
                provider: entry.provider,
                model: modelId,
                priority: -1,
              });
            }
          }
        }
      }
    }

    // Fallback route
    if (assignment.fallbackModelId && assignment.fallbackProvider) {
      const fallbackAdapter = getAdapter(assignment.fallbackProvider);
      if (fallbackAdapter) {
        routes.push({
          provider: assignment.fallbackProvider,
          model: assignment.fallbackModelId,
          priority: 1,
        });
      }
    }

    // Sort by priority (lower = preferred)
    routes.sort((a, b) => a.priority - b.priority);

    return routes;
  }

  /**
   * Execute a model call with automatic fallback across routes,
   * provider-pool load balancing, and prompt caching.
   */
  async execute(
    agentName: string,
    taskType: string,
    entityId: string,
    params: {
      systemPrompt: string;
      messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }>;
      tools?: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<{
    content: string;
    toolCalls: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }>;
    provider: ProviderId;
    model: string;
    tokensUsed: { input: number; output: number; total: number };
    latencyMs: number;
    fromCache: boolean;
  }> {
    // 1. Check prompt cache
    const cacheKey = this.promptCache.makeKey(entityId, params.systemPrompt);
    const cachedContent = this.promptCache.get(cacheKey);
    if (cachedContent) {
      return {
        content: cachedContent,
        toolCalls: [],
        provider: "anthropic" as ProviderId,
        model: "cache",
        tokensUsed: { input: 0, output: 0, total: 0 },
        latencyMs: 0,
        fromCache: true,
      };
    }

    // 2. Get routes
    const routes = await this.getRoutes(agentName, taskType, entityId);
    const errors: string[] = [];

    // 3. Try routes in priority order (provider-pool load balancing)
    //    For the same model available via multiple providers, try the healthiest first
    const groupedRoutes = this.groupByModel(routes);

    for (const [, modelRoutes] of groupedRoutes) {
      // Sort by health: healthy routes first, then by lowest avg latency
      const sorted = modelRoutes.sort((a, b) => {
        const healthA = this.healthTracker.getHealth(
          `${a.provider}:${a.model}`,
        );
        const healthB = this.healthTracker.getHealth(
          `${b.provider}:${b.model}`,
        );
        const aHealthy = healthA?.isHealthy ?? true;
        const bHealthy = healthB?.isHealthy ?? true;
        if (aHealthy !== bHealthy) return aHealthy ? -1 : 1;
        return (
          (healthA?.avgLatencyMs ?? 1000) - (healthB?.avgLatencyMs ?? 1000)
        );
      });

      for (const route of sorted) {
        const adapter = getAdapter(route.provider);
        if (!adapter) {
          errors.push(`No adapter for provider: ${route.provider}`);
          continue;
        }

        const routeId = `${route.provider}:${route.model}`;
        const startTime = Date.now();

        try {
          const response = await adapter.complete({
            model: route.model,
            systemPrompt: params.systemPrompt,
            messages: params.messages,
            tools: params.tools,
            maxTokens: params.maxTokens,
            temperature: params.temperature,
          });

          const latencyMs = Date.now() - startTime;
          this.healthTracker.recordSuccess(
            routeId,
            route.provider,
            route.model,
            latencyMs,
          );

          // Cache successful responses (only non-tool, non-streaming)
          if (!response.toolCalls?.length && response.confidence > 0.9) {
            this.promptCache.set(cacheKey, response.content);
          }

          return {
            content: response.content,
            toolCalls: response.toolCalls,
            provider: route.provider,
            model: route.model,
            tokensUsed: response.tokensUsed,
            latencyMs,
            fromCache: false,
          };
        } catch (error) {
          this.healthTracker.recordError(routeId, route.provider, route.model);
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`[${route.provider}:${route.model}] ${msg}`);
          continue;
        }
      }
    }

    throw new Error(
      `All provider routes exhausted for ${agentName}/${taskType}:\n${errors.join("\n")}`,
    );
  }

  /** Group routes by model for load balancing across providers */
  private groupByModel(routes: ProviderRoute[]): Map<string, ProviderRoute[]> {
    const grouped = new Map<string, ProviderRoute[]>();
    for (const route of routes) {
      const existing = grouped.get(route.model) ?? [];
      existing.push(route);
      grouped.set(route.model, existing);
    }
    return grouped;
  }

  private async refreshCache(): Promise<void> {
    if (Date.now() - this.lastFetch < this.cacheTtlMs) return;
    this.lastFetch = Date.now();

    try {
      const registryEntries = await db.query.modelRegistry.findMany({
        where: eq(modelRegistry.isActive, true),
      });
      for (const entry of registryEntries) {
        this.registryCache.set(entry.modelId, {
          modelId: entry.modelId,
          displayName: entry.displayName,
          provider: entry.provider as ProviderId,
          capabilities:
            entry.capabilities as ModelRegistryEntry["capabilities"],
          costPerMillionInputTokens: entry.costPerMillionInputTokens,
          costPerMillionOutputTokens: entry.costPerMillionOutputTokens,
          endpoints: entry.endpoints as string[],
        });
      }
    } catch {
      // DB not available, use cached data
    }
  }

  private async getAssignment(
    agentName: string,
    taskType: string,
  ): Promise<ModelAssignmentRecord | undefined> {
    const cacheKey = `${agentName}:${taskType}`;
    const cached = this.assignmentCache.get(cacheKey);
    if (cached) return cached;

    try {
      const assignment = await db.query.modelAssignments.findFirst({
        where: and(
          eq(modelAssignments.agentName, agentName),
          eq(modelAssignments.taskType, taskType as never),
          eq(modelAssignments.isActive, true),
        ),
      });

      if (assignment) {
        const record: ModelAssignmentRecord = {
          id: assignment.id,
          agentName: assignment.agentName,
          taskType: assignment.taskType,
          liveModelId: assignment.liveModelId,
          liveProvider: assignment.liveProvider as ProviderId,
          fallbackModelId: assignment.fallbackModelId,
          fallbackProvider: assignment.fallbackProvider as ProviderId | null,
          trafficSplit: assignment.trafficSplit as Record<
            string,
            number
          > | null,
        };
        this.assignmentCache.set(cacheKey, record);
        return record;
      }
    } catch {
      // DB not available, return undefined — caller will use fallback
    }

    return undefined;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let router: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!router) {
    router = new ModelRouter();
  }
  return router;
}
