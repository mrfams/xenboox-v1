import { pgTable, uuid, text, numeric, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { uuidId, entityId, timestamps } from "./helpers"
import { entities } from "./organization"
import { chartOfAccounts, journalEntries, fiscalPeriods } from "./accounting"

// ─── ENUMS ───────────────────────────────────────

export const assetStatusEnum = pgEnum("asset_status", [
  "active", "disposed", "fully_depreciated", "under_maintenance"
])

export const depreciationMethodEnum = pgEnum("depreciation_method", [
  "straight_line", "reducing_balance", "units_of_production"
])

export const disposalMethodEnum = pgEnum("disposal_method", [
  "sold", "scrapped", "donated", "written_off"
])

// ─── FIXED ASSETS ─────────────────────────────────

export const fixedAssets = pgTable("fixed_assets", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  assetClass: text("asset_class").notNull(), // e.g. "building", "vehicle", "equipment", "furniture"
  location: text("location"),
  purchaseDate: text("purchase_date").notNull(),
  cost: numeric("cost", { precision: 15, scale: 2 }).notNull(),
  salvageValue: numeric("salvage_value", { precision: 15, scale: 2 }).notNull().default("0"),
  usefulLifeMonths: integer("useful_life_months").notNull(),
  depreciationMethod: depreciationMethodEnum("depreciation_method").notNull().default("straight_line"),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).notNull().default("0"),
  netBookValue: numeric("net_book_value", { precision: 15, scale: 2 }).notNull(),
  status: assetStatusEnum("status").notNull().default("active"),
  glAccountId: uuid("gl_account_id").references(() => chartOfAccounts.id),
  accumulatedDepreciationAccountId: uuid("accumulated_depreciation_account_id").references(() => chartOfAccounts.id),
  responsiblePerson: text("responsible_person"),
  condition: text("condition"), // e.g. "excellent", "good", "fair", "poor"
  disposalDate: text("disposal_date"),
  disposalMethod: disposalMethodEnum("disposal_method"),
  disposalProceeds: numeric("disposal_proceeds", { precision: 15, scale: 2 }),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps
}, (t) => [
  index("fixed_assets_entity").on(t.entityId),
  index("fixed_assets_class").on(t.entityId, t.assetClass),
  index("fixed_assets_status").on(t.entityId, t.status)
])

export const fixedAssetsRelations = relations(fixedAssets, ({ one, many }) => ({
  entity: one(entities, { fields: [fixedAssets.entityId], references: [entities.id] }),
  glAccount: one(chartOfAccounts, { fields: [fixedAssets.glAccountId], references: [chartOfAccounts.id] }),
  accumulatedDepreciationAccount: one(chartOfAccounts, { fields: [fixedAssets.accumulatedDepreciationAccountId], references: [chartOfAccounts.id] }),
  depreciationSchedule: many(depreciationSchedule)
}))

// ─── DEPRECIATION SCHEDULE ───────────────────────

export const depreciationSchedule = pgTable("depreciation_schedule", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
  fixedAssetId: uuid("fixed_asset_id").notNull().references(() => fixedAssets.id, { onDelete: "cascade" }),
  periodId: uuid("period_id").references(() => fiscalPeriods.id),
  depreciationAmount: numeric("depreciation_amount", { precision: 15, scale: 2 }).notNull(),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 15, scale: 2 }).notNull(),
  netBookValue: numeric("net_book_value", { precision: 15, scale: 2 }).notNull(),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  calculatedBy: text("calculated_by"), // "agent" or "manual"
  ...timestamps
}, (t) => [
  index("depr_sched_entity").on(t.entityId),
  index("depr_sched_asset").on(t.fixedAssetId),
  index("depr_sched_period").on(t.periodId)
])

export const depreciationScheduleRelations = relations(depreciationSchedule, ({ one }) => ({
  entity: one(entities, { fields: [depreciationSchedule.entityId], references: [entities.id] }),
  fixedAsset: one(fixedAssets, { fields: [depreciationSchedule.fixedAssetId], references: [fixedAssets.id] }),
  period: one(fiscalPeriods, { fields: [depreciationSchedule.periodId], references: [fiscalPeriods.id] }),
  journalEntry: one(journalEntries, { fields: [depreciationSchedule.journalEntryId], references: [journalEntries.id] })
}))

// Need to import jsonb at the top
import { jsonb } from "drizzle-orm/pg-core"
