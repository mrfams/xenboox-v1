import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { uuidId, entityId, timestamps } from "./helpers"
import { entities } from "./organization"
import { journalEntries } from "./accounting"

// ─── ENUMS ───────────────────────────────────────

export const mobileMoneyProviderEnum = pgEnum("mobile_money_provider", [
  "modempay", "afrimoney", "qmoney", "mpesa", "wave"
])

export const mmTxTypeEnum = pgEnum("mm_tx_type", [
  "collection", "disbursement", "transfer", "refund"
])

export const mmTxStatusEnum = pgEnum("mm_tx_status", [
  "pending", "successful", "failed", "reversed", "timeout"
])

// ─── MOBILE MONEY ACCOUNTS ───────────────────────

export const mobileMoneyAccounts = pgTable("mobile_money_accounts", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  provider: mobileMoneyProviderEnum("provider").notNull(),
  accountName: text("account_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  accountNumber: text("account_number"),
  currentBalance: numeric("current_balance", { precision: 15, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("GMD"),
  isActive: boolean("is_active").notNull().default(true),
  webhookSecret: text("webhook_secret"),
  settings: jsonb("settings").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("mm_accounts_entity").on(t.entityId),
  index("mm_accounts_provider").on(t.entityId, t.provider)
])

export const mobileMoneyAccountsRelations = relations(mobileMoneyAccounts, ({ one, many }) => ({
  entity: one(entities, { fields: [mobileMoneyAccounts.entityId], references: [entities.id] }),
  transactions: many(mobileMoneyTransactions)
}))

// ─── MOBILE MONEY TRANSACTIONS ───────────────────

export const mobileMoneyTransactions = pgTable("mobile_money_transactions", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  mobileMoneyAccountId: uuid("mobile_money_account_id").notNull().references(() => mobileMoneyAccounts.id, { onDelete: "cascade" }),
  providerTxId: text("provider_tx_id"),
  type: mmTxTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 15, scale: 2 }).default("0"),
  netAmount: numeric("net_amount", { precision: 15, scale: 2 }).notNull(),
  counterparty: text("counterparty"),
  counterpartyName: text("counterparty_name"),
  description: text("description"),
  status: mmTxStatusEnum("status").notNull().default("pending"),
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  webhookPayload: jsonb("webhook_payload").$type<Record<string, unknown>>(),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("mm_tx_entity").on(t.entityId),
  index("mm_tx_account").on(t.mobileMoneyAccountId),
  index("mm_tx_provider_id").on(t.providerTxId),
  index("mm_tx_status").on(t.entityId, t.status),
  index("mm_tx_date").on(t.entityId, t.initiatedAt)
])

export const mobileMoneyTransactionsRelations = relations(mobileMoneyTransactions, ({ one }) => ({
  entity: one(entities, { fields: [mobileMoneyTransactions.entityId], references: [entities.id] }),
  mobileMoneyAccount: one(mobileMoneyAccounts, { fields: [mobileMoneyTransactions.mobileMoneyAccountId], references: [mobileMoneyAccounts.id] }),
  journalEntry: one(journalEntries, { fields: [mobileMoneyTransactions.journalEntryId], references: [journalEntries.id] })
}))
