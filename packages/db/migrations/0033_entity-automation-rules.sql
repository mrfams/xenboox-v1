CREATE TYPE "public"."automation_action_type" AS ENUM('recurring_transaction', 'invoice_reminder', 'bill_reminder', 'report_export');--> statement-breakpoint
CREATE TYPE "public"."automation_run_status" AS ENUM('idle', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('schedule', 'event');--> statement-breakpoint
CREATE TABLE "entity_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" "automation_trigger_type" DEFAULT 'schedule' NOT NULL,
	"schedule_label" varchar(100),
	"schedule_kind" varchar(20),
	"schedule_day" integer,
	"action_type" "automation_action_type" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_run_status" "automation_run_status" DEFAULT 'idle' NOT NULL,
	"last_run_summary" text
);
--> statement-breakpoint
ALTER TABLE "entity_automation_rules" ADD CONSTRAINT "entity_automation_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;