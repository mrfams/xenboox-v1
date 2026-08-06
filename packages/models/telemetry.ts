// §4.4 — LLM Telemetry & Cost Reconciliation
// Records every gateway call to agentActivity and rolls up daily costs to modelCostTracking.

import { db } from "@xenboox/db";
import { agentActivity } from "@xenboox/db/schema";
import { modelRegistry, modelCostTracking } from "@xenboox/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ProviderId } from "./types";

// ─── Cost Calculation ──────────────────────────────────────────────

interface ModelCostRates {
  inputPerMillion: number;
  outputPerMillion: number;
}

const costCache = new Map<string, ModelCostRates>();
let costCacheLastFetch = 0;
const COST_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

async function getModelCostRates(
  modelId: string,
  provider: ProviderId,
): Promise<ModelCostRates> {
  const cacheKey = `${modelId}:${provider}`;
  const cached = costCache.get(cacheKey);
  if (cached && Date.now() - costCacheLastFetch < COST_CACHE_TTL_MS) {
    return cached;
  }

  try {
    const entry = await db.query.modelRegistry.findFirst({
      where: (fields, ops) =>
        ops.and(
          ops.eq(fields.modelId, modelId),
          ops.eq(fields.provider, provider as never),
        ),
    });

    if (entry) {
      const rates: ModelCostRates = {
        inputPerMillion: parseFloat(entry.costPerMillionInputTokens) || 0,
        outputPerMillion: parseFloat(entry.costPerMillionOutputTokens) || 0,
      };
      costCache.set(cacheKey, rates);
      costCacheLastFetch = Date.now();
      return rates;
    }
  } catch {
    // DB not available
  }

  return { inputPerMillion: 0, outputPerMillion: 0 };
}

function calculateCostCents(
  inputTokens: number,
  outputTokens: number,
  rates: ModelCostRates,
): number {
  const inputCost = (inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPerMillion;
  return Math.round((inputCost + outputCost) * 100); // Convert to cents
}

// ─── Record Agent Activity ────────────────────────────────────────
// §4.4 — Writes a row to agent_activity after every gateway call.

export interface AgentActivityRecord {
  entityId: string;
  agentName: string;
  action: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  confidence?: number;
  durationMs?: number;
  modelId?: string;
  provider?: ProviderId;
  inputTokens?: number;
  outputTokens?: number;
  fromCache?: boolean;
  langfuseTraceId?: string;
  status?: "success" | "error";
  errorMessage?: string;
}

export async function recordAgentActivity(
  record: AgentActivityRecord,
): Promise<void> {
  try {
    // Calculate cost if we have token counts and model info
    let costCents: number | undefined;
    if (
      record.modelId &&
      record.provider &&
      record.inputTokens !== undefined &&
      record.outputTokens !== undefined
    ) {
      const rates = await getModelCostRates(record.modelId, record.provider);
      costCents = calculateCostCents(
        record.inputTokens,
        record.outputTokens,
        rates,
      );
    }

    await db.insert(agentActivity).values({
      entityId: record.entityId,
      agentName: record.agentName,
      action: record.action,
      input: record.input ?? {},
      output: record.output ?? {},
      confidence: record.confidence?.toString(),
      durationMs: record.durationMs,
      costCents,
      modelId: record.modelId,
      provider: record.provider,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      fromCache: record.fromCache ?? false,
      langfuseTraceId: record.langfuseTraceId,
      status: record.status ?? "success",
      errorMessage: record.errorMessage,
    });
  } catch {
    // Telemetry write failure should never break the main flow
    console.warn("[telemetry] Failed to record agent activity");
  }
}

// ─── Daily Cost Rollup ────────────────────────────────────────────
// §4.4 — Aggregates agent_activity rows into modelCostTracking for the admin dashboard.

export async function rollupDailyCosts(date?: string): Promise<void> {
  const targetDate = date ?? new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Aggregate costs from agent_activity for the given date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rollup: any[] = await (db as any)
      .select({
        agentName: agentActivity.agentName,
        modelId: agentActivity.modelId,
        provider: agentActivity.provider,
        requestsCount: sql`count(*)::int`,
        inputTokens: sql`coalesce(sum(${agentActivity.inputTokens}), 0)::int`,
        outputTokens: sql`coalesce(sum(${agentActivity.outputTokens}), 0)::int`,
        costCents: sql`coalesce(sum(${agentActivity.costCents}), 0)::int`,
      })
      .from(agentActivity)
      .where(
        and(
          sql`date(${agentActivity.createdAt}) = ${targetDate}`,
          sql`${agentActivity.modelId} is not null`,
        ),
      )
      .groupBy(
        agentActivity.agentName,
        agentActivity.modelId,
        agentActivity.provider,
      );

    // Upsert into modelCostTracking
    for (const row of rollup) {
      if (!row.modelId || !row.provider) continue;

      const entityId = await getDefaultEntityId();
      if (!entityId) continue;

      await db
        .insert(modelCostTracking)
        .values({
          entityId,
          agentName: row.agentName,
          modelId: row.modelId,
          provider: row.provider as ProviderId,
          date: targetDate,
          requestsCount: String(row.requestsCount ?? 0),
          inputTokens: String(row.inputTokens ?? 0),
          outputTokens: String(row.outputTokens ?? 0),
          costUsd: (Number(row.costCents ?? 0) / 100).toFixed(4),
        })
        .onConflictDoUpdate({
          target: [
            modelCostTracking.entityId,
            modelCostTracking.agentName,
            modelCostTracking.modelId,
            modelCostTracking.date,
          ],
          set: {
            requestsCount: String(row.requestsCount ?? 0),
            inputTokens: String(row.inputTokens ?? 0),
            outputTokens: String(row.outputTokens ?? 0),
            costUsd: (Number(row.costCents ?? 0) / 100).toFixed(4),
          },
        });
    }
  } catch {
    console.warn("[telemetry] Failed to roll up daily costs");
  }
}

// Helper: get a default entity for cost tracking (system-level)
async function getDefaultEntityId(): Promise<string | null> {
  try {
    const { entities } = await import("@xenboox/db/schema");
    const result = await db.query.entities.findFirst();
    return result?.id ?? null;
  } catch {
    return null;
  }
}
