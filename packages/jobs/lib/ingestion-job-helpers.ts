/**
 * Pure helpers for the run-document-ingestion job's failure path.
 *
 * The job's error contract: failures RETHROW (so Trigger.dev retries and
 * the DLQ engage) and the document metadata update MERGES rather than
 * replaces — extraction/classification/trustGuard context must survive so
 * the review queue can act on a real snapshot of what happened.
 */

export function mergeFailureMetadata(
  existingMetadata: Record<string, unknown>,
  errorMessage: string,
  failedAt: string,
  pipelineStage: string,
): Record<string, unknown> {
  return {
    ...existingMetadata,
    error: errorMessage,
    failedAt,
    pipelineStage,
  };
}
