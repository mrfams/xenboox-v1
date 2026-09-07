// ─── Data Retention Schema ─────────────────────────────────────────────────
//
// Automated data retention: per-entity policies define how long rows are
// kept in each table. A Trigger.dev job scans and purges expired rows,
// respecting legal holds. Purge history is logged for audit trail.
//
// Tables:
//   retention_policies  — entity-level config for per-table retention
//   retention_purge_logs — immutable log of every purge operation

import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── Retention Policies ────────────────────────────────────────────────────

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: uuidId(),
    ...timestamps,

    // Entity scoping — each entity has its own retention config
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),

    // Which table this policy applies to (schema-qualified name)
    tableName: varchar("table_name", { length: 255 }).notNull(),

    // How many days to keep rows after their created_at
    retentionDays: integer("retention_days").notNull().default(90),

    // When true, the purge job skips this table entirely (legal hold)
    legalHold: boolean("legal_hold").notNull().default(false),

    // When true, this policy is active and will be enforced
    enabled: boolean("enabled").notNull().default(true),

    // Optional: columns to check instead of created_at (e.g. updated_at for
    // soft-deleted rows). Null means use created_at.
    retentionColumn: varchar("retention_column", { length: 100 }),

    // Optional: WHERE clause to exclude rows from purging (e.g. rows
    // referenced by active records). Only basic SQL — validated against a
    // whitelist of safe patterns at insert/update time.
    exclusionWhere: text("exclusion_where"),

    // Metadata
    description: text("description"),
    createdBy: text("created_by"),
  },
  (t) => [
    index("retention_policies_entity_id").on(t.entityId),
    index("retention_policies_table_name").on(t.tableName),
    index("retention_policies_entity_table").on(t.entityId, t.tableName),
  ],
);

// ─── Purge Logs (immutable audit trail) ────────────────────────────────────

export const retentionPurgeLogs = pgTable(
  "retention_purge_logs",
  {
    id: uuidId(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    entityId: text("entity_id").notNull(),
    policyId: text("policy_id").notNull(),
    tableName: varchar("table_name", { length: 255 }).notNull(),

    // How many rows were purged in this batch
    rowsPurged: integer("rows_purged").notNull().default(0),

    // Cutoff date used for the purge (rows older than this were deleted)
    cutoffDate: timestamp("cutoff_date", { withTimezone: true }).notNull(),

    // Execution details
    durationMs: integer("duration_ms"),
    status: varchar("status", { length: 20 }).notNull().default("success"),
    error: text("error"),

    // Context
    triggeredBy: varchar("triggered_by", { length: 50 })
      .notNull()
      .default("cron"),
    runId: varchar("run_id", { length: 100 }),

    // Summary of what was purged (JSON metadata for debugging)
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("retention_purge_logs_entity_id").on(t.entityId),
    index("retention_purge_logs_policy_id").on(t.policyId),
    index("retention_purge_logs_status").on(t.status),
    index("retention_purge_logs_created_at").on(t.createdAt),
  ],
);
