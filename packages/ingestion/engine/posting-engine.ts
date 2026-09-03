import { db } from "@xenboox/db";
import { journalEntries } from "@xenboox/db/schema/accounting";
import { documents, auditLog, agentActivity } from "@xenboox/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type {
  IngestionState,
  IngestionConfidence,
  PostingDecision,
  ReviewItem,
  PostingResult,
  IngestionPipelineResult,
} from "../core/types";
import { getReviewItems } from "../core/confidence";
import { postJournalEntry } from "./journal-generator";
import { propagatePosting } from "./propagation";
import { sendIngestionNotifications } from "./notifications";
import { runTrustGuard, type TrustGuardResult } from "./trust-guard";

// ─── Thresholds ─────────────────────────────────────────────────────────────

const THRESHOLDS = {
  /** Confidence ≥ 95% → auto-post without notification */
  AUTO_POST: 0.95,
  /** Confidence ≥ 85% → auto-post with notification */
  AUTO_POST_WITH_NOTIFY: 0.85,
  /** Confidence ≥ 60% → pending review */
  PENDING_REVIEW: 0.6,
  /** Below this → escalated to human */
  ESCALATE: 0.4,
};

// ─── Posting Decision Engine ────────────────────────────────────────────────

/**
 * Make a posting decision based on the composite confidence score,
 * validation results, AND TrustGuard cross-validation.
 *
 * TrustGuard is the safety net: if the deterministic math checks fail
 * (e.g. line items don't add up to the total), the document is NEVER
 * auto-posted regardless of LLM confidence.
 *
 * Decision matrix:
 *   ≥ 0.95 AND TrustGuard passed → auto_post
 *   ≥ 0.85 AND TrustGuard passed → auto_post with notification
 *   ≥ 0.60 OR TrustGuard warnings → pending_review
 *   ≥ 0.40 OR TrustGuard errors  → escalated
 *   < 0.40                       → rejected
 */
