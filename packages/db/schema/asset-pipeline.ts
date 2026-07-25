// ─── Asset Pipeline Schema ───────────────────────────────────────────────────
//
// Tracks autonomous asset management pipeline runs: depreciation calculation,
// physical verifications, disposals, and lifecycle events.
//
// Tables:
//   asset_pipeline_runs     — Pipeline execution tracking per entity per period
//   asset_verifications     — Physical verification records and schedule
//   asset_disposal_records  — Detailed disposal records beyond what fixedAssets has
//
// Feeds: Autonomous Close Pipeline (depreciation entries), Analytics Pipeline
// Depends on: fixed-assets schema, accounting rules (calculateDepreciation)

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities } from "./organization";
import { fixedAssets } from "./fixed-assets";
import { fiscalPeriods } from "./accounting";

// ─── Asset Pipeline Runs ─────────────────────────────────────────────────────
//
// Tracks each pipeline execution: what was calculated, what was posted,
// what was flagged. One run per entity per period.

export const assetPipelineRuns = pgTable(
  "asset_pipeline_runs",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    status: text("status").notNull().default("pending"),
    // "pending" | "scanning" | "calculating" | "posting" | "reviewing" | "completed" | "failed"
    totalAssets: numeric("total_assets", { precision: 6, scale: 0 })
      .notNull()
      .default("0"),
    assetsScanned: numeric("assets_scanned", { precision: 6, scale: 0 })
      .notNull()
      .default("0"),
    depreciationCount: numeric("depreciation_count", { precision: 6, scale: 0 })
      .notNull()
      .default("0"),
    depreciationTotal: numeric("depreciation_total", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    verificationDue: numeric("verification_due", { precision: 4, scale: 0 })
      .notNull()
      .default("0"),
    disposalFlags: numeric("disposal_flags", { precision: 4, scale: 0 })
      .notNull()
      .default("0"),
    journalEntryId: uuid("journal_entry_id"),
    // Batch journal entry ID for all depreciation postings
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    errors: jsonb("errors").$type<string[]>().default([]),
    warnings: jsonb("warnings").$type<string[]>().default([]),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    triggeredBy: text("triggered_by").notNull().default("manual"),
    // "manual" | "scheduled" | "close_pipeline" | "agent"
    ...timestamps,
  },
  (t) => [
    index("asset_pipeline_entity").on(t.entityId),
    index("asset_pipeline_period").on(t.entityId, t.period),
    index("asset_pipeline_status").on(t.entityId, t.status),
  ],
);

// ─── Asset Verifications ─────────────────────────────────────────────────────
//
// Physical verification records. Assets should be physically verified on a
// periodic basis (e.g., annually for high-value, biennially for standard).

export const assetVerifications = pgTable(
  "asset_verifications",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    fixedAssetId: uuid("fixed_asset_id")
      .notNull()
      .references(() => fixedAssets.id, { onDelete: "cascade" }),
    scheduledDate: timestamp("scheduled_date").notNull(),
    verifiedDate: timestamp("verified_date"),
    verifiedBy: text("verified_by"),
    status: text("status").notNull().default("pending"),
    // "pending" | "in_progress" | "verified" | "discrepancy_found" | "overdue"
    conditionConfirmed: text("condition_confirmed"),
    locationConfirmed: text("location_confirmed"),
    responsiblePersonConfirmed: text("responsible_person_confirmed"),
    photoRef: text("photo_ref"), // Document/R2 reference
    notes: text("notes"),
    discrepancyNotes: text("discrepancy_notes"),
    ...timestamps,
  },
  (t) => [
    index("asset_verif_entity").on(t.entityId),
    index("asset_verif_asset").on(t.fixedAssetId),
    index("asset_verif_status").on(t.entityId, t.status),
    index("asset_verif_scheduled").on(t.entityId, t.scheduledDate),
  ],
);

export const assetVerificationsRelations = relations(
  assetVerifications,
  ({ one }) => ({
    entity: one(entities, {
      fields: [assetVerifications.entityId],
      references: [entities.id],
    }),
    fixedAsset: one(fixedAssets, {
      fields: [assetVerifications.fixedAssetId],
      references: [fixedAssets.id],
    }),
  }),
);

// ─── Asset Disposal Records ──────────────────────────────────────────────────
//
// Enhanced disposal tracking beyond what fixedAssets.disposal* fields hold.
// Captures approval chain, gain/loss calculation, and journal posting.

export const assetDisposalRecords = pgTable(
  "asset_disposal_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    fixedAssetId: uuid("fixed_asset_id")
      .notNull()
      .references(() => fixedAssets.id, { onDelete: "cascade" }),
    disposalDate: text("disposal_date").notNull(),
    disposalMethod: text("disposal_method").notNull(),
    // "sold" | "scrapped" | "donated" | "written_off"
    disposalProceeds: numeric("disposal_proceeds", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netBookValueAtDisposal: numeric("net_book_value_at_disposal", {
      precision: 15,
      scale: 2,
    }).notNull(),
    gainOrLoss: numeric("gain_or_loss", { precision: 15, scale: 2 }).notNull(),
    // positive = gain, negative = loss
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    journalEntryId: uuid("journal_entry_id"),
    reason: text("reason"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("asset_disposal_entity").on(t.entityId),
    index("asset_disposal_asset").on(t.fixedAssetId),
  ],
);

export const assetDisposalRecordsRelations = relations(
  assetDisposalRecords,
  ({ one }) => ({
    entity: one(entities, {
      fields: [assetDisposalRecords.entityId],
      references: [entities.id],
    }),
    fixedAsset: one(fixedAssets, {
      fields: [assetDisposalRecords.fixedAssetId],
      references: [fixedAssets.id],
    }),
  }),
);
