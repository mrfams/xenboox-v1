CREATE TYPE "public"."close_task_phase" AS ENUM('pre_close', 'closing_entries', 'reconciliations', 'reviews_approvals', 'reporting_finalization');--> statement-breakpoint
CREATE TYPE "public"."close_task_status" AS ENUM('pending', 'in_progress', 'in_review', 'completed', 'blocked', 'skipped');--> statement-breakpoint
CREATE TABLE "close_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"close_session_id" uuid,
	"close_period_id" uuid,
	"period" text NOT NULL,
	"task_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"phase" "close_task_phase" DEFAULT 'pre_close' NOT NULL,
	"phase_order" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"owner_agent" text NOT NULL,
	"owner_initials" text,
	"owner_color" text,
	"status" "close_task_status" DEFAULT 'pending' NOT NULL,
	"confidence" numeric(5, 4),
	"due_date" text,
	"is_auto_completable" boolean DEFAULT true NOT NULL,
	"auto_completed" boolean DEFAULT false NOT NULL,
	"completed_by_user_id" text,
	"completed_at" timestamp,
	"blocked_reason" text,
	"result_details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "close_tasks" ADD CONSTRAINT "close_tasks_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_tasks" ADD CONSTRAINT "close_tasks_close_session_id_close_sessions_id_fk" FOREIGN KEY ("close_session_id") REFERENCES "public"."close_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_tasks" ADD CONSTRAINT "close_tasks_close_period_id_close_periods_id_fk" FOREIGN KEY ("close_period_id") REFERENCES "public"."close_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "close_tasks_entity_period_key" ON "close_tasks" USING btree ("entity_id","period","task_key");--> statement-breakpoint
CREATE INDEX "close_tasks_entity_period" ON "close_tasks" USING btree ("entity_id","period");--> statement-breakpoint
CREATE INDEX "close_tasks_status" ON "close_tasks" USING btree ("entity_id","period","status");--> statement-breakpoint
CREATE INDEX "close_tasks_session" ON "close_tasks" USING btree ("close_session_id");--> statement-breakpoint
CREATE INDEX "close_tasks_phase" ON "close_tasks" USING btree ("entity_id","period","phase");