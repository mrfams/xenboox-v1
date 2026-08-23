// ─── Donor Portal Tokens ────────────────────────────────────────────────────
//
// Magic-link tokens for external donor portal access.
// Tokens are single-use, time-limited (24h), and scoped to a specific donor
// customer. The portal shows only the projects and reports for that donor.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { customers } from "./ap-ar";
import { entities } from "./organization";

export const donorPortalTokens = pgTable(
  "donor_portal_tokens",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    donorCustomerId: uuid("donor_customer_id")
      .notNull()
      .references(() => customers.id),
    token: text("token").notNull().unique(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    isUsed: boolean("is_used").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("dpt_entity").on(t.entityId),
    index("dpt_donor").on(t.donorCustomerId),
    index("dpt_token").on(t.token),
    index("dpt_email").on(t.entityId, t.email),
  ],
);

export const donorPortalTokensRelations = relations(
  donorPortalTokens,
  ({ one }) => ({
    entity: one(entities, {
      fields: [donorPortalTokens.entityId],
      references: [entities.id],
    }),
    donor: one(customers, {
      fields: [donorPortalTokens.donorCustomerId],
      references: [customers.id],
    }),
  }),
);
