// ─── AI Gateway — Cost Control & Rate Limiting (§22.1) ─────────────────────
//
// The gateway sits in front of every LLM call (callModel / streamModel in
// entry.ts). It enforces, per entity (tenant):
//   1. A hard kill-switch (global env flag).
//   2. A daily token ceiling.
//   3. A daily cost ceiling (USD) computed from model pricing.
//   4. Spend alerts at configurable thresholds (80%, 100%).
//
// Enforcement is cheap and synchronous — no DB round-trip on the hot path.
// Usage is tracked in-memory per process; cross-instance strictness requires
// the DB-backed counters (ops-token-usage) which the ops dashboard rolls up
// — the gateway is the hard backstop, not the accounting source of truth.
//
// Mock env keys (user supplies real values at launch — see .env.example):
//   AI_KILL_SWITCH            "true" blocks ALL model calls immediately
//   AI_BUDGET_DAILY_TOKENS    per-entity daily token ceiling (default 500_000)
//   AI_BUDGET_DAILY_COST_USD  per-entity daily cost ceiling (default 50)
//   AI_PRICE_<MODEL>_INPUT    per-million input price override (USD)
//   AI_PRICE_<MODEL>_OUTPUT   per-million output price override (USD)

import { db } from "@xenboox/db";
import { notifications, userEntityAccess } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";

export class AiBudgetExceededError extends Error {
  readonly entityId: string;
  readonly reason: "tokens" | "cost" | "kill_switch";
  readonly limit: number;
  readonly current: number;

  constructor(
    entityId: string,
    reason: "tokens" | "cost" | "kill_switch",
    limit: number,
    current: number,
  ) {
    super(
      reason === "kill_switch"
        ? "AI calls are temporarily disabled by the platform kill-switch"
        : `Entity ${entityId} exceeded its daily AI budget (${reason}: ${current}/${limit})`,
    );
    this.name = "AiBudgetExceededError";
    this.entityId = entityId;
    this.reason = reason;
    this.limit = limit;
    this.current = current;
  }
}

export interface SpendAlert {
  entityId: string;
  kind: "tokens" | "cost";
  thresholdPct: number; // 0.8 = 80%
  current: number;
  limit: number;
  at: Date;
}

export interface UsageSnapshot {
  tokens: number;
  costUsd: number;
}

/** Built-in fallback pricing (USD per million tokens) — mock values, override via env. */
const DEFAULT_PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

