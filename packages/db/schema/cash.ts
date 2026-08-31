import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { uuidId, entityId, timestamps } from "./helpers"
import { entities } from "./organization"
import { chartOfAccounts, journalEntries } from "./accounting"

// ─── ENUMS ───────────────────────────────────────

export const imprestStatusEnum = pgEnum("imprest_status", [
  "active", "settled", "expired", "cancelled"
])

// ─── CASH ACCOUNTS ───────────────────────────────

export const cashAccounts = pgTable("cash_accounts", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps
}, (t) => [
  index("cash_accounts_entity").on(t.entityId)
])

export const cashAccountsRelations = relations(cashAccounts, ({ one, many }) => ({
  entity: one(entities, { fields: [cashAccounts.entityId], references: [entities.id] }),
  glAccount: one(chartOfAccounts, { fields: [cashAccounts.glAccountId], references: [chartOfAccounts.id] }),
  imprestFloats: many(imprestFloats),
  pettyCashLedger: many(pettyCashLedger)
}))

// ─── IMPREST FLOATS ──────────────────────────────

export const imprestFloats = pgTable("imprest_floats", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  cashAccountId: uuid("cash_account_id").notNull().references(() => cashAccounts.id),
  assigneeName: text("assignee_name").notNull(),
  assigneeUserId: uuid("assignee_user_id"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  remainingBalance: numeric("remaining_balance", { precision: 15, scale: 2 }).notNull(),
  purpose: text("purpose"),
  status: imprestStatusEnum("status").notNull().default("active"),
  issuedDate: text("issued_date").notNull(),
  settleByDate: text("settle_by_date"),
  settledAt: timestamp("settled_at"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  ...timestamps
}, (t) => [
  index("imprest_entity").on(t.entityId),
  index("imprest_cash_account").on(t.cashAccountId),
  index("imprest_status").on(t.entityId, t.status)
])

export const imprestFloatsRelations = relations(imprestFloats, ({ one, many }) => ({
  entity: one(entities, { fields: [imprestFloats.entityId], references: [entities.id] }),
  cashAccount: one(cashAccounts, { fields: [imprestFloats.cashAccountId], references: [cashAccounts.id] }),
  journalEntry: one(journalEntries, { fields: [imprestFloats.journalEntryId], references: [journalEntries.id] }),
  receipts: many(imprestReceipts)
}))

// ─── IMPREST RECEIPTS ────────────────────────────

export const imprestReceipts = pgTable("imprest_receipts", {
  id: uuidId(),
  imprestFloatId: uuid("imprest_float_id").notNull().references(() => imprestFloats.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  receiptDate: text("receipt_date").notNull(),
  documentId: uuid("document_id"),
  ...timestamps
}, (t) => [
  index("imprest_receipts_float").on(t.imprestFloatId)
])

export const imprestReceiptsRelations = relations(imprestReceipts, ({ one }) => ({
  imprestFloat: one(imprestFloats, { fields: [imprestReceipts.imprestFloatId], references: [imprestFloats.id] })
}))

// ─── PETTY CASH LEDGER ───────────────────────────

export const pettyCashLedger = pgTable("petty_cash_ledger", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  cashAccountId: uuid("cash_account_id").notNull().references(() => cashAccounts.id),
  transactionDate: text("transaction_date").notNull(),
  description: text("description").notNull(),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
  category: text("category"),
  reference: text("reference"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  ...timestamps
}, (t) => [
  index("pcl_entity").on(t.entityId),
  index("pcl_cash_account").on(t.cashAccountId),
  index("pcl_date").on(t.entityId, t.transactionDate)
])

export const pettyCashLedgerRelations = relations(pettyCashLedger, ({ one }) => ({
  entity: one(entities, { fields: [pettyCashLedger.entityId], references: [entities.id] }),
  cashAccount: one(cashAccounts, { fields: [pettyCashLedger.cashAccountId], references: [cashAccounts.id] }),
  journalEntry: one(journalEntries, { fields: [pettyCashLedger.journalEntryId], references: [journalEntries.id] })
}))
