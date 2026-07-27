import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { users } from "./auth";

// ─── ENUMS ───────────────────────────────────────

export const orgTypeEnum = pgEnum("org_type", [
  "business",
  "nonprofit",
  "government",
  "accounting_firm",
]);

export const billingPlanEnum = pgEnum("billing_plan", [
  "free",
  "starter",
  "growth",
  "pro",
  "firm",
]);

export const entityTypeEnum = pgEnum("entity_type", [
  "company",
  "subsidiary",
  "branch",
  "client",
]);

export const entityRoleEnum = pgEnum("entity_role", [
  "owner",
  "admin",
  "finance_director",
  "accountant",
  "payroll_officer",
  "cashier",
  "department_manager",
  "employee",
  "external_auditor",
  "donor",
]);

// ─── ORGANIZATIONS ───────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuidId(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: orgTypeEnum("type").notNull().default("business"),
  plan: billingPlanEnum("plan").notNull().default("free"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  billingOwnerUserId: uuid("billing_owner_user_id").references(() => users.id),
  settings: jsonb("settings").default({}).$type<Record<string, unknown>>(),
  ...timestamps,
});

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [organizations.ownerId],
      references: [users.id],
    }),
    entities: many(entities),
  }),
);

// ─── ENTITIES ────────────────────────────────────

export const entities = pgTable(
  "entities",
  {
    id: uuidId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: entityTypeEnum("type").notNull().default("company"),
    currency: text("currency").notNull().default("GMD"),
    country: text("country").notNull().default("GM"),
    fiscalYearEnd: text("fiscal_year_end").notNull().default("12"),
    taxId: text("tax_id"),
    settings: jsonb("settings").default({}).$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("idx_entities_organization").on(t.organizationId)],
);

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [entities.organizationId],
    references: [organizations.id],
  }),
  userAccess: many(userEntityAccess),
}));

// ─── USER ENTITY ACCESS ──────────────────────────

export const userEntityAccess = pgTable(
  "user_entity_access",
  {
    id: uuidId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    role: entityRoleEnum("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_entity_access_user_entity").on(t.userId, t.entityId),
    index("user_entity_access_entity").on(t.entityId),
  ],
);

export const userEntityAccessRelations = relations(
  userEntityAccess,
  ({ one }) => ({
    user: one(users, {
      fields: [userEntityAccess.userId],
      references: [users.id],
    }),
    entity: one(entities, {
      fields: [userEntityAccess.entityId],
      references: [entities.id],
    }),
    grantor: one(users, {
      fields: [userEntityAccess.grantedBy],
      references: [users.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  userEntityAccess: many(userEntityAccess),
}));
