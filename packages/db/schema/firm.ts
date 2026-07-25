// ─── Accounting Firm Dashboard & Client Switcher Schema ────────────────
//
// Multi-client dashboard for accounting firms. Core constraint: this is a
// read-only aggregation layer that enforces the exact same entity isolation
// as every other surface — never a mechanism to relax it.
//
// Tables:
//   client_engagements       — Links a firm's org to a client's entity
//   firm_dashboard_snapshots — Cached read-only rollup per client entity
//
// Rules:
//   - Client entity remains under the CLIENT's org, never re-owned by firm
//   - Cross-client isolation enforced at the QUERY layer, not just UI
//   - Firm access is additive — never a gate on the client's own account

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps, entityId } from "./helpers";
import { organizations, entities } from "./organization";

// ─── Client Engagements ────────────────────────────────────────────────
// Links a firm's organization to a client's entity. The client's entity
// remains under the client's own organization — the firm is granted access
// via the standard user_entity_access table.

export const clientEngagements = pgTable(
  "client_engagements",
  {
    id: uuidId(),
    firmOrgId: uuid("firm_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientEntityId: uuid("client_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    // "active" | "ended" | "pending_consent"
    addedById: text("added_by_id").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    endedById: text("ended_by_id"),
    clientConsentedAt: timestamp("client_consented_at"),
    clientConsentedById: text("client_consented_by_id"),
    engagementType: text("engagement_type").notNull().default("full"),
    // "full" | "review" | "tax_only" | "audit_only"
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("ce_firm").on(t.firmOrgId),
    index("ce_client").on(t.clientEntityId),
    index("ce_status").on(t.firmOrgId, t.status),
    index("ce_pair").on(t.firmOrgId, t.clientEntityId),
  ],
);

export const clientEngagementsRelations = relations(
  clientEngagements,
  ({ one }) => ({
    firmOrg: one(organizations, {
      fields: [clientEngagements.firmOrgId],
      references: [organizations.id],
      relationName: "firmOrganization",
    }),
    clientEntity: one(entities, {
      fields: [clientEngagements.clientEntityId],
      references: [entities.id],
    }),
  }),
);

// ─── Firm Dashboard Snapshots ───────────────────────────────────────────
// Cached read-only rollup per client entity. This is a READ MODEL — never
// a source of truth. Client data is always pulled from the entity's own
// standard pipelines.

export const firmDashboardSnapshots = pgTable(
  "firm_dashboard_snapshots",
  {
    id: uuidId(),
    firmOrgId: uuid("firm_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientEntityId: uuid("client_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    healthStatus: text("health_status").notNull().default("unknown"),
    // "healthy" | "needs_review" | "critical" | "unknown"
    booksCurrent: boolean("books_current").default(false),
    unreconciledItems: numeric("unreconciled_items", {
      precision: 5,
      scale: 0,
    })
      .notNull()
      .default("0"),
    overdueInvoices: numeric("overdue_invoices", { precision: 5, scale: 0 })
      .notNull()
      .default("0"),
    pendingApprovals: numeric("pending_approvals", { precision: 5, scale: 0 })
      .notNull()
      .default("0"),
    daysUntilClose: numeric("days_until_close", { precision: 4, scale: 0 })
      .notNull()
      .default("0"),
    lastClosePeriod: text("last_close_period"),
    cashBalance: numeric("cash_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    lastRefreshedAt: timestamp("last_refreshed_at").notNull().defaultNow(),
    snapshotData: jsonb("snapshot_data").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("fds_firm").on(t.firmOrgId),
    index("fds_client").on(t.clientEntityId),
    index("fds_status").on(t.firmOrgId, t.healthStatus),
  ],
);

export const firmDashboardSnapshotsRelations = relations(
  firmDashboardSnapshots,
  ({ one }) => ({
    firmOrg: one(organizations, {
      fields: [firmDashboardSnapshots.firmOrgId],
      references: [organizations.id],
    }),
    clientEntity: one(entities, {
      fields: [firmDashboardSnapshots.clientEntityId],
      references: [entities.id],
    }),
  }),
);
