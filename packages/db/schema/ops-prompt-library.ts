// ─── Prompt Library Schema ──────────────────────────────────────────────────
//
// Platform-level prompt management for the admin Prompt Library page.
// NOT entity-scoped — these are global platform prompts.
// Tables:
//   ops_prompts             — Prompt registry with versions and metadata
//   ops_prompt_versions     — Version history for each prompt
//   ops_prompt_usage        — Usage tracking per prompt

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const promptStatusEnum = pgEnum("prompt_status", [
  "active",
  "draft",
  "deprecated",
]);

// ─── Prompts ────────────────────────────────────────────────────────────────
// Prompt registry with versions and metadata.

export const opsPrompts = pgTable(
  "ops_prompts",
  {
    id: uuidId(),
    promptId: text("prompt_id").notNull().unique(), // e.g. pr_01H7X822Y3A4BC5D6E7F8G9H0
    name: text("name").notNull(),
    description: text("description"),
    agentName: text("agent_name").notNull(),
    model: text("model").notNull(),
    version: text("version").notNull().default("1.0.0"),
    status: promptStatusEnum("status").notNull().default("active"),
    successRate: numeric("success_rate", { precision: 5, scale: 1 })
      .notNull()
      .default("0"),
    totalUsage: integer("total_usage").notNull().default(0),
    isFavorite: boolean("is_favorite").notNull().default(false),
    promptContent: text("prompt_content"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("ops_prompts_status").on(t.status),
    index("ops_prompts_agent").on(t.agentName),
    index("ops_prompts_model").on(t.model),
    index("ops_prompts_favorite").on(t.isFavorite),
  ],
);

// ─── Prompt Versions ────────────────────────────────────────────────────────
// Version history for each prompt.

export const opsPromptVersions = pgTable(
  "ops_prompt_versions",
  {
    id: uuidId(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => opsPrompts.promptId),
    version: text("version").notNull(),
    promptContent: text("prompt_content").notNull(),
    changelog: text("changelog"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ops_prompt_versions_unique").on(t.promptId, t.version),
    index("ops_prompt_versions_prompt").on(t.promptId),
  ],
);

// ─── Prompt Usage ───────────────────────────────────────────────────────────
// Usage tracking per prompt.

export const opsPromptUsage = pgTable(
  "ops_prompt_usage",
  {
    id: uuidId(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => opsPrompts.promptId),
    date: text("date").notNull(), // YYYY-MM-DD
    usageCount: integer("usage_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_prompt_usage_daily").on(t.promptId, t.date),
    index("ops_prompt_usage_date").on(t.date),
  ],
);
