/**
 * Dead-Letter Queue helper.
 *
 * When a Trigger.dev task exhausts its retries (poison task), it must not
 * silently vanish. This surfaces the failure into the `review_items` table
 * (ops-review-queue schema) so the ops review queue can pick it up.
 *
 * Used from `onFailure` task hooks — see each task's `onFailure` handler.
 */

import { db } from "@xenboox/db";
import { reviewItems, entities } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";

export type DlqSeverity = "low" | "medium" | "high" | "critical";

export interface DlqEnqueueOptions {
  /** The tenant/entity the failing run belonged to (used to resolve organization). */
  entityId?: string;
  /** Trigger.dev task id, e.g. "process-document". */
  task: string;
  /** Trigger.dev run id. */
  runId: string;
  /** Short human title for the review queue row. */
  title: string;
  /** Longer description including the error. */
  description: string;
  /** Review queue item type (ops-review-queue enum). */
  type?:
    | "data_validation"
    | "entity_resolution"
    | "duplicate_detection"
    | "compliance"
    | "missing_data"
    | "approval"
    | "anomaly"
    | "review"
    | "configuration";
  severity?: DlqSeverity;
  /** Optional structured context (JSON-serializable). */
  contextData?: Record<string, unknown>;
}

/**
 * Insert a poison-task row into the ops review queue.
 *
 * Resolves `organization_id` from the entity (entities are the tenant boundary;
 * review items are org-scoped). If the entity cannot be resolved we still
 * enqueue with a null org — better visible than lost.
 */
export async function enqueueReviewItem(
  options: DlqEnqueueOptions,
): Promise<void> {
  const {
    entityId,
    task,
    runId,
    title,
    description,
    type = "review",
    severity = "high",
    contextData,
  } = options;

  try {
    let organizationId: string | undefined;
    if (entityId) {
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
        columns: { organizationId: true },
      });
      organizationId = entity?.organizationId;
    }

    await db.insert(reviewItems).values({
      organizationId,
      agentId: task,
      runId,
      title,
      description,
      type,
      priority: severity,
      status: "pending",
      contextData: contextData ? JSON.stringify(contextData) : null,
    });
  } catch (err) {
    // The DLQ must never throw — a failed DLQ write would otherwise re-enter
    // the retry loop. Log and move on; Sentry/OTel will surface this.
    console.error("[dlq] failed to enqueue review item", {
      task,
      runId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Build a stable context object shared by all DLQ entries.
 */
export function failureContext(
  error: unknown,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const isErr = error instanceof Error;
  return {
    ...(extra ?? {}),
    error: isErr ? error.message : String(error),
    ...(isErr && error.stack
      ? { stack: error.stack.split("\n").slice(0, 5) }
      : {}),
  };
}

/**
 * Factory for the `onFailure` task hook. Trigger.dev calls `onFailure` only
 * after retries are exhausted, so this is the canonical DLQ surfacing point.
 *
 * @param taskId Trigger.dev task id (also stored as the review item's agentId).
 * @param options title/type/severity plus payload accessors.
 */
export function dlqOnFailure<
  TPayload extends Record<string, unknown>,
>(options: {
  task: string;
  title: (payload: TPayload) => string;
  type?: DlqEnqueueOptions["type"];
  severity?: DlqSeverity;
  entityIdFrom?: (payload: TPayload) => string | undefined;
}) {
  return async ({
    payload,
    ctx,
    error,
  }: {
    payload: TPayload;
    ctx: { run: { id: string }; attempt: { number: number } };
    error: unknown;
  }): Promise<void> => {
    await enqueueReviewItem({
      entityId: options.entityIdFrom?.(payload),
      task: options.task,
      runId: ctx.run.id,
      title: options.title(payload),
      description: `Task exhausted retries (attempt ${ctx.attempt.number}). ${error instanceof Error ? error.message : String(error)}`,
      type: options.type ?? "review",
      severity: options.severity ?? "high",
      contextData: failureContext(error, { payload }),
    });
  };
}
