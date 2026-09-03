CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "narrative_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"narrative_type" text NOT NULL,
	"period_id" text,
	"summary" text NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb,
	"concerns" jsonb DEFAULT '[]'::jsonb,
	"action" text,
	"confidence" real DEFAULT 0.8,
	"powered_by" text DEFAULT 'llm',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "benchmark_cohorts" ALTER COLUMN "consented_org_ids" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "invoices_ap" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "sales_invoices" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "cash_locations" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "cash_accounts" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "elimination_entries" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "entity_relationships" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "intercompany_tags" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "donor_projects" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "entity_settings" ALTER COLUMN "approval_threshold_currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "sales_estimates" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "expense_claims" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "reimbursement_records" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "entities" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "bank_accounts" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "mobile_money_accounts" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "employee_contracts" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "bank_connections" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "opening_balances" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "statement_lines" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "ops_metrics_daily" ALTER COLUMN "mrr_currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "automation_performance" ALTER COLUMN "cost_savings_currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "recurring_schedules" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "payment_links" ALTER COLUMN "currency" SET DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrative_history" ADD CONSTRAINT "narrative_history_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_entity" ON "analytics_events" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "analytics_events_user" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_event" ON "analytics_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "analytics_events_entity_event" ON "analytics_events" USING btree ("entity_id","event");--> statement-breakpoint
CREATE INDEX "narrative_history_entity" ON "narrative_history" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "narrative_history_type" ON "narrative_history" USING btree ("narrative_type");--> statement-breakpoint
CREATE INDEX "narrative_history_entity_type" ON "narrative_history" USING btree ("entity_id","narrative_type");--> statement-breakpoint
CREATE INDEX "narrative_history_entity_period" ON "narrative_history" USING btree ("entity_id","period_id");