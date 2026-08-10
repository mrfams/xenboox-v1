CREATE TYPE "public"."onboarding_source_type" AS ENUM('brand_new', 'professional_software', 'manual_records', 'statements_only', 'no_records');--> statement-breakpoint
CREATE TYPE "public"."opening_balance_source" AS ENUM('reconstructed', 'owner_confirmed', 'migrated_from_source_system');--> statement-breakpoint
CREATE TYPE "public"."reconstruction_detail_depth" AS ENUM('last_12_months', 'last_3_years', 'full_history');--> statement-breakpoint
CREATE TABLE "opening_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'GMD' NOT NULL,
	"source" "opening_balance_source" NOT NULL,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp,
	"supporting_document_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "onboarding_source_type" "onboarding_source_type";--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "business_start_date" date;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "pre_incorporation_activity" boolean;--> statement-breakpoint
ALTER TABLE "historical_pull_jobs" ADD COLUMN "source_type" "onboarding_source_type";--> statement-breakpoint
ALTER TABLE "historical_pull_jobs" ADD COLUMN "detail_depth" "reconstruction_detail_depth" DEFAULT 'last_12_months' NOT NULL;--> statement-breakpoint
ALTER TABLE "historical_pull_jobs" ADD COLUMN "opening_balance_cutoff_date" date;--> statement-breakpoint
ALTER TABLE "historical_pull_jobs" ADD COLUMN "model_tier_used" text;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "source_type" "onboarding_source_type";--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opening_balances_entity_account" ON "opening_balances" USING btree ("entity_id","account_id");--> statement-breakpoint
CREATE INDEX "opening_balances_entity" ON "opening_balances" USING btree ("entity_id");