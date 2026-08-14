import { TriggerClient } from "@trigger.dev/sdk";

export const triggerClient = new TriggerClient({
  secretKey: process.env.TRIGGER_SECRET_KEY!,
});

/**
 * Trigger options for tenant-scoped jobs.
 *
 * - `concurrencyKey: entityId` gives every tenant its own queue copy with the
 *   task's own concurrencyLimit, so one tenant's bulk import can never starve
 *   another tenant's jobs (fair scheduling).
 * - `idempotencyKey` (deterministic, namespaced) makes a double trigger — e.g.
 *   a webhook that fires twice, or a retried HTTP request — collapse into a
 *   single run, so jobs are never double-executed (job-trigger idempotency).
 */
export function tenantJobOptions(
  entityId: string,
  key: string,
): { concurrencyKey: string; idempotencyKey: string } {
  return {
    concurrencyKey: entityId,
    // entityId is part of the key material: idempotency is scoped to the
    // tenant so a key can never collide across entities.
    idempotencyKey: `job:${entityId}:${key}`,
  };
}
