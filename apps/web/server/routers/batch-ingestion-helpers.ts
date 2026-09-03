/**
 * Pure helpers for batch ingestion — extracted from the router so the
 * production-critical behaviors (status mapping, stage labels) are
 * unit-testable without a tRPC context or database.
 */

export type BatchDocStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Map a document pipeline status to a batch-level status. Crucially this
 * NEVER fabricates completion: only the real terminal statuses (done /
 * persisted) map to "completed".
 */
export function mapDocStatus(status: string): BatchDocStatus {
  if (status === "done" || status === "persisted") return "completed";
  if (status === "failed") return "failed";
  if (status === "archived") return "cancelled";
  if (status === "detected") return "pending";
  return "processing";
}

const STAGE_LABELS: Record<string, string> = {
  detected: "Queued",
  processing: "Processing",
  extracted: "Extracting",
  synced: "Classifying",
  validated: "Validating",
  resolving: "Resolving entities",
  classifying_workflow: "Classifying",
  mapping_accounts: "Mapping accounts",
  calculating_tax: "Calculating tax",
  generating_journal: "Generating journal",
  validating_entry: "Validating entry",
  deciding_post: "Deciding post",
  posting: "Posting",
  propagating: "Propagating",
  agent_processing: "Agent processing",
  persisted: "Persisted",
  done: "Complete",
  failed: "Failed",
  archived: "Cancelled",
};

export function stageLabel(status: string): string {
  return STAGE_LABELS[status] ?? status;
}
