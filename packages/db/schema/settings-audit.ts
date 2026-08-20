import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

// ─── SETTINGS AUDIT LOG ───────────────────────────────────────────────────────
// Tracks every change to user settings for accountability and debugging

export const settingsAuditLog = pgTable(
  "settings_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // e.g. "update_ai_preferences", "reset_all"
    category: text("category").notNull(), // e.g. "ai", "onboarding", "notifications", "all"
    previousValue: jsonb("previous_value"), // what changed from
    newValue: jsonb("new_value"), // what changed to
    metadata: jsonb("metadata"), // extra context (device, IP, etc.)
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("settings_audit_user_id").on(t.userId),
    index("settings_audit_created_at").on(t.createdAt),
  ],
);

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export type SettingsAuditEntry = {
  id: string;
  userId: string;
  action: string;
  category: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};
