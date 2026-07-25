// ─── Inventory Pipeline Schema ──────────────────────────────────────────────
//
// Pipeline-specific tables for stock counts, GRN, and puchase order tracking.
// Extends the existing inventory schema (inventoryItems, warehouses, transactions).
//
// Tables:
//   inventory_pipeline_runs    — Pipeline execution tracking per entity per period
//   goods_received_notes        — Delivery matching against PO
//   stock_count_records         — Physical count with discrepancy handling
//   stock_count_sessions       — Batch stock count sessions per location
//   inventory_po_items          — Line items from PO for inventory tracking
//
// Rules:
//   - Stock count variance NEVER absorbed into COGS without explicit reason
//   - GRN must reference a PO
//   - Every discrepancy requires a recorded resolution

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
import { inventoryItems, warehouses } from "./inventory";
import { purchaseOrders } from "./ap-ar";

// ─── Inventory Pipeline Runs ────────────────────────────────────────────────

export const inventoryPipelineRuns = pgTable(
  "inventory_pipeline_runs",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    status: text("status").notNull().default("pending"),
    // "pending" | "scanning" | "calculating" | "posting" | "reviewing" | "completed" | "failed"
    totalItems: integer("total_items").notNull().default(0),
    itemsScanned: integer("items_scanned").notNull().default(0),
    lowStockCount: integer("low_stock_count").notNull().default(0),
    cogsAmount: numeric("cogs_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    discrepancyCount: integer("discrepancy_count").notNull().default(0),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    errors: jsonb("errors").$type<string[]>().default([]),
    warnings: jsonb("warnings").$type<string[]>().default([]),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    triggeredBy: text("triggered_by").notNull().default("manual"),
    ...timestamps,
  },
  (t) => [
    index("inv_pipeline_entity").on(t.entityId),
    index("inv_pipeline_period").on(t.entityId, t.period),
    index("inv_pipeline_status").on(t.entityId, t.status),
  ],
);

// ─── Goods Received Notes ───────────────────────────────────────────────────

export const goodsReceivedNotes = pgTable(
  "goods_received_notes",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    poId: uuid("po_id").references(() => purchaseOrders.id),
    receivedDate: text("received_date").notNull(),
    status: text("status").notNull().default("draft"),
    // "draft" | "completed" | "partially_matched" | "verified"
    conditionNotes: text("condition_notes"),
    carrierInfo: text("carrier_info"),
    receivedById: text("received_by_id"),
    verifiedById: text("verified_by_id"),
    verifiedAt: timestamp("verified_at"),
    lineItems: jsonb("line_items").$type<
      Array<{
        inventoryItemId: string;
        sku: string;
        itemName: string;
        orderedQty: number;
        receivedQty: number;
        condition: string;
        unitCost: string;
      }>
    >(),
    ...timestamps,
  },
  (t) => [
    index("grn_entity").on(t.entityId),
    index("grn_po").on(t.poId),
    index("grn_status").on(t.entityId, t.status),
  ],
);

export const goodsReceivedNotesRelations = relations(
  goodsReceivedNotes,
  ({ one }) => ({
    entity: one(entities, {
      fields: [goodsReceivedNotes.entityId],
      references: [entities.id],
    }),
    purchaseOrder: one(purchaseOrders, {
      fields: [goodsReceivedNotes.poId],
      references: [purchaseOrders.id],
    }),
  }),
);

// ─── Stock Count Sessions ───────────────────────────────────────────────────

export const stockCountSessions = pgTable(
  "stock_count_sessions",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    sessionDate: text("session_date").notNull(),
    status: text("status").notNull().default("open"),
    // "open" | "in_progress" | "resolved" | "closed"
    initiatedById: text("initiated_by_id"),
    completedById: text("completed_by_id"),
    completedAt: timestamp("completed_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("scs_entity").on(t.entityId),
    index("scs_warehouse").on(t.warehouseId),
    index("scs_status").on(t.entityId, t.status),
  ],
);

export const stockCountSessionsRelations = relations(
  stockCountSessions,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [stockCountSessions.entityId],
      references: [entities.id],
    }),
    warehouse: one(warehouses, {
      fields: [stockCountSessions.warehouseId],
      references: [warehouses.id],
    }),
    records: many(stockCountRecords),
  }),
);

// ─── Stock Count Records ────────────────────────────────────────────────────

export const stockCountRecords = pgTable(
  "stock_count_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => stockCountSessions.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    expectedQty: integer("expected_qty").notNull().default(0),
    countedQty: integer("counted_qty").notNull().default(0),
    variance: integer("variance").notNull().default(0),
    varianceValue: numeric("variance_value", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    reason: text("reason"),
    // NEVER null when variance !== 0 — explicit human-attached reason required
    status: text("status").notNull().default("open"),
    // "open" | "resolved" | "investigating"
    resolvedById: text("resolved_by_id"),
    resolvedAt: timestamp("resolved_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("scr_session").on(t.sessionId),
    index("scr_item").on(t.inventoryItemId),
    index("scr_status").on(t.entityId, t.status),
    index("scr_variance").on(t.entityId, t.variance),
  ],
);

export const stockCountRecordsRelations = relations(
  stockCountRecords,
  ({ one }) => ({
    entity: one(entities, {
      fields: [stockCountRecords.entityId],
      references: [entities.id],
    }),
    session: one(stockCountSessions, {
      fields: [stockCountRecords.sessionId],
      references: [stockCountSessions.id],
    }),
    inventoryItem: one(inventoryItems, {
      fields: [stockCountRecords.inventoryItemId],
      references: [inventoryItems.id],
    }),
    warehouse: one(warehouses, {
      fields: [stockCountRecords.warehouseId],
      references: [warehouses.id],
    }),
  }),
);
