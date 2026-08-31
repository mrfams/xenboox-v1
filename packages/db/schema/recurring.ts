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
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { customers, suppliers } from "./ap-ar";

// ─── ENUMS ──────────────────────────────────────────────────────────────

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
]);

export const recurringStatusEnum = pgEnum("recurring_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const recurringDirectionEnum = pgEnum("recurring_direction", [
  "ar", // sales invoices (outgoing to customers)
  "ap", // purchase invoices (incoming from suppliers)
]);

// ─── RECURRING SCHEDULES ───────────────────────────────────────────────

export const recurringSchedules = pgTable(
  "recurring_schedules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    direction: recurringDirectionEnum("direction").notNull(),
    // Party reference — either customerId or supplierId depending on direction
    customerId: uuid("customer_id").references(() => customers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    // Template data
    templateName: text("template_name").notNull(),
    templateDescription: text("template_description"),
    templateLines: jsonb("template_lines").notNull().default("[]").$type<
      Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        accountId?: string;
      }>
    >(),
    // Scheduling
    frequency: recurringFrequencyEnum("frequency").notNull(),
    intervalValue: integer("interval_value").notNull().default(1), // every N periods
    dayOfMonth: integer("day_of_month"), // for monthly: which day (1-28)
    dayOfWeek: integer("day_of_week"), // for weekly: 0=Sun..6=Sat
    // Dates
    startDate: text("start_date").notNull(),
    endDate: text("end_date"), // null = no end
    nextRunDate: text("next_run_date").notNull(),
    lastRunDate: text("last_run_date"),
    // Financial
    currency: text("currency").notNull().default("USD"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
    paymentTerms: text("payment_terms").default("net30"),
    notes: text("notes"),
    // Status
    status: recurringStatusEnum("status").notNull().default("active"),
    totalGenerated: integer("total_generated").notNull().default(0),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // Metadata
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("recurring_entity").on(t.entityId),
    index("recurring_status").on(t.entityId, t.status),
    index("recurring_next_run").on(t.nextRunDate, t.status),
    index("recurring_direction").on(t.entityId, t.direction),
  ],
);

export const recurringSchedulesRelations = relations(
  recurringSchedules,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [recurringSchedules.entityId],
      references: [entities.id],
    }),
    customer: one(customers, {
      fields: [recurringSchedules.customerId],
      references: [customers.id],
    }),
    supplier: one(suppliers, {
      fields: [recurringSchedules.supplierId],
      references: [suppliers.id],
    }),
    runs: many(recurringRuns),
  }),
);

// ─── RECURRING RUNS (audit trail of generated documents) ───────────────

export const recurringRuns = pgTable(
  "recurring_runs",
  {
    id: uuidId(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => recurringSchedules.id, { onDelete: "cascade" }),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // The generated document
    generatedInvoiceId: uuid("generated_invoice_id"), // sales invoice or AP invoice
    invoiceNumber: text("invoice_number"),
    amount: numeric("amount", { precision: 15, scale: 2 }),
    status: text("status").notNull().default("generated"), // generated, sent, paid, failed
    error: text("error"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("recurring_runs_schedule").on(t.scheduleId),
    index("recurring_runs_entity").on(t.entityId),
  ],
);

export const recurringRunsRelations = relations(recurringRuns, ({ one }) => ({
  schedule: one(recurringSchedules, {
    fields: [recurringRuns.scheduleId],
    references: [recurringSchedules.id],
  }),
  entity: one(entities, {
    fields: [recurringRuns.entityId],
    references: [entities.id],
  }),
}));
