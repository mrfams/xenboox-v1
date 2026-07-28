CREATE TYPE "public"."donor_project_status" AS ENUM('active', 'completed', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."donor_reporting_format" AS ENUM('usaid', 'eu', 'world_bank', 'afdb', 'custom');--> statement-breakpoint
CREATE TABLE "donor_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"donor_customer_id" uuid NOT NULL,
	"project_name" text NOT NULL,
	"project_code" text,
	"grant_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"amount_disbursed" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount_remaining" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reporting_format" "donor_reporting_format" DEFAULT 'custom' NOT NULL,
	"reporting_cadence" text DEFAULT 'quarterly',
	"start_date" text NOT NULL,
	"end_date" text,
	"status" "donor_project_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"budget_allocation" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donor_report_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"donor_project_id" uuid NOT NULL,
	"period" text NOT NULL,
	"budget_vs_actual" jsonb NOT NULL,
	"narrative_summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_by" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"acknowledged_at" timestamp,
	"document_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "is_donor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "donor_projects" ADD CONSTRAINT "donor_projects_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_projects" ADD CONSTRAINT "donor_projects_donor_customer_id_customers_id_fk" FOREIGN KEY ("donor_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_report_snapshots" ADD CONSTRAINT "donor_report_snapshots_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_report_snapshots" ADD CONSTRAINT "donor_report_snapshots_donor_project_id_donor_projects_id_fk" FOREIGN KEY ("donor_project_id") REFERENCES "public"."donor_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dp_entity" ON "donor_projects" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "dp_donor" ON "donor_projects" USING btree ("donor_customer_id");--> statement-breakpoint
CREATE INDEX "dp_status" ON "donor_projects" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "dp_project_code" ON "donor_projects" USING btree ("entity_id","project_code");--> statement-breakpoint
CREATE INDEX "drs_project" ON "donor_report_snapshots" USING btree ("donor_project_id");--> statement-breakpoint
CREATE INDEX "drs_entity" ON "donor_report_snapshots" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "drs_period" ON "donor_report_snapshots" USING btree ("donor_project_id","period");--> statement-breakpoint
CREATE INDEX "drs_status" ON "donor_report_snapshots" USING btree ("entity_id","status");