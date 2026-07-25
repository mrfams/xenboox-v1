// ─── Consolidation Pipeline Schema ──────────────────────────────────────────
//
// Multi-Entity & Consolidation tables: entity hierarchy, inter-company tagging,
// elimination entries, minority interest, and consolidation run tracking.
//
// Core constraint: consolidation is an overlay layer — it never touches or
// mutates any subsidiary's standalone entity-level books. Elimination entries
// exist ONLY in the consolidation layer.
//
// Tables:
//   entity_relationships      — Parent-subsidiary hierarchy with ownership %
//   consolidation_runs        — Pipeline execution tracking per parent entity
//   elimination_entries       — Inter-company eliminations (consolidation only)
//   minority_interest_records — Minority share calculations
//   intercompany_tags          — Tags on transactions for IC matching
//
// Rules:
//   - Elimination entries NEVER written to entity-level ledger
//   - Consolidation output NEVER delivered without Controller sign-off
//   - Entity-level integrity check runs after every consolidation

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities } from "./organization";
import { journalEntries, journalEntryLines } from "./accounting";

// ─── Entity Relationships ───────────────────────────────────────────────────

export const entityRelationships = pgTable(
  "entity_relationships",
  {
    id: uuidId(),
    parentEntityId: uuid("parent_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    subsidiaryEntityId: uuid("subsidiary_entity_id")
      .notNull()
      .unique()
      .references(() => entities.id, { onDelete: "cascade" }),
    ownershipPct: numeric("ownership_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    status: text("status").notNull().default("active"),
    // "active" | "divested" | "pending"
    consolidationMethod: text("consolidation_method").notNull().default("full"),
    // "full" | "equity" | "proportional"
    currency: text("currency").notNull().default("GMD"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("er_parent").on(t.parentEntityId),
    index("er_subsidiary").on(t.subsidiaryEntityId),
    index("er_status").on(t.parentEntityId, t.status),
  ],
);

export const entityRelationshipsRelations = relations(
  entityRelationships,
  ({ one }) => ({
    parent: one(entities, {
      fields: [entityRelationships.parentEntityId],
      references: [entities.id],
      relationName: "parentEntity",
    }),
    subsidiary: one(entities, {
      fields: [entityRelationships.subsidiaryEntityId],
      references: [entities.id],
      relationName: "subsidiaryEntity",
    }),
  }),
);

// ─── Inter-Company Transaction Tags ─────────────────────────────────────────

export const intercompanyTags = pgTable(
  "intercompany_tags",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    counterpartyEntityId: uuid("counterparty_entity_id")
      .notNull()
      .references(() => entities.id),
    transactionType: text("transaction_type").notNull(),
    // "receivable" | "payable" | "revenue" | "expense"
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    journalEntryLineIds: jsonb("journal_entry_line_ids")
      .$type<string[]>()
      .default([]),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GMD"),
    description: text("description"),
    taggedAt: timestamp("tagged_at").notNull().defaultNow(),
    taggedById: text("tagged_by_id"),
    reversedAt: timestamp("reversed_at"),
    ...timestamps,
  },
  (t) => [
    index("ict_entity").on(t.entityId),
    index("ict_counterparty").on(t.counterpartyEntityId),
    index("ict_je").on(t.journalEntryId),
    index("ict_type").on(t.entityId, t.transactionType),
    index("ict_pair").on(t.entityId, t.counterpartyEntityId),
  ],
);

export const intercompanyTagsRelations = relations(
  intercompanyTags,
  ({ one }) => ({
    entity: one(entities, {
      fields: [intercompanyTags.entityId],
      references: [entities.id],
    }),
    counterparty: one(entities, {
      fields: [intercompanyTags.counterpartyEntityId],
      references: [entities.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [intercompanyTags.journalEntryId],
      references: [journalEntries.id],
    }),
  }),
);

// ─── Consolidation Runs ─────────────────────────────────────────────────────

export const consolidationRuns = pgTable(
  "consolidation_runs",
  {
    id: uuidId(),
    parentEntityId: uuid("parent_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    period: text("period").notNull(),
    status: text("status").notNull().default("pending"),
    // "pending" | "mapping" | "tagging" | "eliminating" | "translating" |
    // "minority_calc" | "assembling" | "reviewing" | "completed" | "failed"
    totalSubsidiaries: integer("total_subsidiaries").notNull().default(0),
    subsidiariesProcessed: integer("subsidiaries_processed")
      .notNull()
      .default(0),
    eliminationCount: integer("elimination_count").notNull().default(0),
    eliminationAmount: numeric("elimination_amount", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    translationCount: integer("translation_count").notNull().default(0),
    minorityInterestCount: integer("minority_interest_count")
      .notNull()
      .default(0),
    integrityCheckPassed: boolean("integrity_check_passed"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    reviewedById: text("reviewed_by_id"),
    reviewedAt: timestamp("reviewed_at"),
    errors: jsonb("errors").$type<string[]>().default([]),
    warnings: jsonb("warnings").$type<string[]>().default([]),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    triggeredBy: text("triggered_by").notNull().default("manual"),
    ...timestamps,
  },
  (t) => [
    index("cr_parent").on(t.parentEntityId),
    index("cr_period").on(t.parentEntityId, t.period),
    index("cr_status").on(t.parentEntityId, t.status),
    index("cr_org").on(t.organizationId),
  ],
);

export const consolidationRunsRelations = relations(
  consolidationRuns,
  ({ one, many }) => ({
    parent: one(entities, {
      fields: [consolidationRuns.parentEntityId],
      references: [entities.id],
    }),
    eliminations: many(eliminationEntries),
    minorityInterests: many(minorityInterestRecords),
  }),
);

// ─── Elimination Entries ────────────────────────────────────────────────────

export const eliminationEntries = pgTable(
  "elimination_entries",
  {
    id: uuidId(),
    consolidationRunId: uuid("consolidation_run_id")
      .notNull()
      .references(() => consolidationRuns.id, { onDelete: "cascade" }),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    counterpartyEntityId: uuid("counterparty_entity_id")
      .notNull()
      .references(() => entities.id),
    eliminationType: text("elimination_type").notNull(),
    // "ic_receivable_payable" | "ic_revenue_expense" | "ic_income" | "dividend"
    accountId: uuid("account_id"),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    debitCredit: text("debit_credit").notNull(),
    // "debit" | "credit"
    sourceTransactionIds: jsonb("source_transaction_ids")
      .$type<string[]>()
      .default([]),
    sourceTagIds: jsonb("source_tag_ids").$type<string[]>().default([]),
    currency: text("currency").notNull().default("GMD"),
    translatedAmount: numeric("translated_amount", { precision: 15, scale: 2 }),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    parentAccountId: uuid("parent_account_id"),
    // Maps to a COA account in the parent entity's chart
    isPosted: boolean("is_posted").notNull().default(false),
    // NEVER true — elimination entries live in consolidation layer only
    // DB CHECK constraint (is_posted = false) should be added via migration
    // to enforce this at the database level (see migration pattern in 0013_financial_check_constraints.sql)
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("ee_run").on(t.consolidationRunId),
    index("ee_entity").on(t.entityId),
    index("ee_type").on(t.eliminationType),
    index("ee_counterparty").on(t.counterpartyEntityId),
  ],
);

export const eliminationEntriesRelations = relations(
  eliminationEntries,
  ({ one }) => ({
    consolidationRun: one(consolidationRuns, {
      fields: [eliminationEntries.consolidationRunId],
      references: [consolidationRuns.id],
    }),
    entity: one(entities, {
      fields: [eliminationEntries.entityId],
      references: [entities.id],
    }),
    counterparty: one(entities, {
      fields: [eliminationEntries.counterpartyEntityId],
      references: [entities.id],
    }),
  }),
);

// ─── Minority Interest Records ──────────────────────────────────────────────

export const minorityInterestRecords = pgTable(
  "minority_interest_records",
  {
    id: uuidId(),
    consolidationRunId: uuid("consolidation_run_id")
      .notNull()
      .references(() => consolidationRuns.id, { onDelete: "cascade" }),
    subsidiaryEntityId: uuid("subsidiary_entity_id")
      .notNull()
      .references(() => entities.id),
    ownershipPct: numeric("ownership_pct", {
      precision: 5,
      scale: 2,
    }).notNull(),
    minorityPct: numeric("minority_pct", { precision: 5, scale: 2 }).notNull(),
    subsidiaryNetIncome: numeric("subsidiary_net_income", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    minorityShareIncome: numeric("minority_share_income", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    subsidiaryEquity: numeric("subsidiary_equity", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    minorityShareEquity: numeric("minority_share_equity", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    period: text("period").notNull(),
    ...timestamps,
  },
  (t) => [
    index("mir_run").on(t.consolidationRunId),
    index("mir_subsidiary").on(t.subsidiaryEntityId),
  ],
);

export const minorityInterestRecordsRelations = relations(
  minorityInterestRecords,
  ({ one }) => ({
    consolidationRun: one(consolidationRuns, {
      fields: [minorityInterestRecords.consolidationRunId],
      references: [consolidationRuns.id],
    }),
    subsidiary: one(entities, {
      fields: [minorityInterestRecords.subsidiaryEntityId],
      references: [entities.id],
    }),
  }),
);
