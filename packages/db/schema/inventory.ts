import { pgTable, uuid, text, numeric, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { uuidId, entityId, timestamps } from "./helpers"
import { entities } from "./organization"
import { chartOfAccounts, journalEntries, fiscalPeriods } from "./accounting"

// ─── ENUMS ───────────────────────────────────────

export const inventoryTxTypeEnum = pgEnum("inventory_tx_type", [
  "receipt", "issue", "adjustment", "transfer", "return"
])

export const costMethodEnum = pgEnum("cost_method", [
  "fifo", "lifo", "weighted_average"
])

export const inventoryItemStatusEnum = pgEnum("inventory_item_status", [
  "active", "discontinued", "out_of_stock"
])

// ─── WAREHOUSES ───────────────────────────────────

export const warehouses = pgTable("warehouses", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location"),
  managerName: text("manager_name"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps
}, (t) => [
  index("warehouses_entity").on(t.entityId)
])

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  entity: one(entities, { fields: [warehouses.entityId], references: [entities.id] }),
  transactions: many(inventoryTransactions)
}))

// ─── INVENTORY ITEMS ──────────────────────────────

export const inventoryItems = pgTable("inventory_items", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  category: text("category"), // e.g. "raw_material", "finished_goods", "consumables"
  unitOfMeasure: text("unit_of_measure").notNull().default("piece"), // piece, kg, litre, box, etc.
  costMethod: costMethodEnum("cost_method").notNull().default("weighted_average"),
  standardCost: numeric("standard_cost", { precision: 15, scale: 2 }).default("0"),
  reorderLevel: integer("reorder_level").default(0),
  reorderQuantity: integer("reorder_quantity").default(0),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),
  cogsAccountId: uuid("cogs_account_id").references(() => chartOfAccounts.id),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("inv_items_entity").on(t.entityId),
  index("inv_items_sku").on(t.entityId, t.sku),
  index("inv_items_category").on(t.entityId, t.category)
])

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  entity: one(entities, { fields: [inventoryItems.entityId], references: [entities.id] }),
  glAccount: one(chartOfAccounts, { fields: [inventoryItems.glAccountId], references: [chartOfAccounts.id] }),
  cogsAccount: one(chartOfAccounts, { fields: [inventoryItems.cogsAccountId], references: [chartOfAccounts.id] }),
  transactions: many(inventoryTransactions),
  valuations: many(inventoryValuations)
}))

// ─── INVENTORY TRANSACTIONS ──────────────────────

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  type: inventoryTxTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 15, scale: 2 }).notNull(),
  referenceType: text("reference_type"), // "purchase_order", "sales_invoice", "adjustment", etc.
  referenceId: uuid("reference_id"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  transactionDate: text("transaction_date").notNull(),
  notes: text("notes"),
  ...timestamps
}, (t) => [
  index("inv_tx_entity").on(t.entityId),
  index("inv_tx_item").on(t.inventoryItemId),
  index("inv_tx_warehouse").on(t.warehouseId),
  index("inv_tx_date").on(t.entityId, t.transactionDate),
  index("inv_tx_type").on(t.inventoryItemId, t.type)
])

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  entity: one(entities, { fields: [inventoryTransactions.entityId], references: [entities.id] }),
  inventoryItem: one(inventoryItems, { fields: [inventoryTransactions.inventoryItemId], references: [inventoryItems.id] }),
  warehouse: one(warehouses, { fields: [inventoryTransactions.warehouseId], references: [warehouses.id] }),
  journalEntry: one(journalEntries, { fields: [inventoryTransactions.journalEntryId], references: [journalEntries.id] })
}))

// ─── INVENTORY VALUATIONS ────────────────────────

export const inventoryValuations = pgTable("inventory_valuations", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  periodId: uuid("period_id").references(() => fiscalPeriods.id),
  quantityOnHand: integer("quantity_on_hand").notNull(),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull(),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).notNull(),
  valuationMethod: costMethodEnum("valuation_method").notNull(),
  ...timestamps
}, (t) => [
  index("inv_val_entity").on(t.entityId),
  index("inv_val_item").on(t.inventoryItemId),
  index("inv_val_period").on(t.periodId)
])

export const inventoryValuationsRelations = relations(inventoryValuations, ({ one }) => ({
  entity: one(entities, { fields: [inventoryValuations.entityId], references: [entities.id] }),
  inventoryItem: one(inventoryItems, { fields: [inventoryValuations.inventoryItemId], references: [inventoryItems.id] }),
  period: one(fiscalPeriods, { fields: [inventoryValuations.periodId], references: [fiscalPeriods.id] })
}))

// Need to import jsonb
import { jsonb } from "drizzle-orm/pg-core"
