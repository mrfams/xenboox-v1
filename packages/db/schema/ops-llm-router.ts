// ─── LLM Provider & Model Router Schema ─────────────────────────────────────
//
// Platform-level LLM provider and model routing for the admin LLM Router page.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_llm_providers       — LLM provider registry and health status
//   ops_llm_models          — Model registry per provider
//   ops_llm_routing_rules   — Routing rules for request dispatching
//   ops_llm_routing_policies — Named routing policies
//   ops_llm_provider_stats  — Daily aggregated provider statistics
//   ops_llm_recent_changes  — Recent configuration changes

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

export const llmProviderStatusEnum = pgEnum("llm_provider_status", [
  "healthy",
  "degraded",
  "offline",
  "maintenance",
]);

export const llmRoutingPolicyStatusEnum = pgEnum("llm_routing_policy_status", [
  "active",
  "inactive",
  "draft",
]);

// ─── LLM Providers ──────────────────────────────────────────────────────────
// LLM provider registry and health status.

export const opsLlmProviders = pgTable(
  "ops_llm_providers",
  {
    id: uuidId(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    iconUrl: text("icon_url"),
    status: llmProviderStatusEnum("status").notNull().default("healthy"),
    modelCount: integer("model_count").notNull().default(0),
    totalRequests24h: integer("total_requests_24h").notNull().default(0),
    totalTokens24h: numeric("total_tokens_24h", { precision: 15, scale: 0 })
      .notNull()
      .default("0"),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    errorRate: numeric("error_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    costPerMillionTokens: numeric("cost_per_million_tokens", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("ops_llm_providers_status").on(t.status),
    index("ops_llm_providers_active").on(t.isActive),
  ],
);

// ─── LLM Models ─────────────────────────────────────────────────────────────
// Model registry per provider.

export const opsLlmModels = pgTable(
  "ops_llm_models",
  {
    id: uuidId(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => opsLlmProviders.id),
    modelId: text("model_id").notNull(),
    displayName: text("display_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    maxContextTokens: integer("max_context_tokens"),
    costPerMillionInput: numeric("cost_per_million_input", {
      precision: 10,
      scale: 2,
    }),
    costPerMillionOutput: numeric("cost_per_million_output", {
      precision: 10,
      scale: 2,
    }),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    successRate: numeric("success_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    requests24h: integer("requests_24h").notNull().default(0),
    tokens24h: integer("tokens_24h").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_llm_models_provider_model").on(t.providerId, t.modelId),
    index("ops_llm_models_provider").on(t.providerId),
    index("ops_llm_models_active").on(t.isActive),
  ],
);

// ─── Routing Policies ───────────────────────────────────────────────────────
// Named routing policies for request dispatching.

export const opsLlmRoutingPolicies = pgTable(
  "ops_llm_routing_policies",
  {
    id: uuidId(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    iconType: text("icon_type").notNull().default("default"),
    status: llmRoutingPolicyStatusEnum("status").notNull().default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    priority: integer("priority").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("ops_routing_policies_status").on(t.status),
    index("ops_routing_policies_priority").on(t.priority),
  ],
);

// ─── Routing Rules ──────────────────────────────────────────────────────────
// Routing rules for request dispatching.

export const opsLlmRoutingRules = pgTable(
  "ops_llm_routing_rules",
  {
    id: uuidId(),
    priority: integer("priority").notNull(),
    ruleName: text("rule_name").notNull(),
    conditions: text("conditions").notNull(),
    target: text("target").notNull(),
    policyName: text("policy_name").notNull(),
    status: text("status").notNull().default("active"),
    hitRate24h: numeric("hit_rate_24h", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("ops_routing_rules_priority").on(t.priority),
    index("ops_routing_rules_active").on(t.isActive),
  ],
);

// ─── Recent Changes ─────────────────────────────────────────────────────────
// Recent configuration changes log.

export const opsLlmRecentChanges = pgTable(
  "ops_llm_recent_changes",
  {
    id: uuidId(),
    changeType: text("change_type").notNull(),
    // Types: "model_added", "routing_updated", "fallback_enabled", "provider_degraded"
    title: text("title").notNull(),
    actorName: text("actor_name").notNull(),
    actorType: text("actor_type").notNull().default("admin"),
    // "admin" or "system"
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ops_llm_changes_type").on(t.changeType),
    index("ops_llm_changes_created").on(t.createdAt),
  ],
);
