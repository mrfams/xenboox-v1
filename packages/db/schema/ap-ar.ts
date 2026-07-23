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
import { chartOfAccounts, journalEntries } from "./accounting";

// ─── ENUMS ───────────────────────────────────────

export const poStatusEnum = pgEnum("po_status", [
  "draft",
  "submitted",
  "approved",
  "partial",
  "received",
  "cancelled",
]);

export const apStatusEnum = pgEnum("ap_status", [
  "pending",
  "partial",
  "paid",
  "overdue",
  "voided",
]);

export const arStatusEnum = pgEnum("ar_status", [
  "pending",
  "partial",
  "paid",
  "overdue",
  "voided",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "bank_transfer",
  "cash",
  "mobile_money",
  "check",
  "card",
]);

export const apPaymentStatusEnum = pgEnum("ap_payment_status", [
  "pending",
  "confirmed",
  "failed",
  "reversed",
]);

// ─── SUPPLIERS ───────────────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    taxId: text("tax_id"),
    paymentTerms: text("payment_terms").default("net30"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("suppliers_entity").on(t.entityId)],
);

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  entity: one(entities, {
    fields: [suppliers.entityId],
    references: [entities.id],
  }),
  purchaseOrders: many(purchaseOrders),
  invoicesAp: many(invoicesAp),
}));

// ─── PURCHASE ORDERS ─────────────────────────────

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    poNumber: text("po_number").notNull(),
    orderDate: text("order_date").notNull(),
    expectedDate: text("expected_date"),
    status: poStatusEnum("status").notNull().default("draft"),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("GMD"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("po_entity_number").on(t.entityId, t.poNumber),
    index("po_entity").on(t.entityId),
    index("po_supplier").on(t.supplierId),
  ],
);

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [purchaseOrders.entityId],
      references: [entities.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    lines: many(poLines),
  }),
);

// ─── PO LINES ────────────────────────────────────

export const poLines = pgTable(
  "po_lines",
  {
    id: uuidId(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
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
  (t) => [index("po_lines_order").on(t.purchaseOrderId)],
);

export const poLinesRelations = relations(poLines, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [poLines.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  account: one(chartOfAccounts, {
    fields: [poLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

// ─── AP INVOICES ─────────────────────────────────

export const invoicesAp = pgTable(
  "invoices_ap",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    purchaseOrderId: uuid("purchase_order_id").references(
      () => purchaseOrders.id,
    ),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceDate: text("invoice_date").notNull(),
    dueDate: text("due_date").notNull(),
    status: apStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GMD"),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
    ),
    receivedDate: text("received_date"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ap_invoice_entity_number").on(t.entityId, t.invoiceNumber),
    index("ap_entity").on(t.entityId),
    index("ap_supplier").on(t.supplierId),
    index("ap_status").on(t.entityId, t.status),
  ],
);

export const invoicesApRelations = relations(invoicesAp, ({ one, many }) => ({
  entity: one(entities, {
    fields: [invoicesAp.entityId],
    references: [entities.id],
  }),
  supplier: one(suppliers, {
    fields: [invoicesAp.supplierId],
    references: [suppliers.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [invoicesAp.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [invoicesAp.journalEntryId],
    references: [journalEntries.id],
  }),
  lines: many(invoiceApLines),
  payments: many(paymentsAp),
}));

// ─── AP INVOICE LINES ────────────────────────────

export const invoiceApLines = pgTable(
  "invoice_ap_lines",
  {
    id: uuidId(),
    invoiceApId: uuid("invoice_ap_id")
      .notNull()
      .references(() => invoicesAp.id, { onDelete: "cascade" }),
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
  (t) => [index("ap_lines_invoice").on(t.invoiceApId)],
);

export const invoiceApLinesRelations = relations(invoiceApLines, ({ one }) => ({
  invoiceAp: one(invoicesAp, {
    fields: [invoiceApLines.invoiceApId],
    references: [invoicesAp.id],
  }),
  account: one(chartOfAccounts, {
    fields: [invoiceApLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

// ─── AP PAYMENTS ─────────────────────────────────

export const paymentsAp = pgTable(
  "payments_ap",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    invoiceApId: uuid("invoice_ap_id")
      .notNull()
      .references(() => invoicesAp.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    paymentDate: text("payment_date").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
    ),
    confirmedAt: timestamp("confirmed_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("ap_pay_entity").on(t.entityId),
    index("ap_pay_invoice").on(t.invoiceApId),
  ],
);

export const paymentsApRelations = relations(paymentsAp, ({ one }) => ({
  entity: one(entities, {
    fields: [paymentsAp.entityId],
    references: [entities.id],
  }),
  invoiceAp: one(invoicesAp, {
    fields: [paymentsAp.invoiceApId],
    references: [invoicesAp.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [paymentsAp.journalEntryId],
    references: [journalEntries.id],
  }),
}));

// ─── CUSTOMERS ───────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    taxId: text("tax_id"),
    paymentTerms: text("payment_terms").default("net30"),
    creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("customers_entity").on(t.entityId)],
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  entity: one(entities, {
    fields: [customers.entityId],
    references: [entities.id],
  }),
  salesInvoices: many(salesInvoices),
}));

// ─── SALES INVOICES ──────────────────────────────

export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceDate: text("invoice_date").notNull(),
    dueDate: text("due_date").notNull(),
    status: arStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GMD"),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
    ),
    sentAt: timestamp("sent_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ar_invoice_entity_number").on(t.entityId, t.invoiceNumber),
    index("ar_entity").on(t.entityId),
    index("ar_customer").on(t.customerId),
    index("ar_status").on(t.entityId, t.status),
  ],
);

export const salesInvoicesRelations = relations(
  salesInvoices,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [salesInvoices.entityId],
      references: [entities.id],
    }),
    customer: one(customers, {
      fields: [salesInvoices.customerId],
      references: [customers.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [salesInvoices.journalEntryId],
      references: [journalEntries.id],
    }),
    lines: many(salesInvoiceLines),
    payments: many(paymentsAr),
  }),
);

// ─── SALES INVOICE LINES ─────────────────────────

export const salesInvoiceLines = pgTable(
  "sales_invoice_lines",
  {
    id: uuidId(),
    salesInvoiceId: uuid("sales_invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
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
  (t) => [index("ar_lines_invoice").on(t.salesInvoiceId)],
);

export const salesInvoiceLinesRelations = relations(
  salesInvoiceLines,
  ({ one }) => ({
    salesInvoice: one(salesInvoices, {
      fields: [salesInvoiceLines.salesInvoiceId],
      references: [salesInvoices.id],
    }),
    account: one(chartOfAccounts, {
      fields: [salesInvoiceLines.accountId],
      references: [chartOfAccounts.id],
    }),
  }),
);

// ─── AR PAYMENTS ─────────────────────────────────

export const paymentsAr = pgTable(
  "payments_ar",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    salesInvoiceId: uuid("sales_invoice_id")
      .notNull()
      .references(() => salesInvoices.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    paymentDate: text("payment_date").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
    ),
    confirmedAt: timestamp("confirmed_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("ar_pay_entity").on(t.entityId),
    index("ar_pay_invoice").on(t.salesInvoiceId),
  ],
);

export const paymentsArRelations = relations(paymentsAr, ({ one }) => ({
  entity: one(entities, {
    fields: [paymentsAr.entityId],
    references: [entities.id],
  }),
  salesInvoice: one(salesInvoices, {
    fields: [paymentsAr.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [paymentsAr.journalEntryId],
    references: [journalEntries.id],
  }),
}));
