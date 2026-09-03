/**
 * Unified Ingestion Status Tracker
 *
 * Single source of truth for ALL pipeline stage transitions across both
 * the document-processing pipeline (stages 1-5) and the ingestion engine
 * (stages 6-14). Every status transition goes through this module.
 *
 * Design principles:
 * - Non-blocking: catches and warns on failure (never crashes the pipeline)
 * - Entity-scoped: every DB call carries entityId
 * - Audit-logged: every transition is recorded
 * - Retry-safe: transient DB failures are retried with exponential backoff
 * - Stage-validated: enforces valid state transitions (no jumping ahead)
 */

import { db } from "@xenboox/db";
import { documents, auditLog, agentActivity } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";

// ─── Unified Pipeline Stages ──────────────────────────────────────────────

/**
 * All pipeline stages in canonical order.
 * The integer value indicates the stage position — used for ordering
 * and for validating that transitions only move forward.
 */
export const PIPELINE_STAGES = {
  // ── Document Processing (stages 1-5) ──
  detected: 1, // Document uploaded, row created
  processing: 2, // R2 download, format detection
  extracted: 3, // OCR text extraction
  synced: 4, // Classification + structured extraction
  validated: 5, // TrustGuard cross-validation passed

  // ── Ingestion Engine (stages 6-14) ──
  resolving: 6, // Entity resolution (vendor/customer/employee matching)
  classifying_workflow: 7, // Transaction workflow classification
  mapping_accounts: 8, // Chart of accounts mapping
  calculating_tax: 9, // Tax calculation
  generating_journal: 10, // Journal entry generation
  validating_entry: 11, // Entry validation (double-entry, duplicates)
  deciding_post: 12, // Posting decision (auto/review/escalate)
  posting: 13, // Posting execution
  propagating: 14, // Downstream module propagation

  // ── Terminal states (no ordering — can be reached from any stage) ──
  agent_processing: 99, // Handoff to downstream agent jobs
  persisted: 100, // Successfully posted to GL
  done: 101, // Fully complete
  failed: -1, // Terminal failure
  archived: 102, // Soft-deleted / expired
} as const;

export type PipelineStage = keyof typeof PIPELINE_STAGES;

/** Human-readable labels for each stage */
const STAGE_LABELS: Record<PipelineStage, string> = {
  detected: "Document Detected",
  processing: "Format Detection & Download",
  extracted: "OCR Text Extraction",
  synced: "Classification & Extraction",
  validated: "TrustGuard Cross-Validation",
  resolving: "Entity Resolution",
  classifying_workflow: "Workflow Classification",
  mapping_accounts: "COA Mapping",
  calculating_tax: "Tax Calculation",
  generating_journal: "Journal Entry Generation",
  validating_entry: "Entry Validation",
  deciding_post: "Posting Decision",
  posting: "Posting Execution",
  propagating: "Downstream Propagation",
  agent_processing: "Agent Processing",
  persisted: "Persisted to GL",
  done: "Complete",
  failed: "Failed",
  archived: "Archived",
};

/** Audit action names for each stage */
const STAGE_AUDIT_ACTIONS: Record<PipelineStage, string> = {
  detected: "pipeline.document_detected",
  processing: "pipeline.processing",
  extracted: "pipeline.extracted",
  synced: "pipeline.synced",
  validated: "pipeline.validated",
  resolving: "pipeline.resolving",
  classifying_workflow: "pipeline.classifying_workflow",
  mapping_accounts: "pipeline.mapping_accounts",
  calculating_tax: "pipeline.calculating_tax",
  generating_journal: "pipeline.generating_journal",
  validating_entry: "pipeline.validating_entry",
  deciding_post: "pipeline.deciding_post",
  posting: "pipeline.posting",
  propagating: "pipeline.propagating",
  agent_processing: "pipeline.agent_processing",
  persisted: "pipeline.persisted",
  done: "pipeline.done",
  failed: "pipeline.failed",
  archived: "pipeline.archived",
};

// ─── Stage Validation ─────────────────────────────────────────────────────

