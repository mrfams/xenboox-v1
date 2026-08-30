// ─── Announcements — Admin-managed marketing banner ─────────────────────
// Global, not entity-scoped. Powers AnnouncementBar on marketing pages.
// Admin can enable/disable a single active announcement; dismissal is
// per-announcement per-browser via localStorage.

import { pgTable, varchar, boolean, index } from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

export const announcements = pgTable(
  "announcements",
  {
    id: uuidId(),
    ...timestamps,

    message: varchar("message", { length: 500 }).notNull(),
    linkText: varchar("link_text", { length: 100 })
      .notNull()
      .default("Learn more →"),
    linkHref: varchar("link_href", { length: 500 }).notNull().default("/blog"),
    isActive: boolean("is_active").notNull().default(false),
  },
  (t) => [index("announcements_is_active").on(t.isActive)],
);
