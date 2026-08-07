import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { chartOfAccounts } from "./accounting";
import { customers, salesInvoices } from "./ap-ar";

// ─── ENUMS ───────────────────────────────────────

export const estimateStatusEnum = pgEnum("estimate_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "converted",
  "voided",
]);

// ─── SALES ESTIMATES (QUOTES) ────────────────────
//
// AI-native quote/estimate lifecycle:
//   draft → sent → viewed → accepted (→ converted to invoice) | declined | expired
// Conversion creates a sales_invoice and links it back via convertedInvoiceId.

export const salesEstimates = pgTable(
  "sales_estimates",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    estimateNumber: text("estimate_number").notNull(),
    estimateDate: text("estimate_date").notNull(),
    expiryDate: text("expiry_date"),
    status: estimateStatusEnum("status").notNull().default("draft"),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("GMD"),
    notes: text("notes"),
    terms: text("terms"),
    convertedInvoiceId: uuid("converted_invoice_id").references(
      () => salesInvoices.id,
    ),
    sentAt: timestamp("sent_at"),
    acceptedAt: timestamp("accepted_at"),
    declinedReason: text("declined_reason"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("estimate_entity_number").on(t.entityId, t.estimateNumber),
    index("estimate_entity").on(t.entityId),
    index("estimate_customer").on(t.customerId),
    index("estimate_status").on(t.entityId, t.status),
  ],
);

export const salesEstimatesRelations = relations(
  salesEstimates,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [salesEstimates.entityId],
      references: [entities.id],
    }),
    customer: one(customers, {
      fields: [salesEstimates.customerId],
      references: [customers.id],
    }),
    convertedInvoice: one(salesInvoices, {
      fields: [salesEstimates.convertedInvoiceId],
      references: [salesInvoices.id],
    }),
    lines: many(salesEstimateLines),
  }),
);

// ─── SALES ESTIMATE LINES ────────────────────────

export const salesEstimateLines = pgTable(
  "sales_estimate_lines",
  {
    id: uuidId(),
    salesEstimateId: uuid("sales_estimate_id")
      .notNull()
      .references(() => salesEstimates.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    ...timestamps,
  },
  (t) => [index("estimate_lines_estimate").on(t.salesEstimateId)],
);

export const salesEstimateLinesRelations = relations(
  salesEstimateLines,
  ({ one }) => ({
    salesEstimate: one(salesEstimates, {
      fields: [salesEstimateLines.salesEstimateId],
      references: [salesEstimates.id],
    }),
    account: one(chartOfAccounts, {
      fields: [salesEstimateLines.accountId],
      references: [chartOfAccounts.id],
    }),
  }),
);
