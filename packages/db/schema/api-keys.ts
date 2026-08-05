import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { users } from "./auth";

// ─── API KEYS ──────────────────────────────────────────────────────────────
// Stores API keys for external integrations (banking, payments, etc.)

// ─── ENTITY-SCOPED API KEYS ───────────────────────────────────────────────
// API keys scoped to a specific entity (used by settings router)
// Note: This is different from the org-based apiKeys in api-platform.ts

export const entityApiKeys = pgTable(
  "entity_api_keys",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Key details
    name: text("name").notNull(), // Human-readable name
    provider: text("provider").notNull(), // e.g., "mono", "flutterwave", "stripe"
    keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
    keyHash: text("key_hash").notNull(), // Hashed API key
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]), // Access scopes

    // Status
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    ...timestamps,
  },
  (t) => [
    index("idx_entity_api_keys_entity").on(t.entityId),
    index("idx_entity_api_keys_user").on(t.userId),
  ],
);

export const entityApiKeysRelations = relations(entityApiKeys, ({ one }) => ({
  entity: one(entities, {
    fields: [entityApiKeys.entityId],
    references: [entities.id],
  }),
  user: one(users, {
    fields: [entityApiKeys.userId],
    references: [users.id],
  }),
}));
