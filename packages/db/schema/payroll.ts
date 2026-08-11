import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { journalEntries } from "./accounting";
import { documents } from "./documents";

// ─── ENUMS ───────────────────────────────────────

export const payrollRunStatusEnum = pgEnum("payroll_run_status", [
  "draft",
  "validated",
  "approved",
  "paid",
  "closed",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contractor",
  "intern",
]);

export const employeeTaxStatusEnum = pgEnum("employee_tax_status", [
  "resident",
  "non_resident",
  "citizen",
  "non_citizen",
  "tax_exempt",
]);

export const payFrequencyEnum = pgEnum("pay_frequency", [
  "weekly",
  "biweekly",
  "monthly",
]);

export const deductionTypeEnum = pgEnum("deduction_type", [
  "tax",
  "social_security",
  "benefit",
  "loan",
  "other",
]);

// ─── EMPLOYEES ───────────────────────────────────

export const employees = pgTable(
  "employees",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    employeeNumber: text("employee_number").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    hireDate: text("hire_date").notNull(),
    terminationDate: text("termination_date"),
    department: text("department"),
    jobTitle: text("job_title"),
    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("full_time"),
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    bankSortCode: text("bank_sort_code"),
    taxId: text("tax_id"),
    socialSecurityNumber: text("social_security_number"),
    // Residency/citizenship status — enables non-citizen / non-resident tax
    // rules (conditional rules matching on field "tax_status").
    taxStatus: employeeTaxStatusEnum("tax_status")
      .notNull()
      .default("resident"),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("employees_entity").on(t.entityId),
    index("employees_number").on(t.entityId, t.employeeNumber),
    index("employees_dept").on(t.entityId, t.department),
  ],
);

export const employeesRelations = relations(employees, ({ one, many }) => ({
  entity: one(entities, {
    fields: [employees.entityId],
    references: [entities.id],
  }),
  contracts: many(employeeContracts),
  payrollLineItems: many(payrollLineItems),
  payslips: many(payslips),
  staffLoans: many(staffLoans),
}));

// ─── EMPLOYEE CONTRACTS ──────────────────────────

export const employeeContracts = pgTable(
  "employee_contracts",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    effectiveDate: text("effective_date").notNull(),
    endDate: text("end_date"),
    basicSalary: numeric("basic_salary", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GMD"),
    payFrequency: payFrequencyEnum("pay_frequency")
      .notNull()
      .default("monthly"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("emp_contracts_entity").on(t.entityId),
    index("emp_contracts_emp").on(t.employeeId),
  ],
);

export const employeeContractsRelations = relations(
  employeeContracts,
  ({ one }) => ({
    entity: one(entities, {
      fields: [employeeContracts.entityId],
      references: [entities.id],
    }),
    employee: one(employees, {
      fields: [employeeContracts.employeeId],
      references: [employees.id],
    }),
  }),
);

// ─── PAYROLL DEDUCTION TYPES ─────────────────────

export const payrollDeductionTypes = pgTable(
  "payroll_deduction_types",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(), // e.g. PAYE, SSNIT, NHIF
    type: deductionTypeEnum("type").notNull(),
    rateType: text("rate_type").notNull().default("percentage"), // "fixed" or "percentage"
    rate: numeric("rate", { precision: 10, scale: 4 }).notNull().default("0"),
    ceiling: numeric("ceiling", { precision: 15, scale: 2 }), // max amount subject to deduction
    isStatutory: boolean("is_statutory").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("payroll_ded_entity").on(t.entityId),
    index("payroll_ded_code").on(t.entityId, t.code),
  ],
);

