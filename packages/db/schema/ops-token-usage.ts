// ─── Token Usage Dashboard Schema ───────────────────────────────────────────
//
// Platform-level token consumption tracking for the admin Token Usage page.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_token_daily         — Daily token consumption metrics
//   ops_token_by_model      — Token breakdown by model
//   ops_token_by_org        — Token breakdown by organization
//   ops_token_by_agent      — Token breakdown by agent
//   ops_token_by_context    — Token usage by context window bucket
//   ops_token_insights      — Token usage insights

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Token Daily ────────────────────────────────────────────────────────────
// Daily token consumption metrics.

export const opsTokenDaily = pgTable(
  "ops_token_daily",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    inputTokens: numeric("input_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    outputTokens: numeric("output_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalRuns: integer("total_runs").notNull().default(0),
    avgTokensPerRun: integer("avg_tokens_per_run").notNull().default(0),
    avgContextWindowUsed: numeric("avg_context_window_used", {
      precision: 5,
      scale: 1,
    })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_token_daily_date").on(t.date),
    index("ops_token_daily_created").on(t.createdAt),
  ],
);

// ─── Token by Model ─────────────────────────────────────────────────────────
// Token breakdown by model.

export const opsTokenByModel = pgTable(
  "ops_token_by_model",
  {
    id: uuidId(),
    date: text("date").notNull(),
    modelName: text("model_name").notNull(),
    provider: text("provider").notNull(),
    runs: integer("runs").notNull().default(0),
    inputTokens: numeric("input_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    outputTokens: numeric("output_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    avgTokensPerRun: integer("avg_tokens_per_run").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_token_model_daily").on(t.date, t.modelName),
    index("ops_token_model_date").on(t.date),
    index("ops_token_model_name").on(t.modelName),
  ],
);

// ─── Token by Organization ──────────────────────────────────────────────────
// Token breakdown by organization.

export const opsTokenByOrg = pgTable(
  "ops_token_by_org",
  {
    id: uuidId(),
    date: text("date").notNull(),
    organizationId: uuid("organization_id"),
    organizationName: text("organization_name").notNull(),
    runs: integer("runs").notNull().default(0),
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_token_org_daily").on(t.date, t.organizationId),
    index("ops_token_org_date").on(t.date),
  ],
);

// ─── Token by Agent ─────────────────────────────────────────────────────────
// Token breakdown by agent.

export const opsTokenByAgent = pgTable(
  "ops_token_by_agent",
  {
    id: uuidId(),
    date: text("date").notNull(),
    agentName: text("agent_name").notNull(),
    runs: integer("runs").notNull().default(0),
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_token_agent_daily").on(t.date, t.agentName),
    index("ops_token_agent_date").on(t.date),
  ],
);

// ─── Token by Context Window ────────────────────────────────────────────────
// Token usage by context window bucket.

export const opsTokenByContext = pgTable(
  "ops_token_by_context",
  {
    id: uuidId(),
    date: text("date").notNull(),
    bucket: text("bucket").notNull(), // "0-25%", "25-50%", "50-75%", "75-100%"
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    requests: integer("requests").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_token_context_daily").on(t.date, t.bucket),
    index("ops_token_context_date").on(t.date),
  ],
);

// ─── Token Insights ─────────────────────────────────────────────────────────
// Token usage insights.

export const opsTokenInsights = pgTable(
  "ops_token_insights",
  {
    id: uuidId(),
    insightType: text("insight_type").notNull(),
    // "increase", "decrease", "attention", "info"
    title: text("title").notNull(),
    description: text("description").notNull(),
    badge: text("badge"), // "Increase", "Attention", "Info"
    priority: integer("priority").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("ops_token_insights_type").on(t.insightType),
    index("ops_token_insights_priority").on(t.priority),
  ],
);
