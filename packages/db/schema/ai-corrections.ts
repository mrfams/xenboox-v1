import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { users } from "./auth";

// ─── ENUMS ──────────────────────────────────────────────────────────────

export const correctionTypeEnum = pgEnum("correction_type", [
  "categorization", // AI categorized a transaction wrong
  "amount", // AI extracted wrong amount
  "vendor", // AI matched wrong vendor/supplier
  "account", // AI posted to wrong GL account
  "tax", // AI applied wrong tax code
  "duplicate", // AI flagged a false duplicate
  "description", // AI generated wrong description
]);

export const correctionStatusEnum = pgEnum("correction_status", [
  "pending", // Awaiting review
  "accepted", // User accepted the correction
  "rejected", // User rejected the correction
  "applied", // Correction applied to the record
]);

// ─── AI CORRECTIONS ───────────────────────────────────────────────────

export const aiCorrections = pgTable(
  "ai_corrections",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),

    // What was the AI's original decision
    agentName: text("agent_name").notNull(), // e.g. "expense-agent", "document-agent"
    taskType: text("task_type").notNull(), // e.g. "categorize_expense", "extract_invoice"
    originalDecision: jsonb("original_decision")
      .notNull()
      .$type<Record<string, unknown>>(), // What the AI decided
    originalConfidence: numeric("original_confidence", {
      precision: 3,
      scale: 2,
    }), // AI's confidence at time of decision

    // What the user corrected it to
    correctedDecision: jsonb("corrected_decision")
      .notNull()
      .$type<Record<string, unknown>>(), // What the user says it should be
    correctionType: correctionTypeEnum("correction_type").notNull(),

    // Status
    status: correctionStatusEnum("status").notNull().default("pending"),

    // Reference to the entity that was corrected
    referenceEntityType: text("reference_entity_type"), // e.g. "transaction", "invoice", "journal_entry"
    referenceEntityId: uuid("reference_entity_id"), // ID of the corrected record

    // Learning metadata
    patternKey: text("pattern_key"), // Normalized key for pattern matching (e.g. "uber|transportation")
    timesSeen: integer("times_seen").notNull().default(1), // How many times this pattern has been corrected
    learned: boolean("learned").notNull().default(false), // Has the agent incorporated this learning

    // Who corrected
    correctedBy: uuid("corrected_by").references(() => users.id),

    // Audit
    notes: text("notes"), // Optional user notes about the correction
    ...timestamps,
  },
  (t) => [
    index("ai_corrections_entity").on(t.entityId),
    index("ai_corrections_agent").on(t.entityId, t.agentName),
    index("ai_corrections_status").on(t.entityId, t.status),
    index("ai_corrections_type").on(t.correctionType),
    index("ai_corrections_pattern").on(t.entityId, t.patternKey),
    index("ai_corrections_reference").on(
      t.referenceEntityType,
      t.referenceEntityId,
    ),
  ],
);

export const aiCorrectionsRelations = relations(aiCorrections, ({ one }) => ({
  entity: one(entities, {
    fields: [aiCorrections.entityId],
    references: [entities.id],
  }),
  correctedByUser: one(users, {
    fields: [aiCorrections.correctedBy],
    references: [users.id],
  }),
}));