function envNum(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function priceFor(modelId: string): { input: number; output: number } {
  const sanitized = modelId.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase();
  const inputOverride = process.env[`AI_PRICE_${sanitized}_INPUT`];
  const outputOverride = process.env[`AI_PRICE_${sanitized}_OUTPUT`];
  const base = DEFAULT_PRICES[modelId] ?? { input: 3.0, output: 15.0 };
  return {
    input: inputOverride ? Number(inputOverride) : base.input,
    output: outputOverride ? Number(outputOverride) : base.output,
  };
}

export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const { input, output } = priceFor(modelId);
  return (
    (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output
  );
}

interface EntityState {
  day: string; // YYYY-MM-DD
  tokens: number;
  costUsd: number;
  alerted: Set<string>; // `${kind}:${thresholdPct}`
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Default spend-alert writer: creates a notification row for every user with
 * access to the entity (ops-review-queue style surface). Never throws — a
 * failed alert write must not affect the model call that triggered it.
 */
async function writeSpendAlertNotification(alert: SpendAlert): Promise<void> {
  try {
    const kindLabel = alert.kind === "tokens" ? "token budget" : "cost budget";
    const pctLabel = Math.round(alert.thresholdPct * 100);
    const title =
      pctLabel >= 100
        ? `AI ${kindLabel} exhausted for entity ${alert.entityId.slice(0, 8)}`
        : `AI ${kindLabel} at ${pctLabel}% for entity ${alert.entityId.slice(0, 8)}`;

    // Notify every user that has access to this entity (owner + members).
    const users = await db
      .select({ userId: userEntityAccess.userId })
      .from(userEntityAccess)
      .where(eq(userEntityAccess.entityId, alert.entityId));

    if (users.length === 0) return;

    await db.insert(notifications).values(
      users.map((u) => ({
        userId: u.userId,
        entityId: alert.entityId,
        type: "ai_budget_alert",
        priority: pctLabel >= 100 ? "high" : "medium",
        title,
        body: `Current ${alert.kind}: ${alert.current.toFixed(2)} / limit ${alert.limit.toFixed(2)}`,
        data: JSON.stringify({
          kind: alert.kind,
          thresholdPct: alert.thresholdPct,
          current: alert.current,
          limit: alert.limit,
        }),
        status: "sent",
        sentAt: new Date(),
      })),
    );
  } catch {
    // Alert write failure must never propagate into the calling pipeline.
  }
}

export class AiGateway {
  private readonly states = new Map<string, EntityState>();
  private alertHandler: ((alert: SpendAlert) => void) | null = null;

  constructor(
    private readonly dailyTokenCeiling: number = envNum(
      "AI_BUDGET_DAILY_TOKENS",
      500_000,
    ),
    private readonly dailyCostCeilingUsd: number = envNum(
      "AI_BUDGET_DAILY_COST_USD",
      50,
    ),
    private readonly alertThresholds: number[] = [0.8, 1.0],
  ) {}

  /** Register a callback invoked whenever a spend alert fires. */
  onAlert(handler: (alert: SpendAlert) => void): void {
    this.alertHandler = handler;
  }

  /** Wire the default notification surface (called once at boot). */
  enableNotificationAlerts(): void {
    this.onAlert((alert) => {
      void writeSpendAlertNotification(alert);
    });
  }

  killSwitchEnabled(): boolean {
    return process.env.AI_KILL_SWITCH === "true";
  }

  /** Hard kill-switch — blocks all calls immediately regardless of budget. */
  assertNotKilled(): void {
    if (this.killSwitchEnabled()) {
      throw new AiBudgetExceededError("global", "kill_switch", 0, 1);
    }
  }

  /**
   * Called before every model invocation. Throws AiBudgetExceededError when
   * the entity is over either ceiling (or the kill-switch is armed).
   */
  assertBudgetAllowed(entityId: string): void {
    this.assertNotKilled();

    const state = this.states.get(entityId);
    if (!state || state.day !== todayKey()) return; // fresh day — allowed

    if (state.tokens >= this.dailyTokenCeiling) {
      throw new AiBudgetExceededError(
        entityId,
        "tokens",
        this.dailyTokenCeiling,
        state.tokens,
      );
    }
    if (state.costUsd >= this.dailyCostCeilingUsd) {
      throw new AiBudgetExceededError(
        entityId,
        "cost",
        this.dailyCostCeilingUsd,
        state.costUsd,
      );
    }
  }

  /**
   * Called after a successful model invocation with actual token counts.
   * Updates the entity's rolling usage and fires spend alerts at the
   * configured thresholds (fires once per threshold per day).
   */
  recordUsage(
    entityId: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const costUsd = estimateCostUsd(modelId, inputTokens, outputTokens);
    const day = todayKey();

    let state = this.states.get(entityId);
    if (!state || state.day !== day) {
      state = { day, tokens: 0, costUsd: 0, alerted: new Set() };
      this.states.set(entityId, state);
    }

    state.tokens += inputTokens + outputTokens;
    state.costUsd += costUsd;

    const candidates: Array<{
      kind: "tokens" | "cost";
      value: number;
      limit: number;
    }> = [
      { kind: "tokens", value: state.tokens, limit: this.dailyTokenCeiling },
      { kind: "cost", value: state.costUsd, limit: this.dailyCostCeilingUsd },
    ];

    for (const { kind, value, limit } of candidates) {
      if (limit <= 0) continue;
      const pct = value / limit;
      for (const threshold of this.alertThresholds) {
        if (pct >= threshold) {
          const key = `${kind}:${threshold}`;
          if (!state.alerted.has(key)) {
            state.alerted.add(key);
            this.alertHandler?.({
              entityId,
              kind,
              thresholdPct: threshold,
              current: value,
              limit,
              at: new Date(),
            });
          }
        }
      }
    }
  }

  /** Current usage snapshot for an entity (0s on a fresh day). */
  getUsage(entityId: string): UsageSnapshot {
    const state = this.states.get(entityId);
    if (!state || state.day !== todayKey()) return { tokens: 0, costUsd: 0 };
    return { tokens: state.tokens, costUsd: state.costUsd };
  }

  /** Test / ops helper: reset an entity's counters (e.g. after a plan change). */
  reset(entityId: string): void {
    this.states.delete(entityId);
  }

  resetAll(): void {
    this.states.clear();
  }
}

/** Singleton used by the model entry point. Tests can construct fresh instances. */
export const aiGateway = new AiGateway();
