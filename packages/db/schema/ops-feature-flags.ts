import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { organizations } from "./organization";

// Enums
export const flagTypeEnum = pgEnum("flag_type", [
  "release",
  "experiment",
  "ops",
  "internal",
]);

export const flagStatusEnum = pgEnum("flag_status", [
  "on",
  "off",
  "scheduled",
  "archived",
]);

// Feature Flags (main table)
export const featureFlags = pgTable("feature_flags", {
  id: uuidId(),
  ...timestamps,

  // Flag details
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  description: text("description"),

  // Type and status
  type: flagTypeEnum("type").notNull().default("release"),
  status: flagStatusEnum("status").notNull().default("off"),

  // Environments
  environments: jsonb("environments")
    .$type<string[]>()
    .default(["prod", "stg", "dev"]),

  // Rollout
  rolloutPercent: integer("rollout_percent").notNull().default(0),
  targetingRules: jsonb("targeting_rules").$type<Record<string, unknown>>(),

  // Owner
  ownerName: varchar("owner_name", { length: 255 }),
  ownerAvatar: varchar("owner_avatar", { length: 500 }),

  // Tags
  tags: jsonb("tags").$type<string[]>().default([]),

  // Scheduling
  scheduledAt: timestamp("scheduled_at"),

  // Remote config
  remoteConfig: jsonb("remote_config").$type<Record<string, unknown>>(),

  // Evaluation stats
  totalEvaluations: integer("total_evaluations").notNull().default(0),
  trueEvaluations: integer("true_evaluations").notNull().default(0),
  falseEvaluations: integer("false_evaluations").notNull().default(0),
});

// Feature Flag Audit Log
export const featureFlagAuditLog = pgTable("feature_flag_audit_log", {
  id: uuidId(),
  ...timestamps,

  flagId: varchar("flag_id", { length: 255 })
    .references(() => featureFlags.id)
    .notNull(),

  action: varchar("action", { length: 100 }).notNull(), // created, updated, enabled, disabled, deleted, etc.
  performedBy: varchar("performed_by", { length: 255 }),

  // Change details
  field: varchar("field", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Feature Flag Rollout History
export const featureFlagRolloutHistory = pgTable(
  "feature_flag_rollout_history",
  {
    id: uuidId(),
    ...timestamps,

    flagId: varchar("flag_id", { length: 255 })
      .references(() => featureFlags.id)
      .notNull(),

    rolloutPercent: integer("rollout_percent").notNull(),
    changedBy: varchar("changed_by", { length: 255 }),
  },
);
