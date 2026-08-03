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

// Enums
export const automationStatusEnum = pgEnum("automation_status", [
  "running",
  "paused",
  "stopped",
  "error",
]);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "schedule",
  "event",
  "webhook",
  "manual",
]);

// Automations
export const automations = pgTable("automations", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: automationStatusEnum("status").notNull().default("running"),

  // Trigger
  triggerType: automationTriggerEnum("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>(),
  triggerSchedule: varchar("trigger_schedule", { length: 255 }), // e.g., "Every day at 2:00 AM"

  // Stats
  lastRunAt: timestamp("last_run_at"),
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  aiConfidence: integer("ai_confidence"),

  // Performance
  tasksAutomated: integer("tasks_automated").notNull().default(0),
  timeSavedMinutes: integer("time_saved_minutes").notNull().default(0),

  // Configuration
  config: jsonb("config").$type<Record<string, unknown>>(),

  // Category
  category: varchar("category", { length: 100 }),

  // Is template
  isTemplate: boolean("is_template").default(false),
  templateTag: varchar("template_tag", { length: 50 }), // popular, new, etc.
});

// Automation Templates
export const automationTemplates = pgTable("automation_templates", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),

  // Template data
  templateData: jsonb("template_data").$type<Record<string, unknown>>(),

  // Stats
  usageCount: integer("usage_count").notNull().default(0),
  tag: varchar("tag", { length: 50 }), // popular, new, etc.

  // Icon
  icon: varchar("icon", { length: 100 }),
  iconColor: varchar("icon_color", { length: 50 }),
  iconBg: varchar("icon_bg", { length: 50 }),
});

// Automation Activity
export const automationActivity = pgTable("automation_activity", {
  id: uuidId(),
  ...timestamps,

  automationId: varchar("automation_id", { length: 255 }).references(
    () => automations.id,
  ),
  automationName: varchar("automation_name", { length: 255 }).notNull(),

  // Activity details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),

  // Status
  status: varchar("status", { length: 50 }).notNull(), // success, error, running

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Automation Performance
export const automationPerformance = pgTable("automation_performance", {
  id: uuidId(),
  ...timestamps,

  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM

  // Stats
  totalTasks: integer("total_tasks").notNull().default(0),
  successfulTasks: integer("successful_tasks").notNull().default(0),
  reviewRequiredTasks: integer("review_required_tasks").notNull().default(0),
  failedTasks: integer("failed_tasks").notNull().default(0),
  skippedTasks: integer("skipped_tasks").notNull().default(0),

  // Time saved
  totalTimeSavedMinutes: integer("total_time_saved_minutes")
    .notNull()
    .default(0),

  // Cost savings
  costSavingsAmount: numeric("cost_savings_amount", {
    precision: 15,
    scale: 2,
  }),
  costSavingsCurrency: varchar("cost_savings_currency", { length: 10 }).default(
    "GMD",
  ),
});

// Top Time Saving Automations
export const automationTimeSavings = pgTable("automation_time_savings", {
  id: uuidId(),
  ...timestamps,

  automationId: varchar("automation_id", { length: 255 }).references(
    () => automations.id,
  ),
  automationName: varchar("automation_name", { length: 255 }).notNull(),

  // Time saved
  timeSavedHours: numeric("time_saved_hours", {
    precision: 5,
    scale: 1,
  }).notNull(),

  // Rank
  rank: integer("rank").notNull(),
});
