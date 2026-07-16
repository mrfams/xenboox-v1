CREATE TYPE "public"."account_subtype" AS ENUM('current_asset', 'fixed_asset', 'bank_account', 'cash', 'accounts_receivable', 'inventory', 'prepaid', 'current_liability', 'long_term_liability', 'accounts_payable', 'tax_liability', 'accrued_liability', 'owner_equity', 'retained_earnings', 'current_year_earnings', 'sales_revenue', 'service_revenue', 'other_income', 'interest_income', 'cost_of_goods_sold', 'operating_expense', 'payroll_expense', 'tax_expense', 'depreciation', 'interest_expense', 'other_expense');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('draft', 'pending_review', 'posted', 'reversed', 'voided');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('open', 'closing', 'closed', 'locked');--> statement-breakpoint
CREATE TYPE "public"."ap_payment_status" AS ENUM('pending', 'confirmed', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."ap_status" AS ENUM('pending', 'partial', 'paid', 'overdue', 'voided');--> statement-breakpoint
CREATE TYPE "public"."ar_status" AS ENUM('pending', 'partial', 'paid', 'overdue', 'voided');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'mobile_money', 'check', 'card');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('draft', 'submitted', 'approved', 'partial', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."imprest_status" AS ENUM('active', 'settled', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('uploaded', 'processing', 'processed', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('invoice', 'receipt', 'contract', 'voucher', 'bank_statement', 'tax_return', 'payroll_report', 'journal_entry', 'po', 'supporting');--> statement-breakpoint
CREATE TYPE "public"."mm_tx_status" AS ENUM('pending', 'successful', 'failed', 'reversed', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."mm_tx_type" AS ENUM('collection', 'disbursement', 'transfer', 'refund');--> statement-breakpoint
CREATE TYPE "public"."mobile_money_provider" AS ENUM('modempay', 'afrimoney', 'qmoney', 'mpesa', 'wave');--> statement-breakpoint
CREATE TYPE "public"."billing_plan" AS ENUM('free', 'starter', 'growth', 'pro', 'firm');--> statement-breakpoint
CREATE TYPE "public"."entity_role" AS ENUM('owner', 'admin', 'finance_director', 'accountant', 'payroll_officer', 'cashier', 'department_manager', 'employee', 'external_auditor', 'donor');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('company', 'subsidiary', 'branch', 'client');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('business', 'nonprofit', 'government', 'accounting_firm');--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('checking', 'savings', 'fixed_deposit', 'loan');--> statement-breakpoint
CREATE TYPE "public"."bank_tx_type" AS ENUM('deposit', 'withdrawal', 'transfer', 'fee', 'interest');--> statement-breakpoint
CREATE TYPE "public"."recon_item_status" AS ENUM('pending', 'matched', 'adjusted', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."recon_status" AS ENUM('unmatched', 'partial', 'matched', 'adjusted', 'closed');--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"subtype" "account_subtype" NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"status" "period_status" DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entry_number" integer NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"date" text NOT NULL,
	"period_id" uuid NOT NULL,
	"status" "journal_status" DEFAULT 'draft' NOT NULL,
	"posted_by" text,
	"posted_at" timestamp,
	"reversed_by" uuid,
	"reversed_at" timestamp,
	"confidence" numeric(3, 2),
	"source" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trial_balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"generated_by" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"tax_id" text,
	"payment_terms" text DEFAULT 'net30',
	"credit_limit" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_ap_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_ap_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices_ap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"invoice_number" text NOT NULL,
	"invoice_date" text NOT NULL,
	"due_date" text NOT NULL,
	"status" "ap_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"journal_entry_id" uuid,
	"received_date" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments_ap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"invoice_ap_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_date" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"journal_entry_id" uuid,
	"confirmed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments_ar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payment_date" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"journal_entry_id" uuid,
	"confirmed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"po_number" text NOT NULL,
	"order_date" text NOT NULL,
	"expected_date" text,
	"status" "po_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" text NOT NULL,
	"due_date" text NOT NULL,
	"status" "ar_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"journal_entry_id" uuid,
	"sent_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"tax_id" text,
	"payment_terms" text DEFAULT 'net30',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" bigint,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "cash_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"gl_account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imprest_floats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"cash_account_id" uuid NOT NULL,
	"assignee_name" text NOT NULL,
	"assignee_user_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"remaining_balance" numeric(15, 2) NOT NULL,
	"purpose" text,
	"status" "imprest_status" DEFAULT 'active' NOT NULL,
	"issued_date" text NOT NULL,
	"settle_by_date" text,
	"settled_at" timestamp,
	"journal_entry_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imprest_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imprest_float_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"receipt_date" text NOT NULL,
	"document_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petty_cash_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"cash_account_id" uuid NOT NULL,
	"transaction_date" text NOT NULL,
	"description" text NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2) NOT NULL,
	"category" text,
	"reference" text,
	"journal_entry_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"action" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"confidence" numeric(3, 2),
	"duration_ms" integer,
	"cost_cents" integer,
	"langfuse_trace_id" text,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id_ref" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"confidence" numeric(3, 2),
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "document_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "doc_type" NOT NULL,
	"status" "doc_status" DEFAULT 'uploaded' NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"r2_key" text NOT NULL,
	"r2_bucket" text NOT NULL,
	"ocr_text" text,
	"ocr_confidence" numeric(3, 2),
	"uploaded_by" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(15, 6) NOT NULL,
	"source" text NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_money_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"provider" "mobile_money_provider" NOT NULL,
	"account_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"account_number" text,
	"current_balance" numeric(15, 2) DEFAULT '0',
	"currency" text DEFAULT 'GMD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"webhook_secret" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_money_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"mobile_money_account_id" uuid NOT NULL,
	"provider_tx_id" text,
	"type" "mm_tx_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"fee" numeric(15, 2) DEFAULT '0',
	"net_amount" numeric(15, 2) NOT NULL,
	"counterparty" text,
	"counterparty_name" text,
	"description" text,
	"status" "mm_tx_status" DEFAULT 'pending' NOT NULL,
	"initiated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"webhook_payload" jsonb,
	"journal_entry_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "entity_type" DEFAULT 'company' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"country" text DEFAULT 'GM' NOT NULL,
	"fiscal_year_end" text DEFAULT '12' NOT NULL,
	"tax_id" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "org_type" DEFAULT 'business' NOT NULL,
	"plan" "billing_plan" DEFAULT 'free' NOT NULL,
	"owner_id" uuid NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_entity_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"role" "entity_role" NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"swift_code" text,
	"type" "bank_account_type" DEFAULT 'checking' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"gl_account_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"transaction_date" text NOT NULL,
	"value_date" text,
	"type" "bank_tx_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"balance" numeric(15, 2),
	"description" text NOT NULL,
	"reference" text,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciliation_id" uuid,
	"journal_entry_id" uuid,
	"source" text DEFAULT 'manual',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_id" uuid NOT NULL,
	"bank_transaction_id" uuid NOT NULL,
	"journal_entry_line_id" uuid,
	"status" "recon_item_status" DEFAULT 'pending' NOT NULL,
	"matched_amount" numeric(15, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"statement_date" text NOT NULL,
	"statement_balance" numeric(15, 2) NOT NULL,
	"book_balance" numeric(15, 2) NOT NULL,
	"difference" numeric(15, 2) NOT NULL,
	"status" "recon_status" DEFAULT 'unmatched' NOT NULL,
	"closed_by" text,
	"closed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_chart_of_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_balance_snapshots" ADD CONSTRAINT "trial_balance_snapshots_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_balance_snapshots" ADD CONSTRAINT "trial_balance_snapshots_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_balance_snapshots" ADD CONSTRAINT "trial_balance_snapshots_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_ap_lines" ADD CONSTRAINT "invoice_ap_lines_invoice_ap_id_invoices_ap_id_fk" FOREIGN KEY ("invoice_ap_id") REFERENCES "public"."invoices_ap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_ap_lines" ADD CONSTRAINT "invoice_ap_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices_ap" ADD CONSTRAINT "invoices_ap_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices_ap" ADD CONSTRAINT "invoices_ap_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices_ap" ADD CONSTRAINT "invoices_ap_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices_ap" ADD CONSTRAINT "invoices_ap_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ap" ADD CONSTRAINT "payments_ap_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ap" ADD CONSTRAINT "payments_ap_invoice_ap_id_invoices_ap_id_fk" FOREIGN KEY ("invoice_ap_id") REFERENCES "public"."invoices_ap"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ap" ADD CONSTRAINT "payments_ap_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ar" ADD CONSTRAINT "payments_ar_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ar" ADD CONSTRAINT "payments_ar_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ar" ADD CONSTRAINT "payments_ar_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imprest_floats" ADD CONSTRAINT "imprest_floats_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imprest_floats" ADD CONSTRAINT "imprest_floats_cash_account_id_cash_accounts_id_fk" FOREIGN KEY ("cash_account_id") REFERENCES "public"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imprest_floats" ADD CONSTRAINT "imprest_floats_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imprest_receipts" ADD CONSTRAINT "imprest_receipts_imprest_float_id_imprest_floats_id_fk" FOREIGN KEY ("imprest_float_id") REFERENCES "public"."imprest_floats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_ledger" ADD CONSTRAINT "petty_cash_ledger_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_ledger" ADD CONSTRAINT "petty_cash_ledger_cash_account_id_cash_accounts_id_fk" FOREIGN KEY ("cash_account_id") REFERENCES "public"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_ledger" ADD CONSTRAINT "petty_cash_ledger_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD CONSTRAINT "agent_activity_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_accounts" ADD CONSTRAINT "mobile_money_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_mobile_money_account_id_mobile_money_accounts_id_fk" FOREIGN KEY ("mobile_money_account_id") REFERENCES "public"."mobile_money_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_money_transactions" ADD CONSTRAINT "mobile_money_transactions_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_reconciliation_id_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_bank_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coa_entity_code" ON "chart_of_accounts" USING btree ("entity_id","code");--> statement-breakpoint
CREATE INDEX "coa_entity" ON "chart_of_accounts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "coa_type" ON "chart_of_accounts" USING btree ("entity_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "fp_entity_year_month" ON "fiscal_periods" USING btree ("entity_id","year","month");--> statement-breakpoint
CREATE INDEX "fp_entity" ON "fiscal_periods" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "je_entity_date" ON "journal_entries" USING btree ("entity_id","date");--> statement-breakpoint
CREATE INDEX "je_period" ON "journal_entries" USING btree ("entity_id","period_id");--> statement-breakpoint
CREATE INDEX "je_status" ON "journal_entries" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "jel_entry" ON "journal_entry_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "jel_account" ON "journal_entry_lines" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tbs_entity_period_account" ON "trial_balance_snapshots" USING btree ("entity_id","period_id","account_id");--> statement-breakpoint
CREATE INDEX "customers_entity" ON "customers" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ap_lines_invoice" ON "invoice_ap_lines" USING btree ("invoice_ap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ap_invoice_entity_number" ON "invoices_ap" USING btree ("entity_id","invoice_number");--> statement-breakpoint
CREATE INDEX "ap_entity" ON "invoices_ap" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ap_supplier" ON "invoices_ap" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ap_status" ON "invoices_ap" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "ap_pay_entity" ON "payments_ap" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ap_pay_invoice" ON "payments_ap" USING btree ("invoice_ap_id");--> statement-breakpoint
CREATE INDEX "ar_pay_entity" ON "payments_ar" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ar_pay_invoice" ON "payments_ar" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE INDEX "po_lines_order" ON "po_lines" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "po_entity_number" ON "purchase_orders" USING btree ("entity_id","po_number");--> statement-breakpoint
CREATE INDEX "po_entity" ON "purchase_orders" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "po_supplier" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "ar_lines_invoice" ON "sales_invoice_lines" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_invoice_entity_number" ON "sales_invoices" USING btree ("entity_id","invoice_number");--> statement-breakpoint
CREATE INDEX "ar_entity" ON "sales_invoices" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ar_customer" ON "sales_invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ar_status" ON "sales_invoices" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "suppliers_entity" ON "suppliers" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_identifier_token" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE INDEX "cash_accounts_entity" ON "cash_accounts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "imprest_entity" ON "imprest_floats" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "imprest_cash_account" ON "imprest_floats" USING btree ("cash_account_id");--> statement-breakpoint
CREATE INDEX "imprest_status" ON "imprest_floats" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "imprest_receipts_float" ON "imprest_receipts" USING btree ("imprest_float_id");--> statement-breakpoint
CREATE INDEX "pcl_entity" ON "petty_cash_ledger" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "pcl_cash_account" ON "petty_cash_ledger" USING btree ("cash_account_id");--> statement-breakpoint
CREATE INDEX "pcl_date" ON "petty_cash_ledger" USING btree ("entity_id","transaction_date");--> statement-breakpoint
CREATE INDEX "agent_activity_entity" ON "agent_activity" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "agent_activity_agent" ON "agent_activity" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "agent_activity_date" ON "agent_activity" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_log" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_user" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_action" ON "audit_log" USING btree ("entity_id","action");--> statement-breakpoint
CREATE INDEX "audit_entity_type" ON "audit_log" USING btree ("entity_type","entity_id_ref");--> statement-breakpoint
CREATE INDEX "doc_links_document" ON "document_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_links_entity" ON "document_links" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "documents_entity" ON "documents" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "documents_type" ON "documents" USING btree ("entity_id","type");--> statement-breakpoint
CREATE INDEX "documents_status" ON "documents" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "exchange_rates_pair" ON "exchange_rates" USING btree ("from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "exchange_rates_valid" ON "exchange_rates" USING btree ("from_currency","to_currency","valid_from");--> statement-breakpoint
CREATE INDEX "mm_accounts_entity" ON "mobile_money_accounts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "mm_accounts_provider" ON "mobile_money_accounts" USING btree ("entity_id","provider");--> statement-breakpoint
CREATE INDEX "mm_tx_entity" ON "mobile_money_transactions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "mm_tx_account" ON "mobile_money_transactions" USING btree ("mobile_money_account_id");--> statement-breakpoint
CREATE INDEX "mm_tx_provider_id" ON "mobile_money_transactions" USING btree ("provider_tx_id");--> statement-breakpoint
CREATE INDEX "mm_tx_status" ON "mobile_money_transactions" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "mm_tx_date" ON "mobile_money_transactions" USING btree ("entity_id","initiated_at");--> statement-breakpoint
CREATE INDEX "idx_entities_organization" ON "entities" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_entity_access_user_entity" ON "user_entity_access" USING btree ("user_id","entity_id");--> statement-breakpoint
CREATE INDEX "user_entity_access_entity" ON "user_entity_access" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bank_accounts_entity" ON "bank_accounts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bank_tx_entity" ON "bank_transactions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bank_tx_account" ON "bank_transactions" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_tx_date" ON "bank_transactions" USING btree ("entity_id","transaction_date");--> statement-breakpoint
CREATE INDEX "bank_tx_reconciled" ON "bank_transactions" USING btree ("bank_account_id","is_reconciled");--> statement-breakpoint
CREATE INDEX "recon_items_recon" ON "reconciliation_items" USING btree ("reconciliation_id");--> statement-breakpoint
CREATE INDEX "recon_items_tx" ON "reconciliation_items" USING btree ("bank_transaction_id");--> statement-breakpoint
CREATE INDEX "recon_entity" ON "reconciliations" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "recon_account" ON "reconciliations" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "recon_status" ON "reconciliations" USING btree ("entity_id","status");