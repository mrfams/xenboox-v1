// ─── Expense Management Schema ──────────────────────────────────────────────
//
// Employee expense claims, mobile-first: photo receipt → policy check →
// manager approval → reimbursement → ledger posting.
//
// Tables:
//   expense_claims        — Claim header (status lifecycle, amounts, metadata)
//   claim_line_items      — Individual line items per claim (receipt ref, amount, ocr)
//   policy_rules          — Configurable per-entity, per-category, per-role limits
//   approval_records      — Manager decision tracking (required for all flagged claims)
//   reimbursement_records — Payment scheduling and execution tracking

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities } from "./organization";

// ─── Expense Claims ─────────────────────────────────────────────────────────

export const expenseClaims = pgTable(
  "expense_claims",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    claimNumber: text("claim_number").notNull(),
    claimantId: text("claimant_id").notNull(),
    claimantName: text("claimant_name"),
    department: text("department"),
    category: text("category").notNull(),
    description: text("description").notNull(),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("GMD"),
    status: text("status").notNull().default("draft"),
    // status options: draft | submitted | flagged | approved | rejected | reimbursed | voided
    source: text("source").notNull().default("mobile"),
    // source: mobile | web | agent
    period: text("period"),
    submittedAt: timestamp("submitted_at"),
    flaggedReason: text("flagged_reason"),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at"),
    voidedReason: text("voided_reason"),
    voidedAt: timestamp("voided_at"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("exp_claim_entity").on(t.entityId),
    index("exp_claim_claimant").on(t.entityId, t.claimantId),
    index("exp_claim_status").on(t.entityId, t.status),
    index("exp_claim_period").on(t.entityId, t.period),
    index("exp_claim_created").on(t.entityId, t.createdAt),
  ],
);

// ─── Claim Line Items ───────────────────────────────────────────────────────

export const claimLineItems = pgTable(
  "claim_line_items",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => expenseClaims.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull().default(1),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0"),
    receiptDocumentRef: text("receipt_document_ref"),
    ocrConfidence: numeric("ocr_confidence", { precision: 3, scale: 2 }),
    ocrExtracted: jsonb("ocr_extracted")
      .default({})
      .$type<Record<string, unknown>>(),
    isFlagged: boolean("is_flagged").notNull().default(false),
    flagReason: text("flag_reason"),
    policyRuleId: text("policy_rule_id"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("cli_claim").on(t.entityId, t.claimId),
    index("cli_flag").on(t.entityId, t.isFlagged),
  ],
);

// ─── Policy Rules ───────────────────────────────────────────────────────────

export const policyRules = pgTable(
  "policy_rules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    role: text("role").notNull().default("employee"),
    // role: employee | manager | director | executive
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    requiresApprovalAbove: numeric("requires_approval_above", {
      precision: 15,
      scale: 2,
    }).default("0"),
    requiresReceiptAbove: numeric("requires_receipt_above", {
      precision: 15,
      scale: 2,
    }).default("0"),
    maxPerMonth: numeric("max_per_month", { precision: 15, scale: 2 }).default(
      "0",
    ),
    allowedCurrencies: text("allowed_currencies").array(),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: text("effective_from"),
    effectiveTo: text("effective_to"),
    description: text("description"),
    ...timestamps,
  },
  (t) => [
    index("pr_entity_category").on(t.entityId, t.category),
    index("pr_entity_role").on(t.entityId, t.role),
    index("pr_active").on(t.entityId, t.isActive),
  ],
);

// ─── Approval Records ───────────────────────────────────────────────────────

export const approvalRecords = pgTable(
  "approval_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => expenseClaims.id, { onDelete: "cascade" }),
    approverId: text("approver_id").notNull(),
    approverName: text("approver_name"),
    decision: text("decision").notNull(),
    // decision: pending | approved | rejected | needs_info
    decidedAt: timestamp("decided_at"),
    note: text("note"),
    escalationLevel: integer("escalation_level").default(1),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    ...timestamps,
  },
  (t) => [
    index("ar_claim").on(t.entityId, t.claimId),
    index("ar_approver").on(t.entityId, t.approverId),
    index("ar_decision").on(t.entityId, t.decision),
  ],
);

// ─── Reimbursement Records ──────────────────────────────────────────────────

export const reimbursementRecords = pgTable(
  "reimbursement_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => expenseClaims.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("GMD"),
    paymentMethod: text("payment_method").default("bank_transfer"),
    // payment_method: bank_transfer | mobile_money | cash | cheque
    scheduledDate: timestamp("scheduled_date"),
    paidDate: timestamp("paid_date"),
    paymentRef: text("payment_ref"),
    batchId: text("batch_id"),
    status: text("status").notNull().default("scheduled"),
    // status: scheduled | processing | paid | failed | cancelled
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (t) => [
    index("rr_claim").on(t.entityId, t.claimId),
    index("rr_status").on(t.entityId, t.status),
    index("rr_scheduled").on(t.entityId, t.scheduledDate),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const expenseClaimsRelations = {};
export const claimLineItemsRelations = {};
export const policyRulesRelations = {};
export const approvalRecordsRelations = {};
export const reimbursementRecordsRelations = {};
