import { pgTable, uuid, text, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core"
import { users } from "./auth"

// ─── CONFLICT RESOLUTION HISTORY ──────────────────────────────────────────────
// Tracks how settings conflicts between devices were resolved

export const conflictResolutionHistory = pgTable(
  "conflict_resolution_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    strategy: text("strategy").notNull(), // "last-write-wins" | "local-wins" | "remote-wins" | "deep-merge" | "manual"
    conflictCount: integer("conflict_count").notNull(), // number of fields that conflicted
    conflicts: jsonb("conflicts"), // array of { path, localValue, remoteValue }
    resolvedValues: jsonb("resolved_values"), // array of { path, resolvedValue, resolvedBy }
    localUpdatedAt: timestamp("local_updated_at"), // when local settings were last modified
    remoteUpdatedAt: timestamp("remote_updated_at"), // when remote settings were last modified
    deviceInfo: jsonb("device_info"), // { userAgent, screen, language }
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("conflict_resolution_user_id").on(t.userId),
    index("conflict_resolution_created_at").on(t.createdAt),
    index("conflict_resolution_strategy").on(t.strategy),
  ]
)

// ─── Conflict Resolution History Types ────────────────────────────────────────

export type ConflictResolutionEntry = {
  id: string
  userId: string
  strategy: string
  conflictCount: number
  conflicts: Array<{
    path: string
    localValue: unknown
    remoteValue: unknown
  }> | null
  resolvedValues: Array<{
    path: string
    resolvedValue: unknown
    resolvedBy: string
  }> | null
  localUpdatedAt: Date | null
  remoteUpdatedAt: Date | null
  deviceInfo: {
    userAgent?: string
    screen?: string
    language?: string
  } | null
  createdAt: Date
}
