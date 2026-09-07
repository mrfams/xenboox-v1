CREATE TYPE "public"."correction_status" AS ENUM('pending', 'accepted', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."correction_type" AS ENUM('categorization', 'amount', 'vendor', 'account', 'tax', 'duplicate', 'description');--> statement-breakpoint
CREATE TYPE "public"."recurring_direction" AS ENUM('ar', 'ap');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_link_status" AS ENUM('active', 'expired', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "ai_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"task_type" text NOT NULL,
	"original_decision" jsonb NOT NULL,
	"original_confidence" numeric(3, 2),
	"corrected_decision" jsonb NOT NULL,
	"correction_type" "correction_type" NOT NULL,
	"status" "correction_status" DEFAULT 'pending' NOT NULL,
	"reference_entity_type" text,
	"reference_entity_id" uuid,
	"pattern_key" text,
	"times_seen" integer DEFAULT 1 NOT NULL,
	"learned" boolean DEFAULT false NOT NULL,
	"corrected_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_archive_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"archive_date" timestamp with time zone NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"r2_bucket" varchar(255) NOT NULL,
	"r2_key" varchar(500) NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"metadata" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "auto_approve_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"rule_id" uuid,
	"approval_type" text NOT NULL,
	"target_record_type" text NOT NULL,
	"target_record_id" uuid NOT NULL,
	"matched_conditions" jsonb,
	"action" text NOT NULL,
	"amount" numeric(15, 2),
	"confidence" numeric(3, 2),
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_approve_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"conditions" jsonb NOT NULL,
	"action" text DEFAULT 'auto_approve' NOT NULL,
	"max_amount" numeric(15, 2),
	"confidence" numeric(3, 2) DEFAULT '0.5',
	"learned_from" integer DEFAULT 0,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text DEFAULT 'ai',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conflict_resolution_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strategy" text NOT NULL,
	"conflict_count" integer NOT NULL,
	"conflicts" jsonb,
	"resolved_values" jsonb,
	"local_updated_at" timestamp,
	"remote_updated_at" timestamp,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" uuid NOT NULL,
	"table_name" varchar(255) NOT NULL,
	"retention_days" integer DEFAULT 90 NOT NULL,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"retention_column" varchar(100),
	"exclusion_where" text,
	"description" text,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "retention_purge_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"table_name" varchar(255) NOT NULL,
	"rows_purged" integer DEFAULT 0 NOT NULL,
	"cutoff_date" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error" text,
	"triggered_by" varchar(50) DEFAULT 'cron' NOT NULL,
	"run_id" varchar(100),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "kg_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"source_type" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"relation_type" text NOT NULL,
	"relation_label" text,
	"weight" numeric(5, 2) DEFAULT '1.0',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"confidence" numeric(3, 2) DEFAULT '1.0',
	"source" text DEFAULT 'system',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"node_type" text NOT NULL,
	"internal_id" text NOT NULL,
	"internal_table" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"embedding" text,
	"relationship_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"graph_data" jsonb,
	"node_types" jsonb,
	"edge_types" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "settings_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"label" text,
	"settings" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"generated_invoice_id" uuid,
	"invoice_number" text,
	"amount" numeric(15, 2),
	"status" text DEFAULT 'generated' NOT NULL,
	"error" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"direction" "recurring_direction" NOT NULL,
	"customer_id" uuid,
	"supplier_id" uuid,
	"template_name" text NOT NULL,
	"template_description" text,
	"template_lines" jsonb DEFAULT '[]' NOT NULL,
	"frequency" "recurring_frequency" NOT NULL,
	"interval_value" integer DEFAULT 1 NOT NULL,
	"day_of_month" integer,
	"day_of_week" integer,
	"start_date" text NOT NULL,
	"end_date" text,
	"next_run_date" text NOT NULL,
	"last_run_date" text,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"tax_rate" numeric(5, 2),
	"discount_percent" numeric(5, 2),
	"payment_terms" text DEFAULT 'net30',
	"notes" text,
	"status" "recurring_status" DEFAULT 'active' NOT NULL,
	"total_generated" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"token" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"status" "payment_link_status" DEFAULT 'active' NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp,
	"paid_at" timestamp,
	"paid_amount" numeric(15, 2),
	"expires_at" timestamp,
	"payment_methods" text DEFAULT 'card,bank_transfer,mobile_money',
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "category" text DEFAULT 'Uncategorized';--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "gl_account_id" uuid;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "categorization_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "categorized_by" text;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_approve_log" ADD CONSTRAINT "auto_approve_log_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_approve_log" ADD CONSTRAINT "auto_approve_log_rule_id_auto_approve_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."auto_approve_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_approve_rules" ADD CONSTRAINT "auto_approve_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_resolution_history" ADD CONSTRAINT "conflict_resolution_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_edges" ADD CONSTRAINT "kg_edges_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_nodes" ADD CONSTRAINT "kg_nodes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_snapshots" ADD CONSTRAINT "kg_snapshots_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_audit_log" ADD CONSTRAINT "settings_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_versions" ADD CONSTRAINT "settings_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_runs" ADD CONSTRAINT "recurring_runs_schedule_id_recurring_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."recurring_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_runs" ADD CONSTRAINT "recurring_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_corrections_entity" ON "ai_corrections" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ai_corrections_agent" ON "ai_corrections" USING btree ("entity_id","agent_name");--> statement-breakpoint
CREATE INDEX "ai_corrections_status" ON "ai_corrections" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "ai_corrections_type" ON "ai_corrections" USING btree ("correction_type");--> statement-breakpoint
CREATE INDEX "ai_corrections_pattern" ON "ai_corrections" USING btree ("entity_id","pattern_key");--> statement-breakpoint
CREATE INDEX "ai_corrections_reference" ON "ai_corrections" USING btree ("reference_entity_type","reference_entity_id");--> statement-breakpoint
CREATE INDEX "audit_archive_entity_id" ON "audit_archive_manifests" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_archive_date" ON "audit_archive_manifests" USING btree ("archive_date");--> statement-breakpoint
CREATE INDEX "audit_archive_status" ON "audit_archive_manifests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_archive_entity_date" ON "audit_archive_manifests" USING btree ("entity_id","archive_date");--> statement-breakpoint
CREATE INDEX "auto_approve_log_entity" ON "auto_approve_log" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "auto_approve_log_rule" ON "auto_approve_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "auto_approve_log_date" ON "auto_approve_log" USING btree ("entity_id","approved_at");--> statement-breakpoint
CREATE INDEX "auto_approve_entity" ON "auto_approve_rules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "auto_approve_active" ON "auto_approve_rules" USING btree ("entity_id","is_active");--> statement-breakpoint
CREATE INDEX "auto_approve_type" ON "auto_approve_rules" USING btree ("entity_id","conditions");--> statement-breakpoint
CREATE INDEX "conflict_resolution_user_id" ON "conflict_resolution_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conflict_resolution_created_at" ON "conflict_resolution_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conflict_resolution_strategy" ON "conflict_resolution_history" USING btree ("strategy");--> statement-breakpoint
CREATE INDEX "retention_policies_entity_id" ON "retention_policies" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "retention_policies_table_name" ON "retention_policies" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "retention_policies_entity_table" ON "retention_policies" USING btree ("entity_id","table_name");--> statement-breakpoint
CREATE INDEX "retention_purge_logs_entity_id" ON "retention_purge_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "retention_purge_logs_policy_id" ON "retention_purge_logs" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "retention_purge_logs_status" ON "retention_purge_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "retention_purge_logs_created_at" ON "retention_purge_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kg_edges_entity" ON "kg_edges" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "kg_edges_source" ON "kg_edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "kg_edges_target" ON "kg_edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "kg_edges_relation" ON "kg_edges" USING btree ("entity_id","relation_type");--> statement-breakpoint
CREATE INDEX "kg_edges_type_pair" ON "kg_edges" USING btree ("entity_id","source_type","target_type");--> statement-breakpoint
CREATE INDEX "kg_nodes_entity" ON "kg_nodes" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "kg_nodes_type" ON "kg_nodes" USING btree ("entity_id","node_type");--> statement-breakpoint
CREATE INDEX "kg_nodes_internal" ON "kg_nodes" USING btree ("internal_table","internal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kg_nodes_unique" ON "kg_nodes" USING btree ("entity_id","node_type","internal_id");--> statement-breakpoint
CREATE INDEX "kg_snapshots_entity" ON "kg_snapshots" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "settings_audit_user_id" ON "settings_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settings_audit_created_at" ON "settings_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "settings_versions_user_id" ON "settings_versions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settings_versions_user_version" ON "settings_versions" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "recurring_runs_schedule" ON "recurring_runs" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "recurring_runs_entity" ON "recurring_runs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "recurring_entity" ON "recurring_schedules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "recurring_status" ON "recurring_schedules" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "recurring_next_run" ON "recurring_schedules" USING btree ("next_run_date","status");--> statement-breakpoint
CREATE INDEX "recurring_direction" ON "recurring_schedules" USING btree ("entity_id","direction");--> statement-breakpoint
CREATE INDEX "payment_links_entity" ON "payment_links" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "payment_links_invoice" ON "payment_links" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_links_token" ON "payment_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "payment_links_status" ON "payment_links" USING btree ("entity_id","status");--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;