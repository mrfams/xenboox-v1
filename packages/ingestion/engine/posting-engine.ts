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
 * Make a posting decision based on the composite confidence score and
 * validation results.
 *
 * Decision matrix:
 *   ≥ 0.95  → auto_post         (post immediately, no review needed)
 *   ≥ 0.85  → auto_post_notify  (post immediately, notify user)
 *   ≥ 0.60  → pending_review    (prepare review items, wait for user)
 *   ≥ 0.40  → escalated         (flag for human review)
 *   < 0.40  → rejected          (cannot post, validation failure)
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

  // Auto-post: confidence ≥ 95%
  if (overall >= THRESHOLDS.AUTO_POST) {
    return {
      action: "auto_post",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% ≥ 95% threshold — auto-posting without review.`,
    };
  }

  // Auto-post with notification: 85-94%
  if (overall >= THRESHOLDS.AUTO_POST_WITH_NOTIFY) {
    return {
      action: "auto_post",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% ≥ 85% threshold — auto-posting with notification.`,
    };
  }

  // Pending review: 60-84%
  if (overall >= THRESHOLDS.PENDING_REVIEW) {
    const reviewItems = getReviewItems(state);
    return {
      action: "pending_review",
      confidence: overall,
      reason: `Confidence ${(overall * 100).toFixed(0)}% below 85% threshold — requires user verification.`,
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
 */
export async function executePosting(
  state: IngestionState,
  decision: PostingDecision,
): Promise<IngestionPipelineResult> {
  const startTime = Date.now();
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
    await logIngestionFailure(state, decision);
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

      // Update document status
      await db
        .update(documents)
        .set({
          status: "done",
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{ingestion}', ${JSON.stringify(
            {
              journalEntryId,
              entryNumber,
              workflow: state.workflow,
              confidence: decision.confidence,
              postedAt: new Date().toISOString(),
              action: decision.action,
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

  const existing = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.reference, reference),
    ),
  });

  return existing.length;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logIngestionFailure(
  state: IngestionState,
  decision: PostingDecision,
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
