import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { users } from "./auth";
import { salesInvoices } from "./ap-ar";

// ─── ENUMS ──────────────────────────────────────────────────────────────

export const paymentLinkStatusEnum = pgEnum("payment_link_status", [
  "active",
  "expired",
  "paid",
  "cancelled",
]);

// ─── PAYMENT LINKS ─────────────────────────────────────────────────────

export const paymentLinks = pgTable(
  "payment_links",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
    // Unique token for the payment URL
    token: text("token").notNull().unique(),
    // Payment details
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    // Status
    status: paymentLinkStatusEnum("status").notNull().default("active"),
    // Tracking
    clickCount: integer("click_count").notNull().default(0),
    lastClickedAt: timestamp("last_clicked_at"),
    paidAt: timestamp("paid_at"),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }),
    // Expiry
    expiresAt: timestamp("expires_at"),
    // Payment method preference
    paymentMethods: text("payment_methods")
      .default("card,bank_transfer,mobile_money")
      .$type<string>(),
    // Creator
    createdBy: uuid("created_by").references(() => users.id),
    // Metadata
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("payment_links_entity").on(t.entityId),
    index("payment_links_invoice").on(t.invoiceId),
    index("payment_links_token").on(t.token),
    index("payment_links_status").on(t.entityId, t.status),
  ],
);

export const paymentLinksRelations = relations(paymentLinks, ({ one }) => ({
  entity: one(entities, {
    fields: [paymentLinks.entityId],
    references: [entities.id],
  }),
  invoice: one(salesInvoices, {
    fields: [paymentLinks.invoiceId],
    references: [salesInvoices.id],
  }),
  createdByUser: one(users, {
    fields: [paymentLinks.createdBy],
    references: [users.id],
  }),
}));
