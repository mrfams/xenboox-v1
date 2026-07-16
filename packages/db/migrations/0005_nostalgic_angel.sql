CREATE TYPE "public"."asset_status" AS ENUM('active', 'disposed', 'fully_depreciated', 'under_maintenance');--> statement-breakpoint
CREATE TYPE "public"."depreciation_method" AS ENUM('straight_line', 'reducing_balance', 'units_of_production');--> statement-breakpoint
CREATE TYPE "public"."disposal_method" AS ENUM('sold', 'scrapped', 'donated', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."security_level" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."cost_method" AS ENUM('fifo', 'lifo', 'weighted_average');--> statement-breakpoint
CREATE TYPE "public"."inventory_item_status" AS ENUM('active', 'discontinued', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."inventory_tx_type" AS ENUM('receipt', 'issue', 'adjustment', 'transfer', 'return');--> statement-breakpoint
CREATE TYPE "public"."deduction_type" AS ENUM('tax', 'social_security', 'benefit', 'loan', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contractor', 'intern');--> statement-breakpoint
CREATE TYPE "public"."pay_frequency" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'validated', 'approved', 'paid', 'closed');--> statement-breakpoint
CREATE TABLE "depreciation_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fixed_asset_id" uuid NOT NULL,
	"period_id" uuid,
	"depreciation_amount" numeric(15, 2) NOT NULL,
	"accumulated_depreciation" numeric(15, 2) NOT NULL,
	"net_book_value" numeric(15, 2) NOT NULL,
	"journal_entry_id" uuid,
	"calculated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"asset_class" text NOT NULL,
	"location" text,
	"purchase_date" text NOT NULL,
	"cost" numeric(15, 2) NOT NULL,
	"salvage_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"useful_life_months" integer NOT NULL,
	"depreciation_method" "depreciation_method" DEFAULT 'straight_line' NOT NULL,
	"accumulated_depreciation" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_book_value" numeric(15, 2) NOT NULL,
	"status" "asset_status" DEFAULT 'active' NOT NULL,
	"gl_account_id" uuid,
	"accumulated_depreciation_account_id" uuid,
	"responsible_person" text,
	"condition" text,
	"disposal_date" text,
	"disposal_method" "disposal_method",
	"disposal_proceeds" numeric(15, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encrypted_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"key_version" text NOT NULL,
	"security_level" "security_level" DEFAULT 'confidential' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"user_agent" text,
	"success" boolean DEFAULT true NOT NULL,
	"failure_reason" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"description" text,
	"category" text,
	"unit_of_measure" text DEFAULT 'piece' NOT NULL,
	"cost_method" "cost_method" DEFAULT 'weighted_average' NOT NULL,
	"standard_cost" numeric(15, 2) DEFAULT '0',
	"reorder_level" integer DEFAULT 0,
	"reorder_quantity" integer DEFAULT 0,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"gl_account_id" uuid,
	"cogs_account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"type" "inventory_tx_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(15, 2) NOT NULL,
	"total_cost" numeric(15, 2) NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"journal_entry_id" uuid,
	"transaction_date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"period_id" uuid,
	"quantity_on_hand" integer NOT NULL,
	"unit_cost" numeric(15, 2) NOT NULL,
	"total_value" numeric(15, 2) NOT NULL,
	"valuation_method" "cost_method" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"manager_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_date" text NOT NULL,
	"end_date" text,
	"basic_salary" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"pay_frequency" "pay_frequency" DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"employee_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"hire_date" text NOT NULL,
	"termination_date" text,
	"department" text,
	"job_title" text,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"bank_name" text,
	"bank_account_number" text,
	"bank_sort_code" text,
	"tax_id" text,
	"social_security_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_deduction_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" "deduction_type" NOT NULL,
	"rate_type" text DEFAULT 'percentage' NOT NULL,
	"rate" numeric(10, 4) DEFAULT '0' NOT NULL,
	"ceiling" numeric(15, 2),
	"is_statutory" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"basic_salary" numeric(15, 2) NOT NULL,
	"allowances" jsonb DEFAULT '[]'::jsonb,
	"gross_pay" numeric(15, 2) NOT NULL,
	"paye_tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"social_security_employee" numeric(15, 2) DEFAULT '0' NOT NULL,
	"social_security_employer" numeric(15, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"loan_deduction" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(15, 2) NOT NULL,
	"payment_method" text DEFAULT 'bank_transfer',
	"payment_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" text NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"gross_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_employer_contributions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"processed_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"journal_entry_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"document_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"loan_amount" numeric(15, 2) NOT NULL,
	"monthly_deduction" numeric(15, 2) NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"remaining_balance" numeric(15, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "depreciation_schedule" ADD CONSTRAINT "depreciation_schedule_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_schedule" ADD CONSTRAINT "depreciation_schedule_fixed_asset_id_fixed_assets_id_fk" FOREIGN KEY ("fixed_asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_schedule" ADD CONSTRAINT "depreciation_schedule_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_schedule" ADD CONSTRAINT "depreciation_schedule_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_accumulated_depreciation_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("accumulated_depreciation_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_log" ADD CONSTRAINT "security_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_cogs_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("cogs_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuations" ADD CONSTRAINT "inventory_valuations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuations" ADD CONSTRAINT "inventory_valuations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_valuations" ADD CONSTRAINT "inventory_valuations_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deduction_types" ADD CONSTRAINT "payroll_deduction_types_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_loans" ADD CONSTRAINT "staff_loans_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_loans" ADD CONSTRAINT "staff_loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "depr_sched_entity" ON "depreciation_schedule" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "depr_sched_asset" ON "depreciation_schedule" USING btree ("fixed_asset_id");--> statement-breakpoint
CREATE INDEX "depr_sched_period" ON "depreciation_schedule" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "fixed_assets_entity" ON "fixed_assets" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "fixed_assets_class" ON "fixed_assets" USING btree ("entity_id","asset_class");--> statement-breakpoint
CREATE INDEX "fixed_assets_status" ON "fixed_assets" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "inv_items_entity" ON "inventory_items" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "inv_items_sku" ON "inventory_items" USING btree ("entity_id","sku");--> statement-breakpoint
CREATE INDEX "inv_items_category" ON "inventory_items" USING btree ("entity_id","category");--> statement-breakpoint
CREATE INDEX "inv_tx_entity" ON "inventory_transactions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "inv_tx_item" ON "inventory_transactions" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inv_tx_warehouse" ON "inventory_transactions" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "inv_tx_date" ON "inventory_transactions" USING btree ("entity_id","transaction_date");--> statement-breakpoint
CREATE INDEX "inv_tx_type" ON "inventory_transactions" USING btree ("inventory_item_id","type");--> statement-breakpoint
CREATE INDEX "inv_val_entity" ON "inventory_valuations" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "inv_val_item" ON "inventory_valuations" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inv_val_period" ON "inventory_valuations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "warehouses_entity" ON "warehouses" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "emp_contracts_entity" ON "employee_contracts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "emp_contracts_emp" ON "employee_contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employees_entity" ON "employees" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "employees_number" ON "employees" USING btree ("entity_id","employee_number");--> statement-breakpoint
CREATE INDEX "employees_dept" ON "employees" USING btree ("entity_id","department");--> statement-breakpoint
CREATE INDEX "payroll_ded_entity" ON "payroll_deduction_types" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "payroll_ded_code" ON "payroll_deduction_types" USING btree ("entity_id","code");--> statement-breakpoint
CREATE INDEX "payroll_line_entity" ON "payroll_line_items" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "payroll_line_run" ON "payroll_line_items" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payroll_line_emp" ON "payroll_line_items" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_entity" ON "payroll_runs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_period" ON "payroll_runs" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "payroll_runs_status" ON "payroll_runs" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "payslips_entity" ON "payslips" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "payslips_run" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payslips_emp" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "staff_loans_entity" ON "staff_loans" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "staff_loans_emp" ON "staff_loans" USING btree ("employee_id");