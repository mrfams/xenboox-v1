import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { bankAccounts, bankTransactions } from "./treasury";

// ─── ENUMS ────────────────────────────────────────────────────────────────

/** Provider type — bank or mobile money */
export const providerTypeEnum = pgEnum("provider_type", [
  "bank",
  "mobile_money",
]);

/** Status of a normalized statement line after matching */
export const statementLineStatusEnum = pgEnum("statement_line_status", [
  "matched",
  "pending_settlement",
  "unmatched",
  "ignored",
]);

/** Match tier from the matching engine */
export const matchTierEnum = pgEnum("match_tier", [
  "exact",
  "strong",
  "weak",
  "manual",
]);

/** Enhanced reconciliation session status */
export const sessionReconStatusEnum = pgEnum("session_recon_status", [
  "open",
  "review_pending",
  "clean",
  "failed",
]);

/** Reason an item was flagged unmatched */
export const unmatchedReasonEnum = pgEnum("unmatched_reason", [
  "no_candidate",
  "multiple_candidates",
  "amount_mismatch",
  "below_confidence",
  "pending_settlement",
]);

// ─── STATEMENT LINES ──────────────────────────────────────────────────────
//
// Normalized statement line from ANY source — bank API, PDF, CSV,
// mobile money provider. Every source normalizes to this shape so the
// matching engine never needs to know which provider a line came from.

export const statementLines = pgTable(
  "statement_lines",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "set null",
    }),
    provider: providerTypeEnum("provider").notNull(),
    providerName: text("provider_name").notNull(), // e.g. "Ecobank", "Wave"
    date: text("date").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GMD"),
    description: text("description").notNull(),
    reference: text("reference"),
    runningBalance: numeric("running_balance", { precision: 15, scale: 2 }),
    rawSourceRef: text("raw_source_ref"), // original tx ID from source
    status: statementLineStatusEnum("status").notNull().default("unmatched"),
    matchedJournalEntryId: uuid("matched_journal_entry_id"),
    matchConfidence: numeric("match_confidence", { precision: 4, scale: 3 }),
    matchTier: matchTierEnum("match_tier"),
    source: text("source").notNull().default("manual"), // "bank_api", "pdf_import", "csv_import", "manual"
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("stmt_lines_entity").on(t.entityId),
    index("stmt_lines_account").on(t.bankAccountId),
    index("stmt_lines_date").on(t.entityId, t.date),
    index("stmt_lines_status").on(t.entityId, t.status),
    index("stmt_lines_provider").on(t.entityId, t.providerName),
  ],
);

export const statementLinesRelations = relations(statementLines, ({ one }) => ({
  entity: one(entities, {
    fields: [statementLines.entityId],
    references: [entities.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [statementLines.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

// ─── MATCH RECORDS ────────────────────────────────────────────────────────
//
// Every match decision logged: which statement line, which ledger entry,
// confidence score, matched by (auto/human), timestamp.
// This is the audit trail for every reconciliation action.

export const matchRecords = pgTable(
  "match_records",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    reconciliationSessionId: uuid("reconciliation_session_id"),
    statementLineId: uuid("statement_line_id"),
    bankTransactionId: uuid("bank_transaction_id"),
    ledgerEntryId: uuid("ledger_entry_id"),
    matchTier: matchTierEnum("match_tier").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    matchedBy: text("matched_by").notNull().default("auto"), // "auto" | "human"
    matchFactors: jsonb("match_factors").notNull().$type<{
      amountScore: number;
      dateScore: number;
      referenceScore: number;
    }>(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("match_records_entity").on(t.entityId),
    index("match_records_session").on(t.reconciliationSessionId),
    index("match_records_stmt_line").on(t.statementLineId),
    index("match_records_ledger").on(t.ledgerEntryId),
  ],
);

export const matchRecordsRelations = relations(matchRecords, ({ one }) => ({
  entity: one(entities, {
    fields: [matchRecords.entityId],
    references: [entities.id],
  }),
}));

// ─── RECONCILIATION SESSIONS ──────────────────────────────────────────────
//
// Entity-level reconciliation session that aggregates per-account results.
// Cannot be marked "clean" while ANY unmatched items exist (hard rule).
// Treasury Agent must review before marking complete.

export const reconciliationSessions = pgTable(
  "reconciliation_sessions",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    status: sessionReconStatusEnum("status").notNull().default("open"),
    accountsIncluded: text("accounts_included").array().notNull().default([]),
    matchedCount: numeric("matched_count").notNull().default("0"),
    unmatchedCount: numeric("unmatched_count").notNull().default("0"),
    totalCount: numeric("total_count").notNull().default("0"),
    overallConfidence: numeric("overall_confidence", {
      precision: 4,
      scale: 3,
    }),
    reviewedBy: text("reviewed_by"), // treasury_agent
    reviewedAt: timestamp("reviewed_at"),
    closedAt: timestamp("closed_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("recon_sessions_entity").on(t.entityId),
    index("recon_sessions_status").on(t.entityId, t.status),
  ],
);

export const reconciliationSessionsRelations = relations(
  reconciliationSessions,
  ({ one }) => ({
    entity: one(entities, {
      fields: [reconciliationSessions.entityId],
      references: [entities.id],
    }),
  }),
);
