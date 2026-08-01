CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'ops_admin', 'finance_admin', 'support_agent', 'read_only_auditor');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_admin_user_id" uuid,
	"actor_role_at_time_of_action" "admin_role",
	"action_type" text NOT NULL,
	"target_entity_type" text NOT NULL,
	"target_entity_id" text,
	"before_value" jsonb,
	"after_value" jsonb,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "admin_role" DEFAULT 'read_only_auditor' NOT NULL,
	"totp_secret_encrypted" text,
	"totp_enrolled" boolean DEFAULT false NOT NULL,
	"ip_allowlist" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_admin_user_id" uuid,
	"last_login_at" timestamp,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"lockout_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "compliance_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"jurisdiction" text NOT NULL,
	"filing_type" text NOT NULL,
	"name" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"period" text,
	"estimated_amount" numeric(15, 2),
	"status" "filing_status" DEFAULT 'pending' NOT NULL,
	"urgency_level" text DEFAULT 'normal',
	"last_checked_at" timestamp,
	"tax_agent_review_status" text DEFAULT 'pending',
	"tax_agent_review_notes" text,
	"package_ready" boolean DEFAULT false NOT NULL,
	"filed_at" timestamp,
	"filing_reference" text,
	"regulatory_status" text DEFAULT 'clean',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_change_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"jurisdiction" text NOT NULL,
	"rule_type" "tax_rule_type" NOT NULL,
	"rule_name" text NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detected_by" text,
	"source_citation" text,
	"source_url" text,
	"source_confidence" numeric(3, 2),
	"old_value" jsonb,
	"new_value" jsonb,
	"effective_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp,
	"applied_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_admin_user_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_deadlines" ADD CONSTRAINT "compliance_deadlines_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_change_proposals" ADD CONSTRAINT "rule_change_proposals_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cd_entity" ON "compliance_deadlines" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "cd_due_date" ON "compliance_deadlines" USING btree ("entity_id","due_date");--> statement-breakpoint
CREATE INDEX "cd_status" ON "compliance_deadlines" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "cd_urgency" ON "compliance_deadlines" USING btree ("entity_id","urgency_level");--> statement-breakpoint
CREATE INDEX "rcp_entity" ON "rule_change_proposals" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "rcp_status" ON "rule_change_proposals" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "rcp_jurisdiction" ON "rule_change_proposals" USING btree ("entity_id","jurisdiction");