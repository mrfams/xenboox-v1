import { db } from "@xenboox/db";
import { modelAssignments } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";
import type { ProviderId } from "./types";

export interface AssignmentRecord {
  id: string;
  agentName: string;
  taskType: string;
  liveModelId: string;
  liveProvider: ProviderId;
  fallbackModelId: string | null;
  fallbackProvider: ProviderId | null;
  trafficSplit: Record<string, number> | null;
}

const cache = new Map<string, AssignmentRecord>();
const cacheTimestamps = new Map<string, number>();
const TTL_MS = 60_000; // 1 minute

/**
 * Get the live model assignment for an agent + task type.
 * Cached for TTL_MS to avoid hammering the DB on every agent call.
 * Returns undefined if no assignment is configured — caller falls back to defaults.
 */
export async function getAssignment(
  agentName: string,
  taskType: string,
): Promise<AssignmentRecord | undefined> {
  const cacheKey = `${agentName}:${taskType}`;
  const cached = cache.get(cacheKey);
  const cachedAt = cacheTimestamps.get(cacheKey) ?? 0;

  if (cached && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }

  try {
    const row = await db.query.modelAssignments.findFirst({
      where: and(
        eq(modelAssignments.agentName, agentName),
        eq(modelAssignments.taskType, taskType as never),
        eq(modelAssignments.isActive, true),
      ),
    });

    if (!row) {
      cache.delete(cacheKey);
      return undefined;
    }

    const record: AssignmentRecord = {
      id: row.id,
      agentName: row.agentName,
      taskType: row.taskType,
      liveModelId: row.liveModelId,
      liveProvider: row.liveProvider as ProviderId,
      fallbackModelId: row.fallbackModelId,
      fallbackProvider: row.fallbackProvider as ProviderId | null,
      trafficSplit: row.trafficSplit as Record<string, number> | null,
    };

    cache.set(cacheKey, record);
    cacheTimestamps.set(cacheKey, Date.now());
    return record;
  } catch {
    // DB unavailable — use stale cache if available
    if (cached) return cached;
    return undefined;
  }
}

/**
 * Invalidate cache for a specific assignment (used by admin panel after edits).
 */
export function invalidateAssignment(
  agentName: string,
  taskType: string,
): void {
  cache.delete(`${agentName}:${taskType}`);
  cacheTimestamps.delete(`${agentName}:${taskType}`);
}

/**
 * Invalidate entire cache (used after bulk updates).
 */
export function invalidateAllAssignments(): void {
  cache.clear();
  cacheTimestamps.clear();
}
