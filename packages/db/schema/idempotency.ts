import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: varchar("key", { length: 255 }).primaryKey(),
  userId: text("user_id").notNull(),
  entityId: text("entity_id").notNull(),
  route: varchar("route", { length: 500 }).notNull(),
  // Batch 3 / N27 — an HTTP status code is an integer. The column was typed
  // as a timestamp (copy-paste artifact) and is currently unwritten; typed
  // correctly for the wrapper to record outcomes.
  statusCode: integer("status_code"),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
})