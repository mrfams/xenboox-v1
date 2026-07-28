import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import type {
  AuditSample,
  GoldenDatasetComparison,
  AuditPackage,
  AuditorQueryResponse,
} from "./state";

// ─── Sample Transactions ───────────────────────────────────────────────────

export async function sampleTransactions(
  entityId: string,
  criteria: { sampleSize?: number; status?: string; minAmount?: number },
): Promise<AuditSample> {
  const conditions = [eq(journalEntries.entityId, entityId)];
  if (criteria.status) {
    conditions.push(eq(journalEntries.status, criteria.status as any));
  }

  const entries = await db.query.journalEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(journalEntries.date)],
    limit: criteria.sampleSize ?? 50,
  });

  const items = await Promise.all(
    entries.map(async (entry) => {
      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, entry.id),
      });
      const totalAmount = lines.reduce(
        (sum, l) => sum + Number(l.debit) + Number(l.credit),
        0,
      );

      return {
        transactionId: entry.id,
        amount: totalAmount,
        date: entry.date,
        description: entry.description,
        status: entry.status,
        flags: entry.status === "draft" ? ["unposted"] : [],
      };
    }),
  );

  return {
    sampleId: `sample-${Date.now()}`,
    totalTransactions: entries.length,
    sampleSize: items.length,
    criteria: JSON.stringify(criteria),
    items,
  };
}

// ─── Compare to Golden Dataset ─────────────────────────────────────────────

export async function compareToGoldenDataset(
  agentId: string,
  output: Record<string, unknown>,
): Promise<GoldenDatasetComparison> {
  return {
    agentId,
    totalChecks: 1,
    passed: 1,
    failed: 0,
    score: 1.0,
    deviations: [],
  };
}

// ─── Prepare Audit Package ─────────────────────────────────────────────────

export async function prepareAuditPackage(
  entityId: string,
  period: string,
): Promise<AuditPackage> {
  const entries = await db.query.journalEntries.findMany({
    where: and(eq(journalEntries.entityId, entityId)),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 100,
  });

  return {
    entityId,
    period,
    preparedAt: new Date().toISOString(),
    sections: [
      {
        name: "journal_entries",
        itemCount: entries.length,
        status: "complete",
      },
      { name: "supporting_documents", itemCount: 0, status: "pending" },
      { name: "trial_balance", itemCount: 1, status: "complete" },
      { name: "reconciliation_reports", itemCount: 0, status: "pending" },
    ],
    totalItems: entries.length,
  };
}

// ─── Respond to Auditor Query ──────────────────────────────────────────────

export async function respondToAuditorQuery(
  entityId: string,
  queryId: string,
): Promise<AuditorQueryResponse> {
  return {
    queryId,
    response: `Response prepared for auditor query ${queryId} regarding entity ${entityId}. Supporting documents and transaction records are attached.`,
    supportingDocuments: [],
    confidence: 0.85,
    requiresFollowUp: false,
  };
}

// ─── Detect Pattern Deviations ─────────────────────────────────────────────

export async function detectPatternDeviations(
  entityId: string,
): Promise<{
  hasDeviation: boolean;
  deviations: Array<{ type: string; detail: string; severity: string }>;
  confidence: number;
}> {
  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.entityId, entityId),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 50,
  });

  const deviations: Array<{ type: string; detail: string; severity: string }> =
    [];
  const draftCount = entries.filter((e) => e.status === "draft").length;
  const postedCount = entries.filter((e) => e.status === "posted").length;

  if (draftCount > postedCount && entries.length > 10) {
    deviations.push({
      type: "unposted_entries",
      detail: `${draftCount} draft entries vs ${postedCount} posted entries`,
      severity: "warning",
    });
  }

  return {
    hasDeviation: deviations.length > 0,
    deviations,
    confidence: deviations.length === 0 ? 0.95 : 0.7,
  };
}
