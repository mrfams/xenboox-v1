import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import {
  goldenDatasetScenarios,
  auditSamples,
} from "@xenboox/db/schema/audit-pipeline";
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
//
// Loads the entity's verified-correct scenarios from the DB and compares the
// agent's output against the expected result for each. Produces a pass/fail
// score and lists every deviation with severity — never a hardcoded pass.

export async function compareToGoldenDataset(
  agentId: string,
  output: Record<string, unknown>,
): Promise<GoldenDatasetComparison> {
  const scenarios = await db.query.goldenDatasetScenarios.findMany({
    where: eq(goldenDatasetScenarios.scenarioType, agentId),
    limit: 100,
  });

  const deviations: GoldenDatasetComparison["deviations"] = [];
  let passed = 0;

  for (const scenario of scenarios) {
    const expected = scenario.expectedResult;
    const mismatchedKeys: string[] = [];

    for (const key of Object.keys(expected)) {
      const expectedVal = expected[key];
      const actualVal = output[key];
      const matches =
        typeof expectedVal === "number" && typeof actualVal === "number"
          ? Math.abs(expectedVal - actualVal) < 0.01
          : JSON.stringify(expectedVal) === JSON.stringify(actualVal);
      if (!matches) mismatchedKeys.push(key);
    }

    if (mismatchedKeys.length === 0) {
      passed++;
      await db
        .update(goldenDatasetScenarios)
        .set({ lastTestedAt: new Date(), lastTestPassed: true })
        .where(eq(goldenDatasetScenarios.id, scenario.id));
    } else {
      const severity = mismatchedKeys.some((k) =>
        ["amount", "total", "balance"].includes(k),
      )
        ? ("critical" as const)
        : ("warning" as const);
      deviations.push({
        scenario: scenario.name,
        expected: JSON.stringify(
          Object.fromEntries(mismatchedKeys.map((k) => [k, expected[k]])),
        ),
        actual: JSON.stringify(
          Object.fromEntries(mismatchedKeys.map((k) => [k, output[k]])),
        ),
        severity,
      });
      await db
        .update(goldenDatasetScenarios)
        .set({ lastTestedAt: new Date(), lastTestPassed: false })
        .where(eq(goldenDatasetScenarios.id, scenario.id));
    }
  }

  const totalChecks = scenarios.length;
  const failed = totalChecks - passed;
  const score =
    totalChecks > 0 ? Math.round((passed / totalChecks) * 1000) / 1000 : 0;

  return { agentId, totalChecks, passed, failed, score, deviations };
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
//
// Gathers real supporting evidence for the query: recent journal entries,
// their line items, and any prior audit samples for this entity. The
// response references concrete documents instead of a canned string.

export async function respondToAuditorQuery(
  entityId: string,
  queryId: string,
): Promise<AuditorQueryResponse> {
  const recentEntries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.entityId, entityId),
    orderBy: [desc(journalEntries.date)],
    limit: 20,
  });

  const supportingDocuments: string[] = recentEntries.map(
    (e) =>
      `Journal entry ${e.id.slice(0, 8)} dated ${e.date} (${e.status}): ${e.description ?? "no description"}`,
  );

  const priorSamples = await db.query.auditSamples.findMany({
    where: eq(auditSamples.entityId, entityId),
    orderBy: [desc(auditSamples.sampledAt)],
    limit: 10,
  });
  for (const s of priorSamples) {
    supportingDocuments.push(
      `Audit sample ${s.transactionRef} (${s.status}, matchesOriginal=${s.matchesOriginal})`,
    );
  }

  const hasEvidence = supportingDocuments.length > 0;
  return {
    queryId,
    response: hasEvidence
      ? `Response prepared for auditor query ${queryId}: ${supportingDocuments.length} supporting documents attached covering ${recentEntries.length} recent journal entries and ${priorSamples.length} prior audit samples.`
      : `Response prepared for auditor query ${queryId}: no journal entries or audit samples found for this entity yet.`,
    supportingDocuments,
    confidence: hasEvidence ? 0.85 : 0.5,
    requiresFollowUp: !hasEvidence,
  };
}

// ─── Detect Pattern Deviations ─────────────────────────────────────────────

export async function detectPatternDeviations(entityId: string): Promise<{
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

// ─── Independent Ledger Recomputation ──────────────────────────────────────
//
// ⚠️ INDEPENDENCE CONSTRAINT: recomputes using its own query + computation
// path — never trusts the originating agent's code. Verifies double-entry
// balance (Σdebits = Σcredits) directly from the line items.

export async function performIndependentRecomputation(
  entityId: string,
  sample: AuditSample,
): Promise<
  Array<{
    transactionRef: string;
    recomputedResult: Record<string, unknown>;
    matchesOriginal: boolean;
  }>
> {
  const results: Array<{
    transactionRef: string;
    recomputedResult: Record<string, unknown>;
    matchesOriginal: boolean;
  }> = [];

  for (const item of sample.items) {
    try {
      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, item.transactionId),
      });

      const debitSum = lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const creditSum = lines.reduce((sum, l) => sum + Number(l.credit), 0);
      const balanced = Math.abs(debitSum - creditSum) < 0.01;

      results.push({
        transactionRef: item.transactionId,
        recomputedResult: {
          debitSum,
          creditSum,
          balanced,
          lineCount: lines.length,
          method: "independent_audit_recomputation",
        },
        matchesOriginal: balanced,
      });
    } catch {
      results.push({
        transactionRef: item.transactionId,
        recomputedResult: { error: "Independent recomputation failed" },
        matchesOriginal: false,
      });
    }
  }

  return results;
}

// ─── Anomaly Detection ─────────────────────────────────────────────────────
//
// Flags computational anomalies (unbalanced entries) and pattern anomalies
// (round-number amounts that often indicate fabricated entries).

export async function detectAnomalies(
  entityId: string,
  recomputationResults: Array<{
    transactionRef: string;
    matchesOriginal: boolean;
  }>,
): Promise<Array<{ type: string; description: string; severity: string }>> {
  const anomalies: Array<{
    type: string;
    description: string;
    severity: string;
  }> = [];

  for (const r of recomputationResults) {
    if (!r.matchesOriginal) {
      anomalies.push({
        type: "computational",
        description: `Independent recomputation mismatch for ${r.transactionRef.slice(0, 8)}`,
        severity: "medium",
      });
    }
  }

  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.entityId, entityId),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 100,
  });

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    });
    for (const line of lines) {
      const amount = Number(line.debit) + Number(line.credit);
      if (amount >= 1000 && amount % 1000 === 0) {
        anomalies.push({
          type: "round_number",
          description: `Round-number amount ${amount} on entry ${entry.id.slice(0, 8)} — potential fabricated entry`,
          severity: "low",
        });
        break;
      }
    }
  }

  return anomalies;
}
