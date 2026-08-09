CREATE TYPE "public"."bank_rule_match_type" AS ENUM('description_contains', 'description_equals', 'reference_contains', 'amount_equals', 'amount_above', 'amount_below');--> statement-breakpoint
CREATE TABLE "bank_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"match_type" "bank_rule_match_type" NOT NULL,
	"match_value" text NOT NULL,
	"category" text DEFAULT 'Uncategorized' NOT NULL,
	"gl_account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "is_1099" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_rules" ADD CONSTRAINT "bank_rules_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_rules" ADD CONSTRAINT "bank_rules_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_rules_entity" ON "bank_rules" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bank_rules_active" ON "bank_rules" USING btree ("entity_id","is_active");