ALTER TYPE "public"."tax_rule_type" ADD VALUE 'sales_tax' BEFORE 'paye';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'social_security';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'excise';--> statement-breakpoint
ALTER TYPE "public"."tax_rule_type" ADD VALUE 'other';--> statement-breakpoint
CREATE TABLE "tax_rate_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"tax_rule_id" uuid NOT NULL,
	"applies_to_type" text NOT NULL,
	"applies_to_id" text NOT NULL,
	"applies_to_name" text,
	"rate" numeric(6, 4),
	"fixed_amount" numeric(15, 2),
	"effective_from" text NOT NULL,
	"effective_to" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jurisdiction_tax_rules" ADD COLUMN "applies_to" text DEFAULT 'sales';--> statement-breakpoint
ALTER TABLE "tax_rate_overrides" ADD CONSTRAINT "tax_rate_overrides_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rate_overrides" ADD CONSTRAINT "tax_rate_overrides_tax_rule_id_jurisdiction_tax_rules_id_fk" FOREIGN KEY ("tax_rule_id") REFERENCES "public"."jurisdiction_tax_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tro_entity" ON "tax_rate_overrides" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tro_tax_rule" ON "tax_rate_overrides" USING btree ("tax_rule_id");--> statement-breakpoint
CREATE INDEX "tro_target" ON "tax_rate_overrides" USING btree ("entity_id","applies_to_type","applies_to_id");