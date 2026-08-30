CREATE TYPE "public"."daily_close_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'exception');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"message" varchar(500) NOT NULL,
	"link_text" varchar(100) DEFAULT 'Learn more →' NOT NULL,
	"link_href" varchar(500) DEFAULT '/blog' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_close_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"close_date" text NOT NULL,
	"status" "daily_close_status" DEFAULT 'pending' NOT NULL,
	"bank_reconciliation_status" text,
	"cash_count_status" text,
	"mobile_money_status" text,
	"transaction_categorization_status" text,
	"transactions_processed" numeric DEFAULT '0',
	"anomalies_detected" numeric DEFAULT '0',
	"auto_matched" numeric DEFAULT '0',
	"needs_human_review" numeric DEFAULT '0',
	"agent_results" jsonb,
	"exceptions" jsonb,
	"overall_confidence" numeric,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donor_portal_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"donor_customer_id" uuid NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donor_portal_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entity_id" text,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_signup_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer,
	"description" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" text NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referee_email" text NOT NULL,
	"referee_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reward_granted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"rewarded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nps_score" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nps_comment" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nps_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_close_runs" ADD CONSTRAINT "daily_close_runs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_portal_tokens" ADD CONSTRAINT "donor_portal_tokens_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_portal_tokens" ADD CONSTRAINT "donor_portal_tokens_donor_customer_id_customers_id_fk" FOREIGN KEY ("donor_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_signup_id_referral_signups_id_fk" FOREIGN KEY ("referral_signup_id") REFERENCES "public"."referral_signups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signups" ADD CONSTRAINT "referral_signups_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signups" ADD CONSTRAINT "referral_signups_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_signups" ADD CONSTRAINT "referral_signups_referee_user_id_users_id_fk" FOREIGN KEY ("referee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_is_active" ON "announcements" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "daily_close_entity_date" ON "daily_close_runs" USING btree ("entity_id","close_date");--> statement-breakpoint
CREATE INDEX "daily_close_status" ON "daily_close_runs" USING btree ("entity_id","status");--> statement-breakpoint
CREATE INDEX "daily_close_date" ON "daily_close_runs" USING btree ("close_date");--> statement-breakpoint
CREATE INDEX "dpt_entity" ON "donor_portal_tokens" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "dpt_donor" ON "donor_portal_tokens" USING btree ("donor_customer_id");--> statement-breakpoint
CREATE INDEX "dpt_token" ON "donor_portal_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "dpt_email" ON "donor_portal_tokens" USING btree ("entity_id","email");