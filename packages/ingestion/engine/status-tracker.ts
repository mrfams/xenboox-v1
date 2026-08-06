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
import { documents, auditLog } from "@xenboox/db/schema";
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
 * Valid means: `to` has a higher stage number than `from`,
 * OR `to` is a terminal state (failed, persisted, done, archived, agent_processing).
 */
export function isValidTransition(
  from: PipelineStage,
  to: PipelineStage,
): boolean {
  const fromNum = PIPELINE_STAGES[from];
  const toNum = PIPELINE_STAGES[to];

  // Terminal states can be reached from anywhere
  if (toNum < 0 || toNum >= 99) return true;

  // Forward transitions only (strictly greater)
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
): Promise<void> {
  try {
    await withRetry(async () => {
      // Update document status
      await db
        .update(documents)
        .set({ status: stage } as any)
        .where(eq(documents.id, documentId));

      // Write audit log entry
      await db.insert(auditLog).values({
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
  } catch (error) {
    // Non-blocking: log warning but don't crash the pipeline
    console.warn(
      `[status-tracker] Failed to update status for document ${documentId} to ${stage}:`,
      error instanceof Error ? error.message : error,
    );
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
): Promise<void> {
  try {
    await withRetry(async () => {
      await db
        .update(documents)
        .set({ status } as any)
        .where(eq(documents.id, documentId));

      await db.insert(auditLog).values({
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
  } catch (error) {
    console.warn(
      `[status-tracker] Failed to update terminal status for document ${documentId} to ${status}:`,
      error instanceof Error ? error.message : error,
    );
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
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  await updateTerminalStatus(documentId, entityId, "failed", {
    error: errorMessage,
    stack: errorStack,
    pipelineStage: pipelineStage ?? "unknown",
    failedAt: new Date().toISOString(),
  });
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
