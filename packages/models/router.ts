import type {
  ProviderId,
  ProviderRoute,
  ModelAssignmentRecord,
  ModelRegistryEntry,
  RouteHealth,
  ModelMessageContentBlock,
} from "./types";
import { getAdapter } from "./adapters";
import { db } from "@xenboox/db";
import { modelAssignments, modelRegistry } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Router Config ────────────────────────────────────────────────

export interface RouterConfig {
  /** Per-route timeout in ms (default: 30s) */
  routeTimeoutMs: number;
  /** Max retries per route before moving to next (default: 2) */
  maxRouteRetries: number;
  /** Base delay between route retries in ms (default: 1s) */
  routeRetryBaseDelayMs: number;
  /** Max delay between route retries in ms (default: 10s) */
  routeRetryMaxDelayMs: number;
  /** Auto-recovery time for unhealthy routes in ms (default: 30s) */
  unhealthyRecoveryMs: number;
  /** Consecutive errors to mark route unhealthy (default: 3) */
  unhealthyThreshold: number;
  /** Prompt cache TTL in ms (default: 5min) */
  promptCacheTtlMs: number;
  /** Assignment/registry cache TTL in ms (default: 60s) */
  cacheTtlMs: number;
}

const DEFAULT_CONFIG: RouterConfig = {
  routeTimeoutMs: 30_000,
  maxRouteRetries: 2,
  routeRetryBaseDelayMs: 1_000,
  routeRetryMaxDelayMs: 10_000,
  unhealthyRecoveryMs: 30_000,
  unhealthyThreshold: 3,
  promptCacheTtlMs: 5 * 60_000,
  cacheTtlMs: 60_000,
};

// ─── Prompt Cache ──────────────────────────────────────────────────

class PromptCache {
  private cache = new Map<string, { content: string; cachedAt: number }>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

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
// §4.3 — Circuit breaker, rate-limit awareness, auto-recovery

class RouteHealthTracker {
  private health = new Map<string, RouteHealth>();
  private config: Pick<
    RouterConfig,
    "unhealthyRecoveryMs" | "unhealthyThreshold"
  >;

  constructor(
    config: Pick<RouterConfig, "unhealthyRecoveryMs" | "unhealthyThreshold">,
  ) {
    this.config = config;
  }

  recordSuccess(
    routeId: string,
    provider: ProviderId,
    model: string,
    latencyMs: number,
  ): void {
    const current =
      this.health.get(routeId) ?? this.createDefault(routeId, provider, model);
    current.avgLatencyMs = current.avgLatencyMs * 0.9 + latencyMs * 0.1;
    current.consecutiveErrors = 0;
    current.errorRate *= 0.95;
    current.isHealthy = true;
    this.health.set(routeId, current);
  }

