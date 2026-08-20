import { pgTable, uuid, jsonb, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

// ─── USER SETTINGS ────────────────────────────────────────────────────────────
// Stores user preferences (AI, notifications, onboarding) that sync across devices

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(), // One settings record per user
  settings: jsonb("settings")
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Settings Types ───────────────────────────────────────────────────────────

export type UserSettings = {
  aiPreferences?: {
    autoReconcile?: boolean;
    autoCategorize?: boolean;
    aiAlerts?: boolean;
    dailyDigest?: boolean;
  };
  onboarding?: {
    completed?: boolean;
    currentStep?: string | null;
  };
  notifications?: {
    emailInvoices?: boolean;
    emailReports?: boolean;
    emailAlerts?: boolean;
    pushPayments?: boolean;
    pushApprovals?: boolean;
  };
  usage?: {
    autoReconcile?: number;
    autoCategorize?: number;
    aiAlerts?: number;
    dailyDigest?: number;
    totalActions?: number;
    lastUsed?: string | null;
  };
};
