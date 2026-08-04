import { pgTable, uuid, jsonb, text } from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";

// ─── USER PREFERENCES ──────────────────────────────────────────────────────
// Stores user-specific preferences like theme, language, and notification settings

export const userPreferences = pgTable("user_preferences", {
  id: uuidId(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Appearance preferences
  theme: text("theme").notNull().default("system"), // "light" | "dark" | "system"
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("YYYY-MM-DD"),

  // Notification preferences
  notifications: jsonb("notifications")
    .$type<{
      emailInvoices: boolean;
      emailReports: boolean;
      emailAlerts: boolean;
      emailReminders: boolean;
      pushPayments: boolean;
      pushApprovals: boolean;
      pushDeadlines: boolean;
      weeklyDigest: boolean;
    }>()
    .notNull()
    .default({
      emailInvoices: true,
      emailReports: true,
      emailAlerts: true,
      emailReminders: true,
      pushPayments: true,
      pushApprovals: true,
      pushDeadlines: true,
      weeklyDigest: true,
    }),

  // Security preferences
  security: jsonb("security")
    .$type<{
      requirePasswordChange: boolean;
      sessionTimeout: number; // minutes
      loginNotifications: boolean;
    }>()
    .notNull()
    .default({
      requirePasswordChange: false,
      sessionTimeout: 60,
      loginNotifications: true,
    }),

  ...timestamps,
});