  recordError(routeId: string, provider: ProviderId, model: string): void {
    const current =
      this.health.get(routeId) ?? this.createDefault(routeId, provider, model);
    current.consecutiveErrors++;
    current.lastErrorAt = Date.now();
    current.errorRate = current.errorRate * 0.9 + 0.1;
    if (current.consecutiveErrors >= this.config.unhealthyThreshold) {
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

  /** Check if route is rate-limited (remaining=0 and resetAt in future) */
  isRateLimited(routeId: string): boolean {
    const h = this.health.get(routeId);
    if (!h) return false;
    if (h.rateLimitRemaining > 0) return false;
    if (h.rateLimitResetAt === null) return false;
    return Date.now() < h.rateLimitResetAt;
  }

  getHealth(routeId: string): RouteHealth | undefined {
    const h = this.health.get(routeId);
    if (!h) return undefined;
    // Auto-recover after configured interval
    if (
      !h.isHealthy &&
      h.lastErrorAt &&
      Date.now() - h.lastErrorAt > this.config.unhealthyRecoveryMs
    ) {
      h.isHealthy = true;
      h.consecutiveErrors = 0;
    }
    return h;
  }

  /** Check if route should be skipped (unhealthy or rate-limited) */
  shouldSkip(routeId: string): boolean {
    const health = this.getHealth(routeId);
    if (health && !health.isHealthy) return true;
    if (this.isRateLimited(routeId)) return true;
    return false;
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

// ─── Route Retry Helper ──────────────────────────────────────────
// §4.3 — Retry with exponential backoff + jitter per route

function calculateRetryDelay(attempt: number, config: RouterConfig): number {
  const exponential = Math.min(
    config.routeRetryBaseDelayMs * Math.pow(2, attempt),
    config.routeRetryMaxDelayMs,
  );
  const jitter = exponential * 0.25 * Math.random();
  return Math.round(exponential + jitter);
}

function isRetryableRouteError(error: Error): boolean {
  const retryable = [
    "TimeoutError",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "NetworkError",
    "RateLimitError",
    "429",
    "503",
    "502",
  ];
  return retryable.some(
    (pattern) =>
      error.name.includes(pattern) ||
      error.message.includes(pattern) ||
      error.message.includes("rate limit") ||
      error.message.includes("timeout"),
  );
}

// ─── Model Router ──────────────────────────────────────────────────
// §4.3 — Route-level timeout, retry with backoff, rate-limit awareness,
//         evaluation gate check, circuit breaker via RouteHealthTracker

export class ModelRouter {
  private promptCache: PromptCache;
  private healthTracker: RouteHealthTracker;
  private assignmentCache = new Map<string, ModelAssignmentRecord>();
  private registryCache = new Map<string, ModelRegistryEntry>();
  private lastFetch = 0;
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.promptCache = new PromptCache(this.config.promptCacheTtlMs);
    this.healthTracker = new RouteHealthTracker(this.config);
  }

  /**
   * Get all available provider routes for a given agent/task.
   * Filters out unhealthy and rate-limited routes.
   * Checks evaluation gate — skips models that haven't passed Gate 4.
   */
  async getRoutes(
    agentName: string,
    taskType: string,
    _entityId: string,
  ): Promise<ProviderRoute[]> {
    await this.refreshCache();
    const assignment = await this.getAssignment(agentName, taskType);
    if (!assignment) {
      return [];
    }

    // §4.3 — Evaluation gate check: skip models still in evaluation
    const gate = assignment.evaluationGate;
    if (gate && gate !== "none" && gate !== "complete") {
      // Model is still in Gate 1-3 evaluation — don't route production traffic
      return [];
    }

    const routes: ProviderRoute[] = [];

    // Live route
    if (assignment.liveProvider && assignment.liveModelId) {
      const routeId = `${assignment.liveProvider}:${assignment.liveModelId}`;
      if (!this.healthTracker.shouldSkip(routeId)) {
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
          const entry = this.registryCache.get(modelId);
          if (entry) {
            const routeId = `${entry.provider}:${modelId}`;
            if (!this.healthTracker.shouldSkip(routeId)) {
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
      const routeId = `${assignment.fallbackProvider}:${assignment.fallbackModelId}`;
      if (!this.healthTracker.shouldSkip(routeId)) {
        routes.push({
          provider: assignment.fallbackProvider,
          model: assignment.fallbackModelId,
          priority: 1,
        });
      }
    }

    routes.sort((a, b) => a.priority - b.priority);
    return routes;
  }

  /**
   * §4.3 — Execute a model call with:
   *   - Route-level timeout (configurable, default 30s)
   *   - Route-level retry with exponential backoff (retry same route before fallback)
   *   - Rate-limit awareness (skip routes with exhausted limits)
   *   - Circuit breaker (≥3 consecutive errors → skip route)
   *   - Evaluation gate check (skip models in Gate 1-3)
   *   - Provider-pool load balancing
   *   - Prompt caching
   */
  async execute(
    agentName: string,
    taskType: string,
    entityId: string,
    params: {
      systemPrompt: string;
      messages: Array<{
        role: "user" | "assistant" | "system";
        content: string | ModelMessageContentBlock[];
      }>;
      tools?: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>;
      toolChoice?: { type: "tool"; name: string };
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

    // 2. Get routes (already filtered for health, rate-limit, evaluation gate)
    const routes = await this.getRoutes(agentName, taskType, entityId);
    const errors: string[] = [];

    if (routes.length === 0) {
      throw new Error(
        `No available routes for ${agentName}/${taskType} — all routes unhealthy, rate-limited, or in evaluation`,
      );
    }

    // 3. Group by model for provider-pool load balancing
    const groupedRoutes = this.groupByModel(routes);

    for (const [, modelRoutes] of groupedRoutes) {
      // Sort by health: healthy first, then by lowest avg latency
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

        // §4.3 — Route-level retry with exponential backoff
        for (
          let attempt = 0;
          attempt <= this.config.maxRouteRetries;
          attempt++
        ) {
          // §4.3 — Re-check health before each attempt
          if (this.healthTracker.shouldSkip(routeId)) {
            break; // Move to next route
          }

          const startTime = Date.now();

          try {
            // §4.3 — Route-level timeout via Promise.race
            const response = await Promise.race([
              adapter.complete({
                model: route.model,
                systemPrompt: params.systemPrompt,
                messages: params.messages,
                tools: params.tools,
                toolChoice: params.toolChoice,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
              }),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new TimeoutError(
                        `Route ${routeId} timed out after ${this.config.routeTimeoutMs}ms`,
                      ),
                    ),
                  this.config.routeTimeoutMs,
                ),
              ),
            ]);

            const latencyMs = Date.now() - startTime;
            this.healthTracker.recordSuccess(
              routeId,
              route.provider,
              route.model,
              latencyMs,
            );

            // Cache successful responses (only non-tool, high-confidence)
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
            const err =
              error instanceof Error ? error : new Error(String(error));
            this.healthTracker.recordError(
              routeId,
              route.provider,
              route.model,
            );

            // §4.3 — If retryable and retries remain, backoff and retry same route
            if (
              attempt < this.config.maxRouteRetries &&
              isRetryableRouteError(err)
            ) {
              const delay = calculateRetryDelay(attempt, this.config);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue; // Retry same route
            }

            // Non-retryable or retries exhausted — move to next route
            errors.push(`[${routeId}] ${err.message}`);
            break;
          }
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
    if (Date.now() - this.lastFetch < this.config.cacheTtlMs) return;
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
          evaluationGate: assignment.evaluationGate,
        };
        this.assignmentCache.set(cacheKey, record);
        return record;
      }
    } catch {
      // DB not available, return undefined
    }

    return undefined;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let router: ModelRouter | null = null;

export function getModelRouter(config?: Partial<RouterConfig>): ModelRouter {
  if (!router) {
    router = new ModelRouter(config);
  }
  return router;
}

// ─── TimeoutError ──────────────────────────────────────────────────

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
