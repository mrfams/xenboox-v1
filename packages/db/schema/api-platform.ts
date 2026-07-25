// ─── API & Developer Platform Schema (Phase 3) ──────────────────────────
//
// External API access for Pro/Firm tier organizations.
// Core constraint: API access is bound by the exact same RBAC and agent-review
// chain as every other interface — it is never a shortcut.
//
// Tables:
//   api_keys               — Per-org API credentials scoped to entities/roles
//   api_scopes             — Fine-grained resource+permission pairs per key
//   webhook_subscriptions  — Event-driven callbacks per entity
//   api_call_logs          — Every external API call logged

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { organizations, entities } from "./organization";

// ─── ENUMS ────────────────────────────────────────────────────────────

export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "active",
  "revoked",
  "expired",
]);

export const webhookEventEnum = pgEnum("webhook_event_type", [
  "close.completed",
  "invoice.paid",
  "invoice.overdue",
  "reconciliation.flagged",
  "budget.threshold_exceeded",
  "transaction.created",
  "expense.approved",
  "payroll.completed",
  "document.processed",
]);

export const webhookStatusEnum = pgEnum("webhook_status", [
  "active",
  "paused",
  "disabled",
]);

export const apiMethodEnum = pgEnum("api_method", [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

// ─── API KEYS ─────────────────────────────────────────────────────────
//
// Issued per organization, scoped to specific entities and specific roles.
// API credentials carry the exact same permission model as a human user,
// never a broader one.

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuidId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
    keyHash: text("key_hash").notNull(), // bcrypt hash of the full key
    keyLastChars: text("key_last_chars").notNull(), // Last 4 chars for UI display
    status: apiKeyStatusEnum("status").notNull().default("active"),
    // The tier determines rate limits (not the org plan — we check both)
    tier: text("tier").notNull().default("standard"), // "standard" | "pro" | "enterprise"
    // Entity scope: null = all entities the creator has access to
    entityScope: jsonb("entity_scope").$type<string[]>().default([]),
    // Role scope: the maximum role this key can act as (never broader than creator's role)
    roleScope: text("role_scope").notNull(), // e.g. "read_only" | "standard" | "admin"
    createdById: uuid("created_by_id").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedById: text("revoked_by_id"),
    revokedReason: text("revoked_reason"),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    requestCount: integer("request_count").notNull().default(0),
    // Rate limit overrides (null = use tier default)
    rateLimitPerMinute: integer("rate_limit_per_minute"),
    ...timestamps,
  },
  (t) => [
    index("api_keys_org").on(t.orgId),
    index("api_keys_status").on(t.orgId, t.status),
    index("api_keys_prefix").on(t.keyPrefix),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [apiKeys.orgId],
    references: [organizations.id],
  }),
  scopes: many(apiScopes),
}));

// ─── API SCOPES ───────────────────────────────────────────────────────
//
// Fine-grained permissions per API key. Each scope grants read or write
// access to a specific resource type.

export const apiScopes = pgTable(
  "api_scopes",
  {
    id: uuidId(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(), // "transactions", "reports", "invoices", "customers", etc.
    permission: text("permission").notNull().default("read"), // "read" | "write" | "admin"
    ...timestamps,
  },
  (t) => [
    index("api_scopes_key").on(t.apiKeyId),
    index("api_scopes_resource").on(t.apiKeyId, t.resource),
  ],
);

export const apiScopesRelations = relations(apiScopes, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiScopes.apiKeyId],
    references: [apiKeys.id],
  }),
}));

// ─── WEBHOOK SUBSCRIPTIONS ────────────────────────────────────────────
//
// Subscribable events per entity. When events fire, webhooks are sent
// to the target URL with an HMAC signature for verification.

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    eventType: webhookEventEnum("event_type").notNull(),
    targetUrl: text("target_url").notNull(),
    secret: text("secret").notNull(), // Unique HMAC secret per subscription
    status: webhookStatusEnum("status").notNull().default("active"),
    description: text("description"),
    // Retry configuration
    maxRetries: integer("max_retries").notNull().default(3),
    retryIntervalMs: integer("retry_interval_ms").notNull().default(5000),
    // Delivery stats
    lastDeliveredAt: timestamp("last_delivered_at"),
    lastDeliveryStatus: text("last_delivery_status"), // "success" | "failed"
    deliveryCount: integer("delivery_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    createdById: uuid("created_by_id"),
    ...timestamps,
  },
  (t) => [
    index("webhook_entity").on(t.entityId),
    index("webhook_event").on(t.entityId, t.eventType),
    index("webhook_status").on(t.entityId, t.status),
  ],
);

export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ one }) => ({
    entity: one(entities, {
      fields: [webhookSubscriptions.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── WEBHOOK DELIVERY LOGS ────────────────────────────────────────────
//
// Tracks every webhook delivery attempt with response status.

export const webhookDeliveryLogs = pgTable(
  "webhook_delivery_logs",
  {
    id: uuidId(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
    eventType: webhookEventEnum("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    durationMs: integer("duration_ms"),
    success: boolean("success").notNull().default(false),
    attempt: integer("attempt").notNull().default(1),
    errorMessage: text("error_message"),
    deliveredAt: timestamp("delivered_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("webhook_delivery_sub").on(t.subscriptionId),
    index("webhook_delivery_event").on(t.eventType),
  ],
);

export const webhookDeliveryLogsRelations = relations(
  webhookDeliveryLogs,
  ({ one }) => ({
    subscription: one(webhookSubscriptions, {
      fields: [webhookDeliveryLogs.subscriptionId],
      references: [webhookSubscriptions.id],
    }),
  }),
);

// ─── API CALL LOGS ────────────────────────────────────────────────────
//
// Every external API call logged with the same rigor as internal agent
// actions — who, what, when, which entity, which key.

export const apiCallLogs = pgTable(
  "api_call_logs",
  {
    id: uuidId(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    method: apiMethodEnum("method").notNull(),
    statusCode: integer("status_code").notNull(),
    durationMs: integer("duration_ms"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    requestBody: jsonb("request_body").$type<Record<string, unknown>>(),
    responsePreview: text("response_preview"), // Truncated to 500 chars
    errorMessage: text("error_message"),
    rateLimited: boolean("rate_limited").notNull().default(false),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("api_call_key").on(t.apiKeyId),
    index("api_call_entity").on(t.entityId),
    index("api_call_endpoint").on(t.endpoint),
    index("api_call_timestamp").on(t.apiKeyId, t.timestamp),
  ],
);

export const apiCallLogsRelations = relations(apiCallLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiCallLogs.apiKeyId],
    references: [apiKeys.id],
  }),
  entity: one(entities, {
    fields: [apiCallLogs.entityId],
    references: [entities.id],
  }),
}));

// ─── Rate Limit Configuration ────────────────────────────────────────
//
// Tier-based defaults. Individual keys can override.

export const TIER_RATE_LIMITS: Record<
  string,
  { perMinute: number; perDay: number }
> = {
  standard: { perMinute: 30, perDay: 10000 },
  pro: { perMinute: 200, perDay: 50000 },
  enterprise: { perMinute: 1000, perDay: 250000 },
};
