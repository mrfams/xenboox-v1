/**
 * Consolidation Pipeline Seed Data
 *
 * Test data for the Multi-Entity & Consolidation Pipeline development.
 * Creates entity relationships, pipeline run history, elimination entries,
 * minority interest records, and inter-company transaction tags.
 *
 * Run: pnpm db:seed (or call seedConsolidation() from the main seed file)
 *
 * Uses same patterns as other seed files:
 *   - deterministic UUIDs via seedUuid()
 *   - onConflictDoNothing() for idempotent re-runs
 *   - entity-scoped to the demo entity
 */

import crypto from "node:crypto";
import { db } from "../index";
import { entities } from "../schema/organization";
import {
  entityRelationships,
  consolidationRuns,
  eliminationEntries,
  minorityInterestRecords,
  intercompanyTags,
} from "../schema/consolidation";
import { journalEntries } from "../schema/accounting";
import { eq, inArray } from "drizzle-orm";
import { auditLog } from "../schema/documents";

// ─── Deterministic UUID helper ──────────────────────────────────────────
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// ─── Subsidiary Entity IDs (deterministic) ──────────────────────────────
// These represent child entities within the same organization
const SUBSIDIARY_IDS = [
  seedUuid("sub", 1), // "Kerr Jula Bakau Ltd"
  seedUuid("sub", 2), // "Kerr Jula Logistics"
  seedUuid("sub", 3), // "Kerr Jula Properties"
];

const SUBSIDIARY_NAMES = [
  "Kerr Jula Bakau Ltd",
  "Kerr Jula Logistics",
  "Kerr Jula Properties",
];

// ─── Main Seed Function ──────────────────────────────────────────────────

