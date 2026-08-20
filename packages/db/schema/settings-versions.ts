import { pgTable, uuid, text, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core"
import { users } from "./auth"

// ─── SETTINGS VERSIONS ────────────────────────────────────────────────────────
// Stores versioned snapshots of user settings for rollback capability

export const settingsVersions = pgTable(
  "settings_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(), // Monotonically increasing version number
    label: text("label"), // Optional: "Manual save", "Auto: before reset", etc.
    settings: jsonb("settings").notNull(), // Full settings snapshot
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("settings_versions_user_id").on(t.userId),
    index("settings_versions_user_version").on(t.userId, t.version),
  ]
)

// ─── Version Types ────────────────────────────────────────────────────────────

export type SettingsVersion = {
  id: string
  userId: string
  version: number
  label: string | null
  settings: Record<string, unknown>
  createdAt: Date
}
