import crypto from "node:crypto";
import { db } from "../index";
import { goldenDatasetEvals } from "../schema/agents";
import { getAgentIds } from "./agents";

/**
 * Deterministic UUID generator — same seedUuid algorithm as the main seed.
 */
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Seed golden dataset evaluations for the agent evaluation framework.
 *
 * Creates realistic eval scenarios across key agents so the eval dashboard
 * has data to display. Covers passing, failing, and in-progress evaluations.
 * Not entity-scoped — these are platform-level model evaluations.
 */
export async function seedGoldenEvals() {
  console.log("  Seeding golden dataset evaluations...");

  const ids = getAgentIds();
  const now = new Date("2026-07-15T12:00:00Z");

  const evalData = [
    // ── Ledger Agent: Double-entry validation ──────────────────────
    {
      agentId: ids.ledger,
      scenarioDescription:
        "Double-entry validation — verify that a journal entry with debit GMD 50,000 and credit GMD 50,000 passes validation, and that an unbalanced entry is rejected.",
      expectedOutput: {
        balanced: true,
        totalDebit: "50000.00",
        totalCredit: "50000.00",
        difference: "0.00",
        validationPassed: true,
      },
      actualOutput: {
        balanced: true,
        totalDebit: "50000.00",
        totalCredit: "50000.00",
        difference: "0.00",
        validationPassed: true,
      },
      passed: true,
      confidence: 1.0,
      runAt: new Date("2026-07-14T08:00:00Z"),
      durationMs: 234,
      modelVersion: "haiku-4-5-20260701",
    },

    // ── AP Agent: Invoice approval routing ─────────────────────────
    {
      agentId: ids.ap,
      scenarioDescription:
        "Invoice approval routing — invoice of GMD 120,000 from known supplier, 15 days before due date. Should route to auto-approve since supplier is known and amount < CFO threshold.",
      expectedOutput: {
        routingDecision: "auto_approve",
        confidence: 0.92,
        reason:
          "Known supplier, amount below 500000 threshold, payment window > 10 days",
      },
      actualOutput: {
        routingDecision: "auto_approve",
        confidence: 0.94,
        reason:
          "Known supplier, amount below entity threshold (500000), due date > 10 days away",
      },
      passed: true,
      confidence: 0.94,
      runAt: new Date("2026-07-13T10:30:00Z"),
      durationMs: 412,
      modelVersion: "haiku-4-5-20260701",
    },

    // ── Reconciliation Agent: Bank matching ────────────────────────
    {
      agentId: ids.reconciliation,
      scenarioDescription:
        "Bank transaction matching — match 5 bank transactions against journal entries. One transaction has amount discrepancy of GMD 450 (bank shows 12,450, ledger shows 12,000).",
      expectedOutput: {
        matchedCount: 4,
        unmatchedCount: 1,
        flaggedCount: 1,
        discrepancies: [
          {
            txnId: "BT-2026-042",
            expected: "12450.00",
            actual: "12000.00",
            difference: "450.00",
            status: "flagged",
          },
        ],
      },
      actualOutput: {
        matchedCount: 4,
        unmatchedCount: 1,
        flaggedCount: 1,
        discrepancies: [
          {
            txnId: "BT-2026-042",
            expected: "12000.00",
            actual: "12000.00",
            difference: "450.00",
            status: "matched",
          },
        ],
      },
      passed: false,
      confidence: 0.68,
      runAt: new Date("2026-07-12T14:00:00Z"),
      durationMs: 891,
      modelVersion: "haiku-4-5-20260701",
      errorMessage:
        "Mismatch in discrepancy detection: agent matched transaction BT-2026-042 despite GMD 450 difference. Expected flagged status but got matched.",
    },

    // ── Tax Agent: VAT calculation ─────────────────────────────────
    {
      agentId: ids.tax,
      scenarioDescription:
        "VAT calculation — given total sales of GMD 320,000 inclusive of 15% VAT, calculate the VAT amount and net sales.",
      expectedOutput: {
        grossAmount: "320000.00",
        vatRate: 0.15,
        vatAmount: "41739.13",
        netAmount: "278260.87",
        calculation: "320000 / 1.15 * 0.15 = 41739.13",
      },
      actualOutput: {
        grossAmount: "320000.00",
        vatRate: 0.15,
        vatAmount: "41739.13",
        netAmount: "278260.87",
        calculation: "320000 / 1.15 * 0.15 = 41739.13",
      },
      passed: true,
      confidence: 1.0,
      runAt: new Date("2026-07-11T09:00:00Z"),
      durationMs: 156,
      modelVersion: "haiku-4-5-20260701",
    },

    // ── CFO Agent: Month-end review ─────────────────────────────────
    {
      agentId: ids.cfo,
      scenarioDescription:
        "Month-end close readiness review — evaluate whether all close checklist items are complete for June 2026. Expected to identify 2 missing items (depreciation and intercompany reconciliation).",
      expectedOutput: {
        periodMonth: "2026-06",
        totalChecklistItems: 10,
        completedItems: 8,
        missingItems: ["depreciation_posting", "intercompany_reconciliation"],
        readinessScore: 0.8,
        recommendation:
          "Complete depreciation and intercompany before proceeding with close.",
      },
      actualOutput: {
        periodMonth: "2026-06",
        totalChecklistItems: 10,
        completedItems: 8,
        missingItems: ["depreciation_posting", "intercompany_reconciliation"],
        readinessScore: 0.8,
        recommendation:
          "Depreciation and intercompany entries required before close. Estimated 45 minutes to complete.",
      },
      passed: true,
      confidence: 0.97,
      runAt: new Date("2026-07-07T08:30:00Z"),
      durationMs: 1203,
      modelVersion: "sonnet-4-6-20260701",
    },

    // ── Audit Agent: Anomaly detection ─────────────────────────────
    {
      agentId: ids.audit,
      scenarioDescription:
        "Anomaly detection — review 50 journal entries for suspicious patterns. One entry (JE-2026-042) has round amount (GMD 100,000) posted on a Sunday by an unusual user, which should be flagged.",
      expectedOutput: {
        entriesReviewed: 50,
        anomaliesFound: 1,
        anomalies: [
          {
            entryId: "JE-2026-042",
            amount: "100000.00",
            flags: ["round_amount", "weekend_posting", "unusual_user"],
            riskLevel: "medium",
          },
        ],
      },
      actualOutput: {
        entriesReviewed: 50,
        anomaliesFound: 1,
        anomalies: [
          {
            entryId: "JE-2026-042",
            amount: "100000.00",
            flags: ["round_amount", "weekend_posting"],
            riskLevel: "low",
          },
        ],
      },
      passed: false,
      confidence: 0.72,
      runAt: new Date("2026-07-10T16:00:00Z"),
      durationMs: 3456,
      modelVersion: "haiku-4-5-20260701",
      errorMessage:
        "Partial anomaly detection failure: flagged round amount and weekend posting but missed unusual_user flag. Risk level assessed as low instead of medium.",
    },

    // ── Document Agent: Invoice classification ─────────────────────
    {
      agentId: ids.document,
      scenarioDescription:
        "Document classification — classify 10 uploaded documents by type (invoice, receipt, contract, bank statement, payslip). Expected to correctly classify all 10.",
      expectedOutput: {
        documentsProcessed: 10,
        correctClassifications: 10,
        classifications: [
          { doc: "doc_001", type: "invoice", confidence: 0.97 },
          { doc: "doc_002", type: "receipt", confidence: 0.94 },
          { doc: "doc_003", type: "contract", confidence: 0.88 },
          { doc: "doc_004", type: "bank_statement", confidence: 0.96 },
          { doc: "doc_005", type: "invoice", confidence: 0.95 },
          { doc: "doc_006", type: "payslip", confidence: 0.93 },
          { doc: "doc_007", type: "receipt", confidence: 0.91 },
          { doc: "doc_008", type: "invoice", confidence: 0.98 },
          { doc: "doc_009", type: "contract", confidence: 0.85 },
          { doc: "doc_010", type: "bank_statement", confidence: 0.97 },
        ],
      },
      actualOutput: {
        documentsProcessed: 10,
        correctClassifications: 9,
        classifications: [
          { doc: "doc_001", type: "invoice", confidence: 0.97 },
          { doc: "doc_002", type: "receipt", confidence: 0.94 },
          { doc: "doc_003", type: "contract", confidence: 0.88 },
          { doc: "doc_004", type: "bank_statement", confidence: 0.96 },
          { doc: "doc_005", type: "invoice", confidence: 0.95 },
          { doc: "doc_006", type: "payslip", confidence: 0.93 },
          { doc: "doc_007", type: "receipt", confidence: 0.91 },
          { doc: "doc_008", type: "invoice", confidence: 0.98 },
          { doc: "doc_009", type: "grant_letter", confidence: 0.72 },
          { doc: "doc_010", type: "bank_statement", confidence: 0.97 },
        ],
      },
      passed: true,
      confidence: 0.93,
      runAt: new Date("2026-07-09T11:00:00Z"),
      durationMs: 2104,
      modelVersion: "haiku-4-5-20260701",
    },
  ];

  for (const evalItem of evalData) {
    await db
      .insert(goldenDatasetEvals)
      .values({
        id: seedUuid("gde", evalData.indexOf(evalItem) + 1),
        agentId: evalItem.agentId,
        scenarioDescription: evalItem.scenarioDescription,
        expectedOutput: evalItem.expectedOutput as any, // jsonb
        actualOutput: evalItem.actualOutput as any, // jsonb
        passed: evalItem.passed,
        confidence: String(evalItem.confidence),
        runAt: evalItem.runAt,
        durationMs: String(evalItem.durationMs),
        modelVersion: evalItem.modelVersion,
        errorMessage: evalItem.errorMessage ?? null,
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${evalData.length} golden dataset evals seeded`);
}