export const payrollDeductionTypesRelations = relations(
  payrollDeductionTypes,
  ({ one }) => ({
    entity: one(entities, {
      fields: [payrollDeductionTypes.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── PAYROLL RUNS ─────────────────────────────────

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM format
    status: payrollRunStatusEnum("status").notNull().default("draft"),
    employeeCount: integer("employee_count").notNull().default(0),
    grossPay: numeric("gross_pay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalEmployerContributions: numeric("total_employer_contributions", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    netPay: numeric("net_pay", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    processedBy: text("processed_by"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    journalEntryId: uuid("journal_entry_id").references(
      () => journalEntries.id,
    ),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("payroll_runs_entity").on(t.entityId),
    index("payroll_runs_period").on(t.entityId, t.period),
    index("payroll_runs_status").on(t.entityId, t.status),
  ],
);

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  entity: one(entities, {
    fields: [payrollRuns.entityId],
    references: [entities.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [payrollRuns.journalEntryId],
    references: [journalEntries.id],
  }),
  lineItems: many(payrollLineItems),
  payslips: many(payslips),
}));

// ─── PAYROLL LINE ITEMS ──────────────────────────

export const payrollLineItems = pgTable(
  "payroll_line_items",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    basicSalary: numeric("basic_salary", { precision: 15, scale: 2 }).notNull(),
    allowances: jsonb("allowances")
      .default([])
      .$type<Array<{ name: string; amount: string }>>(),
    grossPay: numeric("gross_pay", { precision: 15, scale: 2 }).notNull(),
    payeTax: numeric("paye_tax", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    socialSecurityEmployee: numeric("social_security_employee", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    socialSecurityEmployer: numeric("social_security_employer", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    otherDeductions: numeric("other_deductions", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    loanDeduction: numeric("loan_deduction", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netPay: numeric("net_pay", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").default("bank_transfer"),
    paymentReference: text("payment_reference"),
    ...timestamps,
  },
  (t) => [
    index("payroll_line_entity").on(t.entityId),
    index("payroll_line_run").on(t.payrollRunId),
    index("payroll_line_emp").on(t.employeeId),
  ],
);

export const payrollLineItemsRelations = relations(
  payrollLineItems,
  ({ one }) => ({
    entity: one(entities, {
      fields: [payrollLineItems.entityId],
      references: [entities.id],
    }),
    payrollRun: one(payrollRuns, {
      fields: [payrollLineItems.payrollRunId],
      references: [payrollRuns.id],
    }),
    employee: one(employees, {
      fields: [payrollLineItems.employeeId],
      references: [employees.id],
    }),
  }),
);

// ─── PAYSLIPS ─────────────────────────────────────

export const payslips = pgTable(
  "payslips",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    generatedAt: timestamp("generated_at").defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    documentId: uuid("document_id").references(() => documents.id),
    ...timestamps,
  },
  (t) => [
    index("payslips_entity").on(t.entityId),
    index("payslips_run").on(t.payrollRunId),
    index("payslips_emp").on(t.employeeId),
  ],
);

export const payslipsRelations = relations(payslips, ({ one }) => ({
  entity: one(entities, {
    fields: [payslips.entityId],
    references: [entities.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [payslips.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  document: one(documents, {
    fields: [payslips.documentId],
    references: [documents.id],
  }),
}));

// ─── STAFF LOANS ──────────────────────────────────

export const staffLoans = pgTable(
  "staff_loans",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    loanAmount: numeric("loan_amount", { precision: 15, scale: 2 }).notNull(),
    monthlyDeduction: numeric("monthly_deduction", {
      precision: 15,
      scale: 2,
    }).notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    remainingBalance: numeric("remaining_balance", {
      precision: 15,
      scale: 2,
    }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("staff_loans_entity").on(t.entityId),
    index("staff_loans_emp").on(t.employeeId),
  ],
);

export const staffLoansRelations = relations(staffLoans, ({ one }) => ({
  entity: one(entities, {
    fields: [staffLoans.entityId],
    references: [entities.id],
  }),
  employee: one(employees, {
    fields: [staffLoans.employeeId],
    references: [employees.id],
  }),
}));

// Need to import jsonb
import { jsonb } from "drizzle-orm/pg-core";
