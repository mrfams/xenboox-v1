// ─── AI Cost Analytics Schema ───────────────────────────────────────────────
//
// Platform-level AI cost tracking for the admin AI Cost Analytics page.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_cost_daily          — Daily aggregated cost metrics
//   ops_cost_by_model       — Cost breakdown by model
//   ops_cost_by_organization — Cost breakdown by organization
//   ops_cost_drivers        — Top cost drivers
//   ops_cost_optimization   — Cost optimization recommendations

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Cost Daily ─────────────────────────────────────────────────────────────
// Daily aggregated cost metrics. Powers the KPI cards and cost-over-time chart.

export const opsCostDaily = pgTable(
  "ops_cost_daily",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalTokens: numeric("total_tokens", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    totalRequests: integer("total_requests").notNull().default(0),
    costPerMillionTokens: numeric("cost_per_million_tokens", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    avgCostPerRun: numeric("avg_cost_per_run", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    // Cost by provider for stacked area chart
    anthropicCost: numeric("anthropic_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    openaiCost: numeric("openai_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    googleCost: numeric("google_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    azureCost: numeric("azure_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    otherCost: numeric("other_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_cost_daily_date").on(t.date),
    index("ops_cost_daily_created").on(t.createdAt),
  ],
);

// ─── Cost by Model ──────────────────────────────────────────────────────────
// Cost breakdown by model for the "Cost by Model" table.

export const opsCostByModel = pgTable(
  "ops_cost_by_model",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD for daily aggregation
    modelName: text("model_name").notNull(),
    provider: text("provider").notNull(),
    requests: integer("requests").notNull().default(0),
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
    costPerMillionTokens: numeric("cost_per_million_tokens", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_cost_model_daily").on(t.date, t.modelName),
    index("ops_cost_model_date").on(t.date),
    index("ops_cost_model_name").on(t.modelName),
  ],
);

// ─── Cost by Organization ───────────────────────────────────────────────────
// Cost breakdown by organization.

export const opsCostByOrganization = pgTable(
  "ops_cost_by_organization",
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
    uniqueIndex("ops_cost_org_daily").on(t.date, t.organizationId),
    index("ops_cost_org_date").on(t.date),
    index("ops_cost_org_name").on(t.organizationName),
  ],
);

// ─── Cost Drivers ───────────────────────────────────────────────────────────
// Top cost drivers for the "Top Cost Drivers" card.

export const opsCostDrivers = pgTable(
  "ops_cost_drivers",
  {
    id: uuidId(),
    period: text("period").notNull(), // e.g. "7d"
    driverName: text("driver_name").notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 1 })
      .notNull()
      .default("0"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [index("ops_cost_drivers_period").on(t.period)],
);

// ─── Cost Optimization ──────────────────────────────────────────────────────
// Cost optimization recommendations.

export const opsCostOptimization = pgTable(
  "ops_cost_optimization",
  {
    id: uuidId(),
    recommendation: text("recommendation").notNull(),
    potentialSavingsUsd: numeric("potential_savings_usd", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    savingsPeriod: text("savings_period").notNull().default("7d"),
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("ops_cost_optimization_active").on(t.isActive),
    index("ops_cost_optimization_priority").on(t.priority),
  ],
);