export async function seedConsolidation(entityId: string): Promise<void> {
  console.log("Seeding consolidation pipeline test data...");

  // We need the organizationId from the entity
  const [entityRow] = await db
    .select({ organizationId: entities.organizationId })
    .from(entities)
    .where(eq(entities.id, entityId))
    .limit(1);

  const orgId = entityRow?.organizationId ?? seedUuid("org", 1);

  // ── 1. Create Subsidiary Entities ──────────────────────────────────
  console.log(`  Creating ${SUBSIDIARY_IDS.length} subsidiary entities...`);

  for (let i = 0; i < SUBSIDIARY_IDS.length; i++) {
    await db
      .insert(entities)
      .values({
        id: SUBSIDIARY_IDS[i],
        organizationId: orgId,
        name: SUBSIDIARY_NAMES[i],
        type: "subsidiary",
        currency: i === 0 ? "GMD" : i === 1 ? "GMD" : "USD",
        country: "GM",
        fiscalYearEnd: "12",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // ── 2. Entity Relationships ──────────────────────────────────────────
  console.log("  Creating entity relationships...");

  const RELATIONSHIPS = [
    {
      parentEntityId: entityId,
      subIdx: 0,
      pct: "100.00",
      method: "full",
      currency: "GMD",
    },
    {
      parentEntityId: entityId,
      subIdx: 1,
      pct: "75.00",
      method: "full",
      currency: "GMD",
    },
    {
      parentEntityId: entityId,
      subIdx: 2,
      pct: "60.00",
      method: "equity",
      currency: "USD",
    },
  ];

  for (let i = 0; i < RELATIONSHIPS.length; i++) {
    const r = RELATIONSHIPS[i];
    await db
      .insert(entityRelationships)
      .values({
        id: seedUuid("rel", i + 1),
        parentEntityId: r.parentEntityId,
        subsidiaryEntityId: SUBSIDIARY_IDS[r.subIdx],
        ownershipPct: r.pct,
        effectiveFrom: "2025-01-01",
        status: "active",
        consolidationMethod: r.method,
        currency: r.currency,
        notes:
          r.subIdx === 2 ? "Acquired 2025-06, USD functional currency" : null,
      })
      .onConflictDoNothing();
  }

  // ── 3. Consolidation Pipeline Runs ──────────────────────────────────
  console.log("  Creating consolidation pipeline runs...");

  const RUNS = [
    {
      period: "2026-05",
      status: "completed",
      totalSubs: 3,
      elimCount: 4,
      elimAmount: "285000",
      translationCount: 1,
      minorityCount: 2,
      integrity: true,
      confidence: "0.92",
      startedAt: "2026-06-05T08:00:00Z",
      completedAt: "2026-06-05T10:23:00Z",
    },
    {
      period: "2026-06",
      status: "completed",
      totalSubs: 3,
      elimCount: 5,
      elimAmount: "342000",
      translationCount: 1,
      minorityCount: 2,
      integrity: true,
      confidence: "0.88",
      startedAt: "2026-07-05T08:00:00Z",
      completedAt: "2026-07-05T11:15:00Z",
    },
    {
      period: "2026-07",
      status: "reviewing",
      totalSubs: 3,
      elimCount: 3,
      elimAmount: "195000",
      translationCount: 1,
      minorityCount: 2,
      integrity: true,
      confidence: "0.76",
      startedAt: "2026-08-03T08:00:00Z",
      completedAt: null,
    },
  ];

  const runIds: string[] = [];

  for (let i = 0; i < RUNS.length; i++) {
    const r = RUNS[i];
    const runId = seedUuid("consol-run", i + 1);
    runIds.push(runId);

    await db
      .insert(consolidationRuns)
      .values({
        id: runId,
        parentEntityId: entityId,
        organizationId: orgId,
        period: r.period,
        status: r.status,
        totalSubsidiaries: r.totalSubs,
        subsidiariesProcessed: r.totalSubs,
        eliminationCount: r.elimCount,
        eliminationAmount: r.elimAmount,
        translationCount: r.translationCount,
        minorityInterestCount: r.minorityCount,
        integrityCheckPassed: r.integrity,
        confidence: r.confidence,
        reviewedById: r.status === "completed" ? "demo@xenboox.com" : null,
        reviewedAt:
          r.status === "completed" && r.completedAt
            ? new Date(r.completedAt)
            : null,
        startedAt: new Date(r.startedAt),
        completedAt: r.completedAt ? new Date(r.completedAt) : null,
        triggeredBy: "scheduled",
        errors: [],
        warnings: [],
      })
      .onConflictDoNothing();
  }

  // ── 4. Elimination Entries ───────────────────────────────────────────
  console.log("  Creating elimination entries...");

  const ELIMINATIONS = [
    {
      runIdx: 0,
      subIdx: 0,
      counterpartyIdx: 1,
      type: "ic_receivable_payable",
      desc: "Inter-company receivable: Bakau → Logistics",
      amount: "120000",
      dc: "debit",
    },
    {
      runIdx: 0,
      subIdx: 1,
      counterpartyIdx: 0,
      type: "ic_receivable_payable",
      desc: "Inter-company payable: Logistics → Bakau",
      amount: "120000",
      dc: "credit",
    },
    {
      runIdx: 0,
      subIdx: 0,
      counterpartyIdx: 2,
      type: "ic_revenue_expense",
      desc: "Management fee charged: Bakau → Properties",
      amount: "25000",
      dc: "debit",
    },
    {
      runIdx: 0,
      subIdx: 2,
      counterpartyIdx: 0,
      type: "ic_revenue_expense",
      desc: "Management fee received: Properties → Bakau",
      amount: "25000",
      dc: "credit",
    },
    {
      runIdx: 1,
      subIdx: 0,
      counterpartyIdx: 1,
      type: "ic_receivable_payable",
      desc: "Inter-company receivable: Bakau → Logistics (June)",
      amount: "145000",
      dc: "debit",
    },
    {
      runIdx: 1,
      subIdx: 1,
      counterpartyIdx: 0,
      type: "ic_receivable_payable",
      desc: "Inter-company payable: Logistics → Bakau (June)",
      amount: "145000",
      dc: "credit",
    },
    {
      runIdx: 1,
      subIdx: 0,
      counterpartyIdx: 2,
      type: "ic_revenue_expense",
      desc: "Management fee charged: Bakau → Properties (June)",
      amount: "26000",
      dc: "debit",
    },
    {
      runIdx: 1,
      subIdx: 2,
      counterpartyIdx: 0,
      type: "ic_revenue_expense",
      desc: "Management fee received: Properties → Bakau (June)",
      amount: "26000",
      dc: "credit",
    },
    {
      runIdx: 2,
      subIdx: 0,
      counterpartyIdx: 1,
      type: "ic_receivable_payable",
      desc: "Inter-company receivable: Bakau → Logistics (July)",
      amount: "95000",
      dc: "debit",
    },
    {
      runIdx: 2,
      subIdx: 1,
      counterpartyIdx: 0,
      type: "ic_receivable_payable",
      desc: "Inter-company payable: Logistics → Bakau (July)",
      amount: "95000",
      dc: "credit",
    },
  ];

  for (let i = 0; i < ELIMINATIONS.length; i++) {
    const e = ELIMINATIONS[i];
    await db
      .insert(eliminationEntries)
      .values({
        id: seedUuid("elim", i + 1),
        consolidationRunId: runIds[e.runIdx],
        entityId: SUBSIDIARY_IDS[e.subIdx],
        counterpartyEntityId: SUBSIDIARY_IDS[e.counterpartyIdx],
        eliminationType: e.type,
        description: e.desc,
        amount: e.amount,
        debitCredit: e.dc,
        sourceTransactionIds: [],
        sourceTagIds: [],
        currency: "GMD",
        isPosted: false,
      })
      .onConflictDoNothing();
  }

  // ── 5. Minority Interest Records ──────────────────────────────────────
  console.log("  Creating minority interest records...");

  const MINORITIES = [
    {
      runIdx: 0,
      subIdx: 1, // Logistics (75% owned → 25% minority)
      ownershipPct: "75.00",
      minorityPct: "25.00",
      netIncome: "480000",
      minorityIncome: "120000",
      equity: "1800000",
      minorityEquity: "450000",
      period: "2026-05",
    },
    {
      runIdx: 0,
      subIdx: 2, // Properties (60% owned → 40% minority)
      ownershipPct: "60.00",
      minorityPct: "40.00",
      netIncome: "360000",
      minorityIncome: "144000",
      equity: "2400000",
      minorityEquity: "960000",
      period: "2026-05",
    },
    {
      runIdx: 1,
      subIdx: 1,
      ownershipPct: "75.00",
      minorityPct: "25.00",
      netIncome: "520000",
      minorityIncome: "130000",
      equity: "1850000",
      minorityEquity: "462500",
      period: "2026-06",
    },
    {
      runIdx: 1,
      subIdx: 2,
      ownershipPct: "60.00",
      minorityPct: "40.00",
      netIncome: "390000",
      minorityIncome: "156000",
      equity: "2450000",
      minorityEquity: "980000",
      period: "2026-06",
    },
    {
      runIdx: 2,
      subIdx: 1,
      ownershipPct: "75.00",
      minorityPct: "25.00",
      netIncome: "380000",
      minorityIncome: "95000",
      equity: "1870000",
      minorityEquity: "467500",
      period: "2026-07",
    },
    {
      runIdx: 2,
      subIdx: 2,
      ownershipPct: "60.00",
      minorityPct: "40.00",
      netIncome: "310000",
      minorityIncome: "124000",
      equity: "2480000",
      minorityEquity: "992000",
      period: "2026-07",
    },
  ];

  for (let i = 0; i < MINORITIES.length; i++) {
    const m = MINORITIES[i];
    await db
      .insert(minorityInterestRecords)
      .values({
        id: seedUuid("minority", i + 1),
        consolidationRunId: runIds[m.runIdx],
        subsidiaryEntityId: SUBSIDIARY_IDS[m.subIdx],
        ownershipPct: m.ownershipPct,
        minorityPct: m.minorityPct,
        subsidiaryNetIncome: m.netIncome,
        minorityShareIncome: m.minorityIncome,
        subsidiaryEquity: m.equity,
        minorityShareEquity: m.minorityEquity,
        period: m.period,
      })
      .onConflictDoNothing();
  }

  // ── 6. Inter-Company Tags ─────────────────────────────────────────────
  console.log("  Creating inter-company transaction tags...");

  // We need to find actual journal entries to reference
  const existingJEs = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(eq(journalEntries.entityId, entityId))
    .limit(5);

  for (let i = 0; i < existingJEs.length && i < 5; i++) {
    const je = existingJEs[i];
    const counterpartyIdx = i % 3;
    const tagType = i % 2 === 0 ? "receivable" : "expense";
    const amount = (i + 1) * 25000;

    await db
      .insert(intercompanyTags)
      .values({
        id: seedUuid("ict", i + 1),
        entityId,
        counterpartyEntityId: SUBSIDIARY_IDS[counterpartyIdx],
        transactionType: tagType,
        journalEntryId: je.id,
        amount: amount.toString(),
        currency: "GMD",
        description: `IC ${tagType}: Parent → ${SUBSIDIARY_NAMES[counterpartyIdx]} (${amount} GMD)`,
        taggedById: "demo@xenboox.com",
        taggedAt: new Date("2026-06-15"),
      })
      .onConflictDoNothing();
  }

  // Create subsidiary-side tags too
  if (existingJEs.length > 0) {
    for (let i = 0; i < 3 && i < existingJEs.length; i++) {
      const je = existingJEs[i];
      const amount = (i + 1) * 30000;
      await db
        .insert(intercompanyTags)
        .values({
          id: seedUuid("ict-sub", i + 1),
          entityId: SUBSIDIARY_IDS[i],
          counterpartyEntityId: entityId,
          transactionType: "payable",
          journalEntryId: je.id,
          amount: amount.toString(),
          currency: i === 2 ? "USD" : "GMD",
          description: `IC payable: ${SUBSIDIARY_NAMES[i]} → Parent (${amount} ${i === 2 ? "USD" : "GMD"})`,
          taggedById: "demo@xenboox.com",
          taggedAt: new Date("2026-06-15"),
        })
        .onConflictDoNothing();
    }
  }

  // ── 7. Audit Trail Entries ────────────────────────────────────────────
  console.log("  Creating audit trail entries...");

  for (let i = 0; i < RUNS.length; i++) {
    const r = RUNS[i];
    await db
      .insert(auditLog)
      .values({
        entityId,
        userId: "demo@xenboox.com",
        action: "consolidationPipeline.run",
        entityType: "consolidation_run",
        entityIdRef: runIds[i],
        oldValues: {},
        newValues: {
          period: r.period,
          subsidiaries: r.totalSubs,
          eliminations: r.elimCount,
          eliminationAmount: r.elimAmount,
          translations: r.translationCount,
          minorityInterests: r.minorityCount,
          integrityCheckPassed: r.integrity,
          confidence: r.confidence,
        },
      })
      .onConflictDoNothing();
  }

  console.log("  ✅ Consolidation pipeline seed complete!");
  console.log(
    `    ${SUBSIDIARY_IDS.length} subsidiaries · ${RELATIONSHIPS.length} relationships · ${RUNS.length} runs · ${ELIMINATIONS.length} eliminations · ${MINORITIES.length} minority records · ${existingJEs.length} IC tags`,
  );
}