/**
 * Check whether a transition from `from` to `to` is valid.
 *
 * Semantics:
 * - Hard terminal states (failed, persisted, done, archived) can be reached
 *   from anywhere — failure and completion always win. persisted/done/
 *   archived LOCK the document (a posted doc must never be re-processed),
 *   but `failed` stays re-enterable so a fixed document can be retried.
 * - Pipeline ENTRY points (detected for the document pipeline, resolving for
 *   the ingestion engine) may be re-entered from any non-locked state — task
 *   retries re-run stage 1, and ingestion recovery restarts from resolving.
 * - `agent_processing` is a HANDOFF, not a hard terminal: the document
 *   pipeline hands off after TrustGuard, and the ingestion engine resumes
 *   from it (agent_processing -> resolving). Locking it would deadlock
 *   the entire ingestion flow.
 * - Otherwise, transitions must move strictly forward through the stages.
 */
export function isValidTransition(
  from: PipelineStage,
  to: PipelineStage,
): boolean {
  const fromNum = PIPELINE_STAGES[from];
  const toNum = PIPELINE_STAGES[to];

  // Unknown destination — never valid.
  if (toNum === undefined) return false;

  // Legacy/unknown source states (e.g. the legacy "uploaded" status) are
  // treated as pipeline entry — the document is starting fresh, so any
  // destination stage is reachable.
  if (fromNum === undefined) return true;

  // Same-stage transitions are always valid — retries re-set the current
  // stage (idempotent status writes).
  if (from === to) return true;

  // Hard terminal states can be reached from anywhere.
  if (
    to === "failed" ||
    to === "persisted" ||
    to === "done" ||
    to === "archived"
  ) {
    return true;
  }

  // Nothing may leave a hard terminal state — a posted, completed, or
  // archived document must never be re-processed.
  if (from === "persisted" || from === "done" || from === "archived") {
    return false;
  }

  // Pipeline entry points may be re-entered for retry/recovery — a task
  // retry re-runs stage 1 (detected) and ingestion recovery restarts at
  // resolving, even if the document is mid-pipeline.
  if (to === "detected" || to === "resolving") return true;

  // Handoff state: reachable from anywhere, and the ingestion engine may
  // resume from it (agent_processing -> resolving or later).
  if (to === "agent_processing") return true;
  if (from === "agent_processing") {
    return toNum >= PIPELINE_STAGES.resolving;
  }

  // Forward transitions only (strictly greater).
  return toNum > fromNum;
}

/**
 * Get the current stage number for a document status string.
 * Returns -2 for unknown statuses (not in the pipeline).
 */
export function getStageNumber(status: string): number {
  if (status in PIPELINE_STAGES) {
    return PIPELINE_STAGES[status as PipelineStage];
  }
  return -2;
}

// ─── Retry Helper ─────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[status-tracker] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`,
          lastError.message,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Core Status Update ───────────────────────────────────────────────────

/**
 * Update document status to reflect the current pipeline stage.
 * Writes an audit log entry for the transition.
 *
 * Non-blocking: catches and warns on failure (never crashes the pipeline).
 */
