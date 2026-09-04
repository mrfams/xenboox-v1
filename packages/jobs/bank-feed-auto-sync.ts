/**
 * Bank Feed Auto-Sync Scheduler
 *
 * Runs every 6 hours via Trigger.dev cron. Queries all active bank connections
 * across all entities and dispatches to the appropriate provider-specific sync job:
 *   - mono  → mono-sync-transactions
 *   - plaid → plaid-sync-transactions
 *   - stitch / manual → skipped
 *
 * Each provider sync runs as a separate Trigger.dev task with its own concurrency
 * and retry config, so a Mono failure never blocks a Plaid sync.
 */

import { task, logger } from "@trigger.dev/sdk";
import { TriggerClient } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { bankConnections, auditLog } from "@xenboox/db/schema";
import { and, eq, desc } from "drizzle-orm";

const triggerClient = new TriggerClient({
  secretKey: process.env.TRIGGER_SECRET_KEY!,
});

function tenantJobOptions(
  entityId: string,
  key: string,
): { concurrencyKey: string; idempotencyKey: string } {
  return {
    concurrencyKey: entityId,
    idempotencyKey: `job:${entityId}:${key}`,
  };
}

export const autoSyncBankFeeds = task({
  id: "bank-feed-auto-sync",
  maxDuration: 600, // 10 minutes — enough to dispatch all connections
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1, // Only one orchestrator at a time
  },

  onFailure: dlqOnFailure<{ triggeredAt: string }>({
    task: "bank-feed-auto-sync",
    type: "data_validation",
    severity: "high",
    title: () => "Bank feed auto-sync scheduler failed",
  }),

  run: async (payload: { triggeredAt?: string }) => {
    const triggeredAt = payload.triggeredAt ?? new Date().toISOString();
    logger.info("Starting bank feed auto-sync", { triggeredAt });

    // 1. Query all active bank connections (all entities)
    const connections = await db.query.bankConnections.findMany({
      where: eq(bankConnections.status, "active"),
      orderBy: [desc(bankConnections.lastSyncedAt)],
    });

    logger.info("Found active bank connections", {
      count: connections.length,
    });

    if (connections.length === 0) {
      logger.info("No active connections to sync");
      return {
        success: true,
        totalConnections: 0,
        triggered: 0,
        skipped: 0,
        errors: 0,
      };
    }

    // 2. Group connections by entity for audit logging
    const entityIds = [...new Set(connections.map((c) => c.entityId))];

    // 3. Dispatch to provider-specific sync jobs
    let triggered = 0;
    let skipped = 0;
    let errors = 0;
    const errorsList: Array<{
      connectionId: string;
      provider: string;
      error: string;
    }> = [];

    // M1 (H4): collect dispatchable connections first, then fire them in
    // bounded-parallel chunks. Sequential awaits over hundreds of connections
    // can exceed the task's maxDuration and starve the connections at the end
    // of the list — every 6-hour cycle would silently miss them.
    type DispatchTarget = {
      connection: (typeof connections)[number];
      task: "mono-sync-transactions" | "plaid-sync-transactions";
      payload: Record<string, string>;
      options: { concurrencyKey: string; idempotencyKey: string };
    };
    const targets: DispatchTarget[] = [];

    for (const connection of connections) {
      const provider = connection.provider;

      // Skip providers without sync jobs
      if (provider === "manual" || provider === "stitch") {
        logger.info("Skipping connection (no sync provider)", {
          connectionId: connection.id,
          provider,
        });
        skipped++;
        continue;
      }

      if (provider === "mono") {
        // Mono requires the provider account id to paginate transactions.
        if (!connection.providerConnectionId) {
          logger.warn("Skipping connection (missing provider connection ID)", {
            connectionId: connection.id,
            provider,
          });
          skipped++;
          continue;
        }
        targets.push({
          connection,
          task: "mono-sync-transactions",
          payload: {
            connectionId: connection.id,
            entityId: connection.entityId,
            providerConnectionId: connection.providerConnectionId,
          },
          options: tenantJobOptions(
            connection.entityId,
            `mono-sync:${connection.id}`,
          ),
        });
      } else if (provider === "plaid") {
        // Plaid sync reads the access token + cursor from the connection row
        // itself, so it only needs ids — never skip a valid Plaid link here.
        targets.push({
          connection,
          task: "plaid-sync-transactions",
          payload: {
            connectionId: connection.id,
            entityId: connection.entityId,
          },
          options: tenantJobOptions(
            connection.entityId,
            `plaid-sync:${connection.id}`,
          ),
        });
      } else {
        logger.warn("Unknown provider, skipping", {
          connectionId: connection.id,
          provider,
        });
        skipped++;
      }
    }

    const DISPATCH_CHUNK = 20;
    for (let i = 0; i < targets.length; i += DISPATCH_CHUNK) {
      const chunk = targets.slice(i, i + DISPATCH_CHUNK);
      const results = await Promise.allSettled(
        chunk.map((t) =>
          triggerClient.tasks.trigger(t.task, t.payload, t.options),
        ),
      );
      chunk.forEach((t, idx) => {
        const outcome = results[idx];
        if (!outcome) return; // unreachable — results mirrors chunk length
        if (outcome.status === "fulfilled") {
          triggered++;
        } else {
          errors++;
          const reason = outcome.reason;
          const errorMsg =
            reason instanceof Error ? reason.message : String(reason);
          errorsList.push({
            connectionId: t.connection.id,
            provider: t.connection.provider,
            error: errorMsg,
          });
          logger.error("Failed to trigger sync for connection", {
            connectionId: t.connection.id,
            provider: t.connection.provider,
            error: errorMsg,
          });
        }
      });
    }

    // 4. Audit log per entity
    for (const entityId of entityIds) {
      const entityConnections = connections.filter(
        (c) => c.entityId === entityId,
      );

      await db.insert(auditLog).values({
        entityId,
        action: "bank_feed.auto_sync",
        entityType: "bank_connection",
        newValues: {
          triggeredAt,
          totalConnections: entityConnections.length,
          triggered: entityConnections.filter(
            (c) => c.provider === "mono" || c.provider === "plaid",
          ).length,
          providerBreakdown: {
            mono: entityConnections.filter((c) => c.provider === "mono").length,
            plaid: entityConnections.filter((c) => c.provider === "plaid")
              .length,
            manual: entityConnections.filter((c) => c.provider === "manual")
              .length,
          },
          // H3: record exactly which connections failed to dispatch so the
          // audit trail is not just a green count.
          dispatchErrors: errorsList.filter(
            (e) =>
              e.connectionId !== undefined &&
              entityConnections.some((c) => c.id === e.connectionId),
          ),
        },
      });
    }

    logger.info("Bank feed auto-sync completed", {
      totalConnections: connections.length,
      triggered,
      skipped,
      errors,
      entitiesScanned: entityIds.length,
    });

    // H3 (fail-loud): when any dispatch failed, throw so the task's own retry
    // policy re-runs the cycle (per-connection idempotency keys dedupe the
    // syncs that already triggered) and, once retries are exhausted, the DLQ
    // captures the failure. Returning success here would hide a partial sync.
    if (errorsList.length > 0) {
      throw new Error(
        `${errorsList.length} connection(s) failed to dispatch: ${errorsList
          .slice(0, 3)
          .map((e) => `${e.connectionId} (${e.error})`)
          .join("; ")}`,
      );
    }

    return {
      success: true,
      totalConnections: connections.length,
      triggered,
      skipped,
      errors,
      errorsList,
      entitiesScanned: entityIds.length,
    };
  },
});
