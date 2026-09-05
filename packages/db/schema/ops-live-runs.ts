// ─── Live Agent Runs Schema ─────────────────────────────────────────────────
//
// Platform-level live agent run tracking for the admin Live Agent Runs page.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_live_runs           — Individual live agent run records
//   ops_live_run_steps      — Step-by-step progress for each run
//   ops_live_run_events     — Event log for each run

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
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const liveRunStatusEnum = pgEnum("live_run_status", [
  "queued",
  "in_progress",
  "waiting",
  "completed",
  "failed",
  "cancelled",
]);

export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "skipped",
]);

// ─── Live Runs ──────────────────────────────────────────────────────────────
// Individual live agent run records. Updated in real-time.

export const opsLiveRuns = pgTable(
  "ops_live_runs",
  {
    id: uuidId(),
    runId: text("run_id").notNull().unique(), // e.g. RUN-3F8T7A
    agentName: text("agent_name").notNull(),
    agentDisplayName: text("agent_display_name").notNull(),
    agentCategory: text("agent_category").notNull(),
    organizationName: text("organization_name"),
    organizationId: uuid("organization_id"),
    // Entity scoping (§8.2): every run belongs to exactly one tenant entity.
    // Required for per-entity execution history + cost tracking; the
    // organization columns above are denormalized display fields.
    entityId: uuid("entity_id").notNull(),
    // Task-as-session (§toAINative): the chat conversation this run belongs
    // to. Nullable so pre-link rows and non-chat runs keep working; new chat
    // turns always write it so a task click can reload its thread inline.
    conversationId: text("conversation_id"),
    status: liveRunStatusEnum("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0), // 0-100
    currentStep: text("current_step"),
    durationMs: integer("duration_ms").notNull().default(0),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    model: text("model"),
    userId: uuid("user_id"),
    userName: text("user_name"),
    error: text("error"),
    liveOutput: jsonb("live_output").$type<Record<string, unknown>>(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("ops_live_runs_status").on(t.status),
    index("ops_live_runs_agent").on(t.agentName),
    index("ops_live_runs_started").on(t.startedAt),
    index("ops_live_runs_org").on(t.organizationId),
    index("ops_live_runs_entity").on(t.entityId),
    index("ops_live_runs_conversation").on(t.conversationId),
  ],
);

// ─── Live Run Steps ─────────────────────────────────────────────────────────
// Step-by-step progress for each run.

export const opsLiveRunSteps = pgTable(
  "ops_live_run_steps",
  {
    id: uuidId(),
    runId: text("run_id")
      .notNull()
      .references(() => opsLiveRuns.runId),
    stepNumber: integer("step_number").notNull(),
    name: text("name").notNull(),
    status: stepStatusEnum("status").notNull().default("pending"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    error: text("error"),
    ...timestamps,
  },
  (t) => [
    index("ops_live_run_steps_run").on(t.runId),
    index("ops_live_run_steps_status").on(t.status),
  ],
);

// ─── Live Run Events ────────────────────────────────────────────────────────
// Event log for each run.

export const opsLiveRunEvents = pgTable(
  "ops_live_run_events",
  {
    id: uuidId(),
    runId: text("run_id")
      .notNull()
      .references(() => opsLiveRuns.runId),
    eventType: text("event_type").notNull(),
    // Types: "started", "step_completed", "step_failed", "waiting_input", "completed", "failed"
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ops_live_run_events_run").on(t.runId),
    index("ops_live_run_events_type").on(t.eventType),
    index("ops_live_run_events_created").on(t.createdAt),
  ],
);
