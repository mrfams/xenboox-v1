import crypto from "node:crypto";
import { db } from "../index";
import { approvals } from "../schema/agents";
import { getAgentIds } from "./agents";

/**
 * Deterministic UUID generator — same seedUuid algorithm as the main seed.
 */
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Seed approval requests for the demo entity.
 *
 * Creates realistic human-in-the-loop scenarios across different approval types,
 * agents, and statuses so the Review Queue UI has data to display.
 *
 * @param entityId - The demo entity UUID (from seed/index.ts)
 * @param userId - The demo user UUID (from seed/index.ts — acts as the approver)
 */
export async function seedApprovals(entityId: string, userId: string) {
  console.log("  Seeding approval requests...");

  const ids = getAgentIds();
  const now = new Date("2026-07-15T10:00:00Z");

  // Generate deterministic target record IDs matching the journal entries and payroll runs
  // from seed/index.ts (these are UUIDs generated with seedUuid("f0", n) and seedUuid("b3", n))
  const journalEntryIds = [15, 16, 17, 18, 19, 20, 21].map((n) =>
    seedUuid("f0", n),
  );
  const payrollRunIds = [1, 2].map((n) => seedUuid("b3", n));
  const supplierInvoiceIds = [1, 2, 3].map((n) => seedUuid("a3", n));

  const approvalData = [
    // ── Pending: AP Agent flags high-value invoice ──────────────────
    {
      requestedByAgentId: ids.ap,
      approvalType: "invoice_approval",
      targetRecordType: "ap_invoice",
      targetRecordId: supplierInvoiceIds[0],
      reasoning:
        "INV-2026-001 from Global Supplies Ltd. for GMD 85,000 exceeds the entity's default approval threshold. Requesting FD review before scheduling payment.",
      confidence: 0.82,
      status: "pending" as const,
      assignedToUserId: userId,
      createdAt: new Date("2026-07-10T08:30:00Z"),
      updatedAt: new Date("2026-07-10T08:30:00Z"),
    },

    // ── Approved: Payroll Manager submits June payroll ──────────────
    {
      requestedByAgentId: ids.payrollManager,
      approvalType: "payroll_run",
      targetRecordType: "payroll_run",
      targetRecordId: payrollRunIds[0],
      reasoning:
        "June 2026 payroll run (5 employees, gross GMD 173,000.00, net GMD 147,050.00) has been calculated and verified. All statutory deductions applied correctly.",
      confidence: 0.96,
      status: "approved" as const,
      assignedToUserId: userId,
      resolvedAt: new Date("2026-07-02T14:00:00Z"),
      resolutionNote: "Approved. Payroll processed successfully.",
      createdAt: new Date("2026-07-01T16:00:00Z"),
      updatedAt: now,
    },

    // ── Escalated: Expense Agent flags anomaly ──────────────────────
    {
      requestedByAgentId: ids.expense,
      approvalType: "expense_claim",
      targetRecordType: "expense_claim",
      targetRecordId: seedUuid("apr", 1),
      reasoning:
        "Claim #EXP-2026-042 (Awa Bah, GMD 18,500) flagged: receipt total GMD 18,500 but category 'office supplies' has monthly avg of GMD 3,200. Amount is 5.8x above typical. Escalated to CFO Agent for review.",
      confidence: 0.71,
      status: "escalated" as const,
      assignedToUserId: userId,
      escalatedToAgentId: ids.cfo,
      createdAt: new Date("2026-07-12T11:15:00Z"),
      updatedAt: now,
    },

    // ── Rejected: Ledger Agent requests manual adjustment ───────────
    {
      requestedByAgentId: ids.ledger,
      approvalType: "journal_entry",
      targetRecordType: "journal_entry",
      targetRecordId: journalEntryIds[3], // entry 18 (July COGS)
      reasoning:
        "Suggested adjustment to July COGS entry: reclassify GMD 25,000 from COGS to operating expense. Items were promotional samples, not resale inventory.",
      confidence: 0.65,
      status: "rejected" as const,
      assignedToUserId: userId,
      resolvedAt: new Date("2026-07-14T09:30:00Z"),
      resolutionNote:
        "Rejected. The promotional samples were handed out alongside paid product — COGS classification is correct per GAAP. Retain original posting.",
      createdAt: new Date("2026-07-13T15:45:00Z"),
      updatedAt: now,
    },

    // ── Pending: Compliance Agent requests tax filing approval ──────
    {
      requestedByAgentId: ids.compliance,
      approvalType: "tax_filing",
      targetRecordType: "tax_filing",
      targetRecordId: seedUuid("apr", 2),
      reasoning:
        "Q2 2026 VAT return prepared. Output VAT: GMD 145,652.18, Input VAT: GMD 38,750.00, Net payable: GMD 106,902.18. Supporting schedules attached. Due date: 2026-07-20.",
      confidence: 0.93,
      status: "pending" as const,
      assignedToUserId: userId,
      createdAt: new Date("2026-07-14T08:00:00Z"),
      updatedAt: now,
    },

    // ── Approved: Treasury Agent requests close confirmation ────────
    {
      requestedByAgentId: ids.treasury,
      approvalType: "reconciliation_close",
      targetRecordType: "reconciliation",
      targetRecordId: seedUuid("apr", 3),
      reasoning:
        "Main Operating Account reconciliation for June 2026 complete. 8 of 8 bank transactions matched. Closing balance: GMD 722,500.00. No discrepancies found.",
      confidence: 0.99,
      status: "approved" as const,
      assignedToUserId: userId,
      resolvedAt: new Date("2026-07-05T16:30:00Z"),
      resolutionNote:
        "Reconciliation confirmed. Closing balance verified against bank statement.",
      createdAt: new Date("2026-07-05T11:00:00Z"),
      updatedAt: now,
    },

    // ── Pending: Controller Agent requests month-end close approval ─
    {
      requestedByAgentId: ids.controller,
      approvalType: "month_end_close",
      targetRecordType: "close_period",
      targetRecordId: seedUuid("apr", 4),
      reasoning:
        "Requesting close approval for June 2026. All 14 journal entries posted, AR/AP aging verified, bank accounts reconciled, payroll posted, depreciation recorded. Trial balance total: GMD 4,208,500.00 debit and credit balanced. Variance from prior month: +3.2% revenue.",
      confidence: 0.97,
      status: "pending" as const,
      assignedToUserId: userId,
      createdAt: new Date("2026-07-07T10:00:00Z"),
      updatedAt: now,
    },
  ];

  for (const approval of approvalData) {
    await db
      .insert(approvals)
      .values({
        id: seedUuid("apr", approvalData.indexOf(approval) + 10),
        entityId,
        requestedByAgentId: approval.requestedByAgentId,
        approvalType: approval.approvalType,
        targetRecordType: approval.targetRecordType,
        targetRecordId: approval.targetRecordId,
        reasoning: approval.reasoning,
        confidence: String(approval.confidence),
        status: approval.status as any, // pgEnum cast
        assignedToUserId: approval.assignedToUserId,
        resolvedAt: approval.resolvedAt ?? null,
        resolutionNote: approval.resolutionNote ?? null,
        escalatedToAgentId:
          "escalatedToAgentId" in approval
            ? (approval as any).escalatedToAgentId
            : null,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${approvalData.length} approval requests seeded`);
}
