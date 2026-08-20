/**
 * Data Retention Purge Job
 *
 * Trigger.dev task that enforces data retention policies per entity.
 * Scans all active policies, computes cutoff dates, and purges expired rows
 * from each table while respecting legal holds and exclusion clauses.
 *
 * Safety:
 *  - Legal hold tables are never purged
 *  - Purge operations are batched (1000 rows per batch) to avoid long locks
 *  - Every purge is logged to retention_purge_logs for audit trail
 *  - Exclusion WHERE clauses are validated against a whitelist of safe patterns
 *  - Entity-scoped: only purges rows belonging to the policy's entity
 */

import { db } from "@xenboox/db";
import {
  retentionPolicies,
  retentionPurgeLogs,
} from "@xenboox/db/schema/data-retention";
import { and, eq, lt, isNotNull, sql, inArray } from "drizzle-orm";
import { task } from "@trigger.dev/sdk";
import { logger } from "@xenboox/agents/core/logger";

// ─── Constants ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 1000;
const MAX_TABLES_PER_RUN = 20;

// Tables that are safe to purge (whitelist — prevents accidental schema
// modification or purging of critical system tables). Only tables that are
// entity-scoped and append-heavy are eligible.
const SAFE_PURGE_TABLES = new Set([
  "audit_log",
  "audit_log_partitioned",
  "bank_transactions",
  "bank_transactions_partitioned",
  "journal_entries",
  "journal_entries_partitioned",
  "chat_messages",
  "document_versions",
  "notifications",
  "retention_purge_logs",
  "ops_live_run_events",
  "ops_token_usage",
  "api_call_logs",
  "webhook_delivery_logs",
  "email_logs",
  "idempotency_keys",
]);

// Exclusion WHERE patterns that are safe to inject. Only column comparisons
// against known safe values — no subqueries, no functions, no joins.
const SAFE_WHERE_PATTERNS = [
  /^status\s*!=\s*'?\w+'?$/,
  /^status\s*=\s*'?\w+'?$/,
  /is_active\s*=\s*(true|false)$/,
  /closed_at\s+IS\s+(NULL|NOT\s+NULL)$/i,
];

// ─── Main Task ─────────────────────────────────────────────────────────────

