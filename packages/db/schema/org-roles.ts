import { pgTable, uuid, text, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";
import { organizations } from "./organization";

/**
 * ORG ROLES
 *
 * Org-level roles (owner/admin) grant access to ALL entities under an
 * organization WITHOUT needing individual user_entity_access rows.
 *
 * Permission resolution order (Milestone 9):
 * 1. Check org_roles (owner/admin) → full access to all entities in org
 * 2. Check user_entity_access → role-scoped access to specific entity
 * 3. Neither → deny
 */
export const orgRoles = pgTable(
  "org_roles",
  {
    id: uuidId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<"owner" | "admin">(),
    grantedBy: uuid("granted_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("org_roles_user_org").on(t.userId, t.orgId),
    index("org_roles_org").on(t.orgId),
    index("org_roles_user").on(t.userId),
  ],
);

export const orgRolesRelations = relations(orgRoles, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgRoles.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgRoles.userId],
    references: [users.id],
  }),
  grantor: one(users, {
    fields: [orgRoles.grantedBy],
    references: [users.id],
  }),
}));
