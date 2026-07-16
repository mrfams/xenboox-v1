import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: varchar("key", { length: 255 }).primaryKey(),
  userId: text("user_id").notNull(),
  entityId: text("entity_id").notNull(),
  route: varchar("route", { length: 500 }).notNull(),
  statusCode: timestamp("status_code", { withTimezone: true }),
  responseBody: jsonb("response_body"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
})