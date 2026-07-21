-- Migration 0014: Unique Constraints on Business Keys + Composite Indexes
-- Adds missing UNIQUE constraints and composite indexes for performance

-- ─── UNIQUE CONSTRAINTS ─────────────────────────────

-- journal_entries: entry_number should be unique per entity
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_entity_entry_unique"
  ON "journal_entries" ("entity_id", "entry_number");

-- employees: employee_number should be unique per entity
DROP INDEX IF EXISTS "employees_number";
CREATE UNIQUE INDEX IF NOT EXISTS "employees_entity_number_unique"
  ON "employees" ("entity_id", "employee_number");

-- payroll_deduction_types: code should be unique per entity
DROP INDEX IF EXISTS "payroll_ded_code";
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_ded_entity_code_unique"
  ON "payroll_deduction_types" ("entity_id", "code");

-- bank_accounts: account_number should be unique per entity
CREATE UNIQUE INDEX IF NOT EXISTS "bank_accounts_entity_account_unique"
  ON "bank_accounts" ("entity_id", "account_number");

-- suppliers: tax_id should be unique per entity (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_entity_tax_id_unique"
  ON "suppliers" ("entity_id", "tax_id") WHERE "tax_id" IS NOT NULL;

-- customers: tax_id should be unique per entity (when not null)
CREATE UNIQUE INDEX IF NOT EXISTS "customers_entity_tax_id_unique"
  ON "customers" ("entity_id", "tax_id") WHERE "tax_id" IS NOT NULL;

-- mobile_money_transactions: provider_tx_id should be unique (when not null)
DROP INDEX IF EXISTS "mm_tx_provider_id";
CREATE UNIQUE INDEX IF NOT EXISTS "mm_tx_provider_id_unique"
  ON "mobile_money_transactions" ("provider_tx_id") WHERE "provider_tx_id" IS NOT NULL;

-- bank_connections: provider_connection_id should be unique per provider
DROP INDEX IF EXISTS "bank_conn_provider";
CREATE UNIQUE INDEX IF NOT EXISTS "bank_conn_provider_unique"
  ON "bank_connections" ("provider", "provider_connection_id");

-- email_forwarding_rules: email_address should be unique per entity
DROP INDEX IF EXISTS "email_rule_address";
CREATE UNIQUE INDEX IF NOT EXISTS "email_rules_entity_address_unique"
  ON "email_forwarding_rules" ("entity_id", "email_address");

-- ─── COMPOSITE INDEXES ──────────────────────────────

-- journal_entries: common query pattern — list by entity + period + status
CREATE INDEX IF NOT EXISTS "idx_journal_entries_entity_period_status"
  ON "journal_entries" ("entity_id", "period_id", "status");

-- journal_entry_lines: common join pattern
CREATE INDEX IF NOT EXISTS "idx_journal_entry_lines_entry_account"
  ON "journal_entry_lines" ("journal_entry_id", "account_id");

-- invoices_ap: common filter pattern
CREATE INDEX IF NOT EXISTS "idx_invoices_ap_entity_status_due"
  ON "invoices_ap" ("entity_id", "status", "due_date");

-- sales_invoices: common filter pattern
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_entity_status_due"
  ON "sales_invoices" ("entity_id", "status", "due_date");

-- bank_transactions: date-range queries
CREATE INDEX IF NOT EXISTS "idx_bank_transactions_entity_date"
  ON "bank_transactions" ("entity_id", "date");

-- audit_log: entity-scoped time-range queries
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity_created"
  ON "audit_log" ("entity_id", "created_at");

-- chat_messages: conversation-scoped ordering
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_created"
  ON "chat_messages" ("conversation_id", "created_at");

-- purchase_order_lines: PO-scoped queries
CREATE INDEX IF NOT EXISTS "idx_po_lines_po_id"
  ON "purchase_order_lines" ("purchase_order_id");

-- invoice_lines_ap: invoice-scoped queries
CREATE INDEX IF NOT EXISTS "idx_invoice_lines_ap_invoice_id"
  ON "invoice_lines_ap" ("invoice_id");

-- invoice_lines_ar: invoice-scoped queries
CREATE INDEX IF NOT EXISTS "idx_invoice_lines_ar_invoice_id"
  ON "invoice_lines_ar" ("invoice_id");