export function decidePosting(
  state: IngestionState,
  confidence: IngestionConfidence,
): PostingDecision {
  const overall = confidence.overall;
  const hasCriticalErrors = (state.validation?.errors ?? []).some(
    (e) => e.severity === "error",
  );

  // Reject if validation has critical errors
  if (hasCriticalErrors) {
    return {
      action: "rejected",
      confidence: overall,
      reason: `Validation failed with critical errors: ${state.validation!.errors.map((e) => e.message).join("; ")}`,
    };
  }

  // Run TrustGuard cross-validation if not already done
  let trustGuardResult: TrustGuardResult | undefined = state.validation
    ?.trustGuard as TrustGuardResult | undefined;
  if (!trustGuardResult) {
    trustGuardResult = runTrustGuard(state);
  }

  const trustGuardFailed = !trustGuardResult.passed;
  const trustGuardHasWarnings = trustGuardResult.checks.some(
    (c) => !c.passed && c.severity === "warning",
  );
  const failedErrorChecks = trustGuardResult.checks.filter(
    (c) => !c.passed && c.severity === "error",
  );

  // ── TrustGuard override: if deterministic checks fail, never auto-post ──
  if (trustGuardFailed) {
    const reviewItems = getReviewItems(state);
    // Add TrustGuard failures as review items
    for (const check of failedErrorChecks) {
      reviewItems.push({
        field: check.name,
        label: check.description,
        value: check.actual,
        confidence: 0,
      });
    }

    return {
      action: "escalated",
      confidence: Math.min(overall, trustGuardResult.confidenceImpact),
      reason: `TrustGuard cross-validation failed: ${failedErrorChecks.map((c) => c.message).join("; ")}. Extraction requires human review regardless of LLM confidence.`,
      reviewItems: reviewItems.map((item) => ({
        field: item.field,
        label: item.label,
        extractedValue: item.value,
        suggestedValue: item.value,
        confidence: item.confidence,
        editable: true,
      })),
    };
  }

  // ── Standard confidence-based decision (TrustGuard passed) ──

  // Auto-post: confidence ≥ 95%
  if (overall >= THRESHOLDS.AUTO_POST) {
    return {
      action: "auto_post",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% ≥ 95% threshold, TrustGuard passed — auto-posting without review.`,
    };
  }

  // Auto-post with notification: 85-94%
  if (overall >= THRESHOLDS.AUTO_POST_WITH_NOTIFY) {
    return {
      action: "auto_post",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% ≥ 85% threshold, TrustGuard passed — auto-posting with notification.`,
    };
  }

  // Pending review: 60-84% (or TrustGuard warnings)
  if (overall >= THRESHOLDS.PENDING_REVIEW || trustGuardHasWarnings) {
    const reviewItems = getReviewItems(state);
    if (trustGuardHasWarnings) {
      const warningChecks = trustGuardResult.checks.filter(
        (c) => !c.passed && c.severity === "warning",
      );
      for (const check of warningChecks) {
        reviewItems.push({
          field: check.name,
          label: check.description,
          value: check.actual,
          confidence: 0.6,
        });
      }
    }
    return {
      action: "pending_review",
      confidence: overall,
      reason: trustGuardHasWarnings
        ? `TrustGuard warnings detected: ${trustGuardResult.checks
            .filter((c) => !c.passed && c.severity === "warning")
            .map((c) => c.name)
            .join(", ")}. Requires user verification.`
        : `Confidence ${(overall * 100).toFixed(0)}% below 85% threshold — requires user verification.`,
      reviewItems: reviewItems.map((item) => ({
        field: item.field,
        label: item.label,
        extractedValue: item.value,
        suggestedValue: item.value,
        confidence: item.confidence,
        editable: item.confidence < 0.7,
      })),
    };
  }

  // Escalated: 40-59%
  if (overall >= THRESHOLDS.ESCALATE) {
    const reviewItems = getReviewItems(state);
    return {
      action: "escalated",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% below 60% threshold — escalated for human review. Dominant signal: ${confidence.dominantSignal}`,
      reviewItems: reviewItems.map((item) => ({
        field: item.field,
        label: item.label,
        extractedValue: item.value,
        suggestedValue: item.value,
        confidence: item.confidence,
        editable: true,
      })),
    };
  }

  // Rejected: below 40%
  return {
    action: "rejected",
    confidence: overall,
    reason: `Confidence ${(overall * 100).toFixed(0)}% below 40% minimum threshold — transaction rejected. Dominant low signal: ${confidence.dominantSignal}`,
  };
}

// ─── Execute Posting ────────────────────────────────────────────────────────

/**
 * Execute the posting decision. If auto-post, commit the journal entry
 * to the database, link the document, create audit entries, and propagate.
 * If pending review, create a review request and return.
 *
 * TrustGuard results are stored in the document metadata for audit trail.
 */
export async function executePosting(
  state: IngestionState,
  decision: PostingDecision,
): Promise<IngestionPipelineResult> {
  const startTime = Date.now();

  // Run TrustGuard if not already run (ensures result is always available)
  let trustGuardResult = state.validation?.trustGuard as
    | TrustGuardResult
    | undefined;
  if (!trustGuardResult) {
    trustGuardResult = runTrustGuard(state);
  }

  const result: IngestionPipelineResult = {
    documentId: state.documentId,
    entityId: state.entityId,
    success: false,
    workflow: state.workflow ?? "journal_adjustment",
    proposedEntry: state.proposedJournal,
    confidence: state.compositeConfidence!,
    postingDecision: decision,
    pipelineDurationMs: 0,
  };

  // Handle rejection
  if (decision.action === "rejected") {
    await logIngestionFailure(state, decision, trustGuardResult);
    // Send notification: document rejected
    await sendIngestionNotifications(state.entityId, state, decision);
    result.error = decision.reason;
    result.pipelineDurationMs = Date.now() - startTime;
    return result;
  }

  // Handle auto-posting
  if (decision.action === "auto_post") {
    try {
      // Post the journal entry
      const { journalEntryId, entryNumber } = await postJournalEntry(
        state.entityId,
        state.proposedJournal!,
        decision.confidence,
      );

      // Update document status — go to 'persisted' after successful GL write
      await db
        .update(documents)
        .set({
          status: "persisted",
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
            {
              journalEntryId,
              entryNumber,
              workflow: state.workflow,
              confidence: decision.confidence,
              postedAt: new Date().toISOString(),
              action: decision.action,
              trustGuard: {
                passed: trustGuardResult.passed,
                checks: trustGuardResult.checks.length,
                passedCount: trustGuardResult.passedCount,
                confidenceImpact: trustGuardResult.confidenceImpact,
              },
            },
          )}::jsonb)`,
        } as any)
        .where(eq(documents.id, state.documentId));

      // Create audit log entry
      const [auditEntry] = await db
        .insert(auditLog)
        .values({
          entityId: state.entityId,
          action: "ingestion.auto_post",
          entityType: "document",
          entityIdRef: state.documentId,
          newValues: {
            journalEntryId,
            entryNumber,
            workflow: state.workflow,
            confidence: decision.confidence,
            description: state.proposedJournal?.description,
            lines: state.proposedJournal?.lines.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit,
              credit: l.credit,
            })),
          },
          confidence: String(decision.confidence),
        })
        .returning();

      // Log agent activity
      await db.insert(agentActivity).values({
        entityId: state.entityId,
        agentName: "ingestion-engine",
        action: `auto_post_${state.workflow}`,
        input: {
          documentId: state.documentId,
          workflow: state.workflow,
          extractedData: state.extraction.data,
        },
        output: {
          journalEntryId,
          entryNumber,
          confidence: decision.confidence,
          proposedEntry: state.proposedJournal,
        },
        confidence: String(decision.confidence),
        status: "success",
      });

      // Propagate to downstream modules
      const propagationResult = await propagatePosting(
        state.entityId,
        state.proposedJournal!,
        state.workflow!,
        journalEntryId,
      );

      result.success = true;
      // Send notification for auto-posts (especially those near threshold)
      await sendIngestionNotifications(
        state.entityId,
        state,
        decision,
        journalEntryId,
      );

      result.postingResult = {
        posted: true,
        journalEntryId,
        entryNumber,
        postedAt: new Date().toISOString(),
        auditEntries: [auditEntry.id],
        linksCreated: [],
      };
      result.propagationResult = propagationResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.error = errorMessage;

      await db.insert(agentActivity).values({
        entityId: state.entityId,
        agentName: "ingestion-engine",
        action: `post_failed_${state.workflow}`,
        input: {
          documentId: state.documentId,
          workflow: state.workflow,
        },
        output: { error: errorMessage },
        confidence: String(decision.confidence),
        status: "failed",
        errorMessage,
      });
    }
  }

  // Handle pending review or escalation
  if (decision.action === "pending_review" || decision.action === "escalated") {
    // Update document status to indicate it needs review
    await db
      .update(documents)
      .set({
        status: "agent_processing",
        metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
          {
            action: decision.action,
            confidence: decision.confidence,
            reviewItems: decision.reviewItems,
            proposedEntry: state.proposedJournal,
            dominantSignal: state.compositeConfidence?.dominantSignal,
            requiresReview: true,
            trustGuard: {
              passed: trustGuardResult.passed,
              checks: trustGuardResult.checks.length,
              passedCount: trustGuardResult.passedCount,
              failedChecks: trustGuardResult.checks
                .filter((c) => !c.passed)
                .map((c) => ({
                  name: c.name,
                  message: c.message,
                  severity: c.severity,
                })),
              confidenceImpact: trustGuardResult.confidenceImpact,
              summary: trustGuardResult.summary,
            },
          },
        )}::jsonb)`,
      } as any)
      .where(eq(documents.id, state.documentId));

    // Send notification: document needs review
    await sendIngestionNotifications(state.entityId, state, decision);

    // Log pending review
    await db.insert(auditLog).values({
      entityId: state.entityId,
      action: `ingestion.${decision.action}`,
      entityType: "document",
      entityIdRef: state.documentId,
      newValues: {
        confidence: decision.confidence,
        reason: decision.reason,
        reviewItems: decision.reviewItems,
        workflow: state.workflow,
      },
      confidence: String(decision.confidence),
    });

    result.success = decision.action === "pending_review";
    result.error =
      decision.action === "escalated" ? decision.reason : undefined;
  }

  result.pipelineDurationMs = Date.now() - startTime;
  return result;
}

/**
 * Check for duplicate processing of a document/reference.
 */
export async function checkDuplicate(
  entityId: string,
  reference: string,
): Promise<number> {
  if (!reference) return 0;

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.reference, reference),
      ),
    );

  return Number(row?.count ?? 0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logIngestionFailure(
  state: IngestionState,
  decision: PostingDecision,
  trustGuardResult?: TrustGuardResult,
) {
  await db
    .update(documents)
    .set({
      status: "failed",
      metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
        {
          action: "rejected",
          confidence: decision.confidence,
          reason: decision.reason,
          errors: state.validation?.errors ?? [],
          trustGuard: trustGuardResult
            ? {
                passed: trustGuardResult.passed,
                checks: trustGuardResult.checks.length,
                passedCount: trustGuardResult.passedCount,
                failedChecks: trustGuardResult.checks
                  .filter((c) => !c.passed)
                  .map((c) => ({
                    name: c.name,
                    message: c.message,
                    severity: c.severity,
                  })),
                summary: trustGuardResult.summary,
              }
            : undefined,
        },
      )}::jsonb)`,
    } as any)
    .where(eq(documents.id, state.documentId));

  await db.insert(auditLog).values({
    entityId: state.entityId,
    action: "ingestion.rejected",
    entityType: "document",
    entityIdRef: state.documentId,
    newValues: {
      reason: decision.reason,
      validationErrors: state.validation?.errors,
      confidence: decision.confidence,
    },
    confidence: String(decision.confidence),
  });
}
