CREATE TYPE "public"."agent_model" AS ENUM('haiku-4-5', 'sonnet-4-6');--> statement-breakpoint
CREATE TYPE "public"."agent_name" AS ENUM('cfo', 'controller', 'treasury', 'payroll_manager', 'compliance', 'ledger', 'ap', 'ar', 'asset', 'inventory', 'reconciliation', 'cash', 'mobile_money', 'expense', 'payroll_worker', 'tax', 'audit', 'reporting', 'budget', 'analytics', 'document');--> statement-breakpoint
CREATE TYPE "public"."agent_tier" AS ENUM('strategic', 'management', 'worker', 'platform');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."close_period_status" AS ENUM('open', 'pending_close', 'closed', 'reopened');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "agent_name" NOT NULL,
	"display_name" text NOT NULL,
	"tier" "agent_tier" NOT NULL,
	"model" "agent_model" DEFAULT 'haiku-4-5' NOT NULL,
	"reports_to" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"requested_by_agent_id" uuid NOT NULL,
	"approval_type" text NOT NULL,
	"target_record_type" text NOT NULL,
	"target_record_id" uuid NOT NULL,
	"reasoning" text,
	"confidence" numeric(3, 2),
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_user_id" uuid,
	"resolved_at" timestamp,
	"resolution_note" text,
	"escalated_to_agent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "close_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fiscal_period_id" uuid NOT NULL,
	"period_month" text NOT NULL,
	"status" "close_period_status" DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp,
	"reopened_at" timestamp,
	"reopened_reason" text,
	"prior_version_snapshot_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_dataset_evals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"scenario_description" text NOT NULL,
	"expected_output" jsonb NOT NULL,
	"actual_output" jsonb,
	"passed" boolean,
	"confidence" numeric(3, 2),
	"run_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" numeric,
	"model_version" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_reports_to_agents_id_fk" FOREIGN KEY ("reports_to") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_agent_id_agents_id_fk" FOREIGN KEY ("requested_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_escalated_to_agent_id_agents_id_fk" FOREIGN KEY ("escalated_to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_periods" ADD CONSTRAINT "close_periods_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_periods" ADD CONSTRAINT "close_periods_fiscal_period_id_fiscal_periods_id_fk" FOREIGN KEY ("fiscal_period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_periods" ADD CONSTRAINT "close_periods_closed_by_agents_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_periods" ADD CONSTRAINT "close_periods_prior_version_snapshot_id_close_periods_id_fk" FOREIGN KEY ("prior_version_snapshot_id") REFERENCES "public"."close_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "golden_dataset_evals" ADD CONSTRAINT "golden_dataset_evals_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_tier" ON "agents" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "agents_reports_to" ON "agents" USING btree ("reports_to");--> statement-breakpoint
CREATE INDEX "approvals_entity" ON "approvals" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "approvals_agent" ON "approvals" USING btree ("requested_by_agent_id");--> statement-breakpoint
CREATE INDEX "approvals_status" ON "approvals" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "approvals_target" ON "approvals" USING btree ("target_record_type","target_record_id");--> statement-breakpoint
CREATE INDEX "approvals_assigned" ON "approvals" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "approvals_created" ON "approvals" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cp_entity_period" ON "close_periods" USING btree ("entity_id","period_month");--> statement-breakpoint
CREATE INDEX "cp_entity" ON "close_periods" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "cp_status" ON "close_periods" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "gde_agent" ON "golden_dataset_evals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "gde_passed" ON "golden_dataset_evals" USING btree ("agent_id","passed");--> statement-breakpoint
CREATE INDEX "gde_run_at" ON "golden_dataset_evals" USING btree ("agent_id","run_at");