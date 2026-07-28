import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── ENUMS ───────────────────────────────────────

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const accountSubtypeEnum = pgEnum("account_subtype", [
  "current_asset",
  "fixed_asset",
  "bank_account",
  "cash",
  "accounts_receivable",
  "inventory",
  "prepaid",
  "current_liability",
  "long_term_liability",
  "accounts_payable",
  "tax_liability",
  "accrued_liability",
  "owner_equity",
  "retained_earnings",
  "current_year_earnings",
  "sales_revenue",
  "service_revenue",
  "other_income",
  "interest_income",
  "cost_of_goods_sold",
  "operating_expense",
  "payroll_expense",
  "tax_expense",
  "depreciation",
  "interest_expense",
  "other_expense",
]);

export const journalStatusEnum = pgEnum("journal_status", [
  "draft",
  "pending_review",
  "posted",
  "reversed",
  "voided",
]);

export const periodStatusEnum = pgEnum("period_status", [
  "open",
  "closing",
  "closed",
  "locked",
]);

// ─── CHART OF ACCOUNTS ───────────────────────────

export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    subtype: accountSubtypeEnum("subtype").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    parentId: uuid("parent_id").references((): any => chartOfAccounts.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("coa_entity_code").on(t.entityId, t.code),
    index("coa_entity").on(t.entityId),
    index("coa_type").on(t.entityId, t.type),
  ],
);

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [chartOfAccounts.entityId],
      references: [entities.id],
    }),
    parent: one(chartOfAccounts, {
      fields: [chartOfAccounts.parentId],
      references: [chartOfAccounts.id],
      relationName: "parentChild",
    }),
    children: many(chartOfAccounts, { relationName: "parentChild" }),
  }),
);

// ─── FISCAL PERIODS ──────────────────────────────

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: periodStatusEnum("status").notNull().default("open"),
    closedBy: uuid("closed_by"),
    closedAt: timestamp("closed_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("fp_entity_year_month").on(t.entityId, t.year, t.month),
    index("fp_entity").on(t.entityId),
  ],
);

export const fiscalPeriodsRelations = relations(fiscalPeriods, ({ one }) => ({
  entity: one(entities, {
    fields: [fiscalPeriods.entityId],
    references: [entities.id],
  }),
}));

// ─── JOURNAL ENTRIES ─────────────────────────────

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    entryNumber: integer("entry_number").notNull(),
    description: text("description").notNull(),
    reference: text("reference"),
    date: text("date").notNull(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    status: journalStatusEnum("status").notNull().default("draft"),
    postedBy: text("posted_by"),
    postedAt: timestamp("posted_at"),
    reversedBy: uuid("reversed_by"),
    reversedAt: timestamp("reversed_at"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    source: text("source"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("je_entity_date").on(t.entityId, t.date),
    index("je_period").on(t.entityId, t.periodId),
    index("je_status").on(t.entityId, t.status),
  ],
);

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [journalEntries.entityId],
      references: [entities.id],
    }),
    period: one(fiscalPeriods, {
      fields: [journalEntries.periodId],
      references: [fiscalPeriods.id],
    }),
    lines: many(journalEntryLines),
    sources: many(journalEntrySources),
  }),
);

// ─── JOURNAL ENTRY LINES ─────────────────────────

export const journalEntryLines = pgTable(
  "journal_entry_lines",
  {
    id: uuidId(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    debit: numeric("debit", { precision: 15, scale: 2 }).default("0"),
    credit: numeric("credit", { precision: 15, scale: 2 }).default("0"),
    description: text("description"),
    ...timestamps,
  },
  (t) => [
    index("jel_entry").on(t.journalEntryId),
    index("jel_account").on(t.accountId),
  ],
);

export const journalEntryLinesRelations = relations(
  journalEntryLines,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalEntryLines.journalEntryId],
      references: [journalEntries.id],
    }),
    account: one(chartOfAccounts, {
      fields: [journalEntryLines.accountId],
      references: [chartOfAccounts.id],
    }),
  }),
);

// ─── JOURNAL ENTRY SOURCES (join table for polymorphic sources) ──────────

export const journalEntrySources = pgTable(
  "journal_entry_sources",
  {
    id: uuidId(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id"),
    sourceReference: text("source_reference"),
    sourceDescription: text("source_description"),
    ...timestamps,
  },
  (t) => [
    index("jes_journal_entry").on(t.journalEntryId),
    index("jes_source").on(t.sourceType, t.sourceId),
    uniqueIndex("jes_unique_source").on(
      t.journalEntryId,
      t.sourceType,
      t.sourceId,
    ),
  ],
);

export const journalEntrySourcesRelations = relations(
  journalEntrySources,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalEntrySources.journalEntryId],
      references: [journalEntries.id],
    }),
  }),
);

// ─── TRIAL BALANCE SNAPSHOTS ─────────────────────

export const trialBalanceSnapshots = pgTable(
  "trial_balance_snapshots",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => fiscalPeriods.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    debitTotal: numeric("debit_total", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    creditTotal: numeric("credit_total", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    balance: numeric("balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    generatedBy: text("generated_by").notNull(),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tbs_entity_period_account").on(
      t.entityId,
      t.periodId,
      t.accountId,
    ),
  ],
);