export async function updateIngestionStatus(
  documentId: string,
  entityId: string,
  stage: PipelineStage,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  try {
    await withRetry(async () => {
      await db.transaction(async (tx) => {
        // Read the document's current status so stage transitions are
        // validated — a doc must never jump ahead or regress.
        const current = await tx.query.documents.findFirst({
          where: eq(documents.id, documentId),
          columns: { status: true },
        });
        const currentStage = current?.status ?? "detected";
        if (!isValidTransition(currentStage as PipelineStage, stage)) {
          throw new Error(
            `Invalid status transition for document ${documentId}: ` +
              `${currentStage} -> ${stage}`,
          );
        }

        // Update document status + write audit log atomically — a partial
        // write (status updated but audit missing, or vice-versa) would
        // corrupt the audit trail.
        await tx
          .update(documents)
          .set({ status: stage })
          .where(eq(documents.id, documentId));

        await tx.insert(auditLog).values({
          entityId,
          action: STAGE_AUDIT_ACTIONS[stage],
          entityType: "document",
          entityIdRef: documentId,
          newValues: {
            status: stage,
            stageNumber: PIPELINE_STAGES[stage],
            stageLabel: STAGE_LABELS[stage],
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        });
      });
    });
    return true;
  } catch (error) {
    // Non-blocking: log warning but don't crash the pipeline
    console.warn(
      `[status-tracker] Failed to update status for document ${documentId} to ${stage}:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Update document status to a terminal state with rich metadata.
 * Used for auto_post, pending_review, rejected, failed, and persisted outcomes.
 */
export async function updateTerminalStatus(
  documentId: string,
  entityId: string,
  status: "persisted" | "done" | "failed" | "agent_processing" | "archived",
  metadata: Record<string, unknown>,
): Promise<boolean> {
  try {
    await withRetry(async () => {
      await db.transaction(async (tx) => {
        // Terminal states are reachable from any stage by design
        // (see isValidTransition) — but verify the doc exists first so we
        // never write an audit entry for a phantom document.
        const current = await tx.query.documents.findFirst({
          where: eq(documents.id, documentId),
          columns: { id: true },
        });
        if (!current) {
          throw new Error(
            `Cannot set terminal status ${status}: document ${documentId} not found`,
          );
        }

        await tx
          .update(documents)
          .set({ status })
          .where(eq(documents.id, documentId));

        await tx.insert(auditLog).values({
          entityId,
          action: `pipeline.${status}`,
          entityType: "document",
          entityIdRef: documentId,
          newValues: {
            status,
            stageNumber: PIPELINE_STAGES[status],
            stageLabel: STAGE_LABELS[status],
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        });
      });
    });
    return true;
  } catch (error) {
    console.warn(
      `[status-tracker] Failed to update terminal status for document ${documentId} to ${status}:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Transition document to `failed` status with error details.
 * Automatically logs the failure and captures the error context.
 */
export async function transitionToFailed(
  documentId: string,
  entityId: string,
  error: Error | string,
  pipelineStage?: number | string,
): Promise<boolean> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const ok = await updateTerminalStatus(documentId, entityId, "failed", {
    error: errorMessage,
    stack: errorStack,
    pipelineStage: pipelineStage ?? "unknown",
    failedAt: new Date().toISOString(),
  });

  // Surface the failure in the agent-activity trail so monitoring, the
  // Activity Hub, and ops dashboards can see it — a failure that is only
  // console.warn'd is invisible to everyone except the logs.
  if (ok) {
    await db
      .insert(agentActivity)
      .values({
        entityId,
        agentName: "ingestion-status-tracker",
        action: "ingestion.document_failed",
        input: {
          documentId,
          pipelineStage: pipelineStage ?? "unknown",
        },
        output: {
          error: errorMessage,
          failedAt: new Date().toISOString(),
        },
        status: "failed",
        errorMessage,
      })
      .catch((insertError) => {
        // Activity-tracking failure must never mask the status transition
        console.warn(
          `[status-tracker] Failed to log agent activity for failed document ${documentId}:`,
          insertError instanceof Error ? insertError.message : insertError,
        );
      });
  }

  return ok;
}

// ─── Stage Label Helpers ──────────────────────────────────────────────────

/**
 * Get the stage label for a given stage name.
 */
export function getStageLabel(stage: PipelineStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

/**
 * Get all stages in canonical order (for UI rendering).
 */
export function getOrderedStages(): Array<{
  key: PipelineStage;
  number: number;
  label: string;
}> {
  return Object.entries(PIPELINE_STAGES)
    .filter(([_, num]) => num > 0 && num < 99) // Exclude terminal states
    .sort((a, b) => a[1] - b[1])
    .map(([key, num]) => ({
      key: key as PipelineStage,
      number: num,
      label: STAGE_LABELS[key as PipelineStage],
    }));
}

/**
 * Check if a stage is a terminal state (pipeline finished).
 */
export function isTerminalStage(stage: PipelineStage): boolean {
  const num = PIPELINE_STAGES[stage];
  return num < 0 || num >= 99;
}
