import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";
import { organizations } from "./organization";
import { entities } from "./organization";

/**
 * PENDING INVITES
 *
 * Invitation system for the Identity & Organization flow:
 * - A pending invite links an email to an org_role or entity-level role
 * - Exactly one of org_id/entity_id is set per invite
 * - Token-based acceptance (no password required for acceptance)
 * - Default 7-day expiry
 */
export const pendingInvites = pgTable(
  "pending_invites",
  {
    id: uuidId(),
    email: text("email").notNull(),
    // Exactly one of these is set:
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "cascade",
    }),
    role: text("role").notNull(),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    status: text("status")
      .notNull()
      .$type<"pending" | "accepted" | "expired" | "revoked">()
      .default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    clientConsentedAt: timestamp("client_consented_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pending_invites_token").on(t.token),
    index("pending_invites_email_status").on(t.email, t.status),
    index("pending_invites_invited_by").on(t.invitedBy),
  ],
);

export const pendingInvitesRelations = relations(pendingInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [pendingInvites.orgId],
    references: [organizations.id],
  }),
  entity: one(entities, {
    fields: [pendingInvites.entityId],
    references: [entities.id],
  }),
  inviter: one(users, {
    fields: [pendingInvites.invitedBy],
    references: [users.id],
  }),
}));
