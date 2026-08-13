import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { organizations } from "./organization";

// Enums
export const reviewItemTypeEnum = pgEnum("review_item_type", [
  "data_validation",
  "entity_resolution",
  "duplicate_detection",
  "compliance",
  "missing_data",
  "approval",
  "anomaly",
  "review",
  "configuration",
]);

export const reviewItemPriorityEnum = pgEnum("review_item_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const reviewItemStatusEnum = pgEnum("review_item_status", [
  "pending",
  "in_progress",
  "escalated",
  "resolved",
  "dismissed",
]);

export const reviewItemActionEnum = pgEnum("review_item_action", [
  "approve_match",
  "create_new_record",
  "request_more_info",
  "escalate",
  "dismiss",
  "assign",
]);

// Review Items (main queue)
export const reviewItems = pgTable("review_items", {
  id: uuidId(),
  ...timestamps,

  // Item details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: reviewItemTypeEnum("type").notNull(),

  // Classification
  priority: reviewItemPriorityEnum("priority").notNull().default("medium"),
  status: reviewItemStatusEnum("status").notNull().default("pending"),

  // Relationships
  organizationId: uuid("organization_id").references(() => organizations.id),
  agentId: varchar("agent_id", { length: 255 }),
  runId: varchar("run_id", { length: 255 }),

  // Assignment
  assignedTo: varchar("assigned_to", { length: 255 }),

  // SLA tracking
  slaDeadline: timestamp("sla_deadline"),
  slaBreached: boolean("sla_breached").default(false),

  // AI recommendation
  aiRecommendation: text("ai_recommendation"),
  aiReasoningUrl: varchar("ai_reasoning_url", { length: 1000 }),

  // Context data (JSON for flexible data)
  contextData: text("context_data"), // JSON string
});

// Review Item Actions (what actions have been taken)
export const reviewItemActions = pgTable("review_item_actions", {
  id: uuidId(),
  ...timestamps,

  reviewItemId: uuid("review_item_id")
    .references(() => reviewItems.id)
    .notNull(),
  action: reviewItemActionEnum("action").notNull(),
  performedBy: varchar("performed_by", { length: 255 }).notNull(),
  notes: text("notes"),
  metadata: text("metadata"), // JSON string for action-specific data
});

// Review Item History (audit trail)
export const reviewItemHistory = pgTable("review_item_history", {
  id: uuidId(),
  ...timestamps,

  reviewItemId: uuid("review_item_id")
    .references(() => reviewItems.id)
    .notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  description: text("description"),
  performedBy: varchar("performed_by", { length: 255 }),
  metadata: text("metadata"), // JSON string
});

// Review Item Evidence (evidence attached to items)
export const reviewItemEvidence = pgTable("review_item_evidence", {
  id: uuidId(),
  ...timestamps,

  reviewItemId: uuid("review_item_id")
    .references(() => reviewItems.id)
    .notNull(),
  evidenceType: varchar("evidence_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  fileUrl: varchar("file_url", { length: 1000 }),
  metadata: text("metadata"), // JSON string
});