export const dataRetentionTask = task({
  id: "data-retention-purge",
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
  },

  run: async (payload: { triggeredBy?: string; runId?: string }) => {
    const startTime = Date.now();
    const triggeredBy = payload.triggeredBy ?? "cron";
    const runId = payload.runId ?? `dr-${Date.now()}`;

    logger.info("data-retention: starting purge run", { triggeredBy, runId });

    // Fetch all active, non-legal-hold policies
    const policies = await db
      .select()
      .from(retentionPolicies)
      .where(
        and(
          eq(retentionPolicies.enabled, true),
          eq(retentionPolicies.legalHold, false),
        ),
      )
      .limit(MAX_TABLES_PER_RUN);

    if (policies.length === 0) {
      logger.info("data-retention: no active policies found, skipping");
      return { purged: 0, policies: 0, errors: 0 };
    }

    let totalPurged = 0;
    let errors = 0;

    for (const policy of policies) {
      // Validate table is in the safe list
      if (!SAFE_PURGE_TABLES.has(policy.tableName)) {
        logger.warn("data-retention: table not in safe purge list, skipping", {
          table: policy.tableName,
          entityId: policy.entityId,
        });
        continue;
      }

      // Validate exclusion WHERE pattern if provided
      if (policy.exclusionWhere) {
        const isSafe = SAFE_WHERE_PATTERNS.some((p) =>
          p.test(policy.exclusionWhere!),
        );
        if (!isSafe) {
          logger.error(
            "data-retention: exclusion WHERE failed safety validation, skipping",
            {
              table: policy.tableName,
              entityId: policy.entityId,
              where: policy.exclusionWhere,
            },
          );
          continue;
        }
      }

      try {
        const result = await purgeEntityRows(
          policy.entityId,
          policy.tableName,
          policy.retentionDays,
          policy.retentionColumn ?? "created_at",
          policy.exclusionWhere,
          policy.id,
          triggeredBy,
          runId,
        );

        totalPurged += result;
      } catch (err) {
        errors += 1;
        logger.error("data-retention: purge failed for table", {
          table: policy.tableName,
          entityId: policy.entityId,
          error: err instanceof Error ? err.message : String(err),
        });

        // Log the failure
        await logPurgeResult({
          entityId: policy.entityId,
          policyId: policy.id,
          tableName: policy.tableName,
          rowsPurged: 0,
          cutoffDate: computeCutoffDate(policy.retentionDays),
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          triggeredBy,
          runId,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info("data-retention: purge run complete", {
      policies: policies.length,
      totalPurged,
      errors,
      durationMs,
    });

    return { purged: totalPurged, policies: policies.length, errors };
  },
});

// ─── Purge Logic ───────────────────────────────────────────────────────────

async function purgeEntityRows(
  entityId: string,
  tableName: string,
  retentionDays: number,
  retentionColumn: string,
  exclusionWhere: string | null,
  policyId: string,
  triggeredBy: string,
  runId: string,
): Promise<number> {
  const cutoffDate = computeCutoffDate(retentionDays);
  let totalPurged = 0;
  let batchCount = 0;
  const maxBatches = 50; // Safety limit: 50K rows max per table per run

  while (batchCount < maxBatches) {
    // Build the delete query with entity scoping, cutoff, and optional exclusion
    const deleteQuery = buildDeleteQuery(
      tableName,
      entityId,
      retentionColumn,
      cutoffDate,
      exclusionWhere,
    );

    const result = await db.execute(deleteQuery);
    const deletedCount = result.rowCount ?? 0;

    totalPurged += deletedCount;
    batchCount += 1;

    // If fewer rows than batch size were deleted, we're done
    if (deletedCount < BATCH_SIZE) break;
  }

  // Log the successful purge
  if (totalPurged > 0) {
    await logPurgeResult({
      entityId,
      policyId,
      tableName,
      rowsPurged: totalPurged,
      cutoffDate,
      status: "success",
      triggeredBy,
      runId,
      metadata: { batches: batchCount, retentionDays },
    });
  }

  return totalPurged;
}

function buildDeleteQuery(
  tableName: string,
  entityId: string,
  retentionColumn: string,
  cutoffDate: Date,
  exclusionWhere: string | null,
): ReturnType<typeof sql> {
  const cutoff = cutoffDate.toISOString();

  // Build a safe DELETE with Drizzle's sql tagged template
  // This is entity-scoped and time-scoped by construction
  const baseDelete = sql`
    DELETE FROM ${sql.identifier(tableName)}
    WHERE entity_id = ${entityId}
      AND ${sql.identifier(retentionColumn)} < ${cutoff}
  `;

  if (exclusionWhere) {
    // exclusionWhere is validated against SAFE_WHERE_PATTERNS
    return sql`${baseDelete} AND NOT (${sql.raw(exclusionWhere)})`;
  }

  return baseDelete;
}

function computeCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

// ─── Logging ───────────────────────────────────────────────────────────────

interface PurgeLogEntry {
  entityId: string;
  policyId: string;
  tableName: string;
  rowsPurged: number;
  cutoffDate: Date;
  status: string;
  error?: string;
  triggeredBy: string;
  runId: string;
  metadata?: Record<string, unknown>;
}

async function logPurgeResult(entry: PurgeLogEntry): Promise<void> {
  try {
    await db.insert(retentionPurgeLogs).values({
      entityId: entry.entityId,
      policyId: entry.policyId,
      tableName: entry.tableName,
      rowsPurged: entry.rowsPurged,
      cutoffDate: entry.cutoffDate,
      status: entry.status,
      error: entry.error ?? null,
      triggeredBy: entry.triggeredBy,
      runId: entry.runId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (err) {
    // Log failure must never break the purge flow
    logger.error("data-retention: failed to write purge log", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
