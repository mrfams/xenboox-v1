import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { uuidId, entityId, timestamps } from "./helpers"
import { entities } from "./organization"
import { chartOfAccounts, journalEntries } from "./accounting"

// ─── ENUMS ───────────────────────────────────────

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "checking", "savings", "fixed_deposit", "loan"
])

export const bankTxTypeEnum = pgEnum("bank_tx_type", [
  "deposit", "withdrawal", "transfer", "fee", "interest"
])

export const reconStatusEnum = pgEnum("recon_status", [
  "unmatched", "partial", "matched", "adjusted", "closed"
])

export const reconItemStatusEnum = pgEnum("recon_item_status", [
  "pending", "matched", "adjusted", "ignored"
])

// ─── BANK ACCOUNTS ───────────────────────────────

export const bankAccounts = pgTable("bank_accounts", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  swiftCode: text("swift_code"),
  type: bankAccountTypeEnum("type").notNull().default("checking"),
  currency: text("currency").notNull().default("GMD"),
  openingBalance: numeric("opening_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("bank_accounts_entity").on(t.entityId)
])

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  entity: one(entities, { fields: [bankAccounts.entityId], references: [entities.id] }),
  glAccount: one(chartOfAccounts, { fields: [bankAccounts.glAccountId], references: [chartOfAccounts.id] }),
  transactions: many(bankTransactions)
}))

// ─── BANK TRANSACTIONS ───────────────────────────

export const bankTransactions = pgTable("bank_transactions", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  transactionDate: text("transaction_date").notNull(),
  valueDate: text("value_date"),
  type: bankTxTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }),
  description: text("description").notNull(),
  reference: text("reference"),
  isReconciled: boolean("is_reconciled").notNull().default(false),
  reconciliationId: uuid("reconciliation_id"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  source: text("source").default("manual"),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("bank_tx_entity").on(t.entityId),
  index("bank_tx_account").on(t.bankAccountId),
  index("bank_tx_date").on(t.entityId, t.transactionDate),
  index("bank_tx_reconciled").on(t.bankAccountId, t.isReconciled)
])

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  entity: one(entities, { fields: [bankTransactions.entityId], references: [entities.id] }),
  bankAccount: one(bankAccounts, { fields: [bankTransactions.bankAccountId], references: [bankAccounts.id] }),
  reconciliation: one(reconciliations, { fields: [bankTransactions.reconciliationId], references: [reconciliations.id] }),
  journalEntry: one(journalEntries, { fields: [bankTransactions.journalEntryId], references: [journalEntries.id] })
}))

// ─── RECONCILIATIONS ─────────────────────────────

export const reconciliations = pgTable("reconciliations", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  statementDate: text("statement_date").notNull(),
  statementBalance: numeric("statement_balance", { precision: 15, scale: 2 }).notNull(),
  bookBalance: numeric("book_balance", { precision: 15, scale: 2 }).notNull(),
  difference: numeric("difference", { precision: 15, scale: 2 }).notNull(),
  status: reconStatusEnum("status").notNull().default("unmatched"),
  closedBy: text("closed_by"),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  ...timestamps
}, (t) => [
  index("recon_entity").on(t.entityId),
  index("recon_account").on(t.bankAccountId),
  index("recon_status").on(t.entityId, t.status)
])

export const reconciliationsRelations = relations(reconciliations, ({ one, many }) => ({
  entity: one(entities, { fields: [reconciliations.entityId], references: [entities.id] }),
  bankAccount: one(bankAccounts, { fields: [reconciliations.bankAccountId], references: [bankAccounts.id] }),
  items: many(reconciliationItems)
}))

// ─── RECONCILIATION ITEMS ────────────────────────

export const reconciliationItems = pgTable("reconciliation_items", {
  id: uuidId(),
  reconciliationId: uuid("reconciliation_id").notNull().references(() => reconciliations.id, { onDelete: "cascade" }),
  bankTransactionId: uuid("bank_transaction_id").notNull().references(() => bankTransactions.id),
  journalEntryLineId: uuid("journal_entry_line_id"),
  status: reconItemStatusEnum("status").notNull().default("pending"),
  matchedAmount: numeric("matched_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  ...timestamps
}, (t) => [
  index("recon_items_recon").on(t.reconciliationId),
  index("recon_items_tx").on(t.bankTransactionId)
])

export const reconciliationItemsRelations = relations(reconciliationItems, ({ one }) => ({
  reconciliation: one(reconciliations, { fields: [reconciliationItems.reconciliationId], references: [reconciliations.id] }),
  bankTransaction: one(bankTransactions, { fields: [reconciliationItems.bankTransactionId], references: [bankTransactions.id] })
}))
