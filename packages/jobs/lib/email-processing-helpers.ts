/**
 * Pure orchestration helpers for email processing — extracted so the
 * production-critical decisions (which documents trigger which downstream
 * jobs, and where attachments are stored) are unit-testable without a
 * Trigger.dev worker context.
 */

/**
 * Build a stable, entity-scoped R2 storage path for an email attachment.
 * The old code triggered import-bank-statement with an empty path, which
 * guaranteed an R2 miss — this path is what downstream jobs read from.
 */
export function buildEmailStoragePath(
  emailId: string,
  filename: string,
): string {
  return `email/${emailId}/${filename}`;
}

/**
 * A bank statement attachment must be routed to the bank-import task.
 * All other document types flow through the accounting ingestion pipeline.
 */
export function shouldTriggerBankImport(category: string): boolean {
  return category === "bank_statement";
}
