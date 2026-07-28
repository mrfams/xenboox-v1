CREATE TABLE "entity_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"approval_threshold_minor" numeric(15, 2) DEFAULT '50000' NOT NULL,
	"approval_threshold_currency" text DEFAULT 'GMD' NOT NULL,
	"always_require_approval" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fiscal_locale_overrides" jsonb DEFAULT '{}'::jsonb,
	"fiscal_year_start_month" integer DEFAULT 1,
	"allow_auto_approve" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_settings_entity_id_unique" UNIQUE("entity_id")
);
--> statement-breakpoint
CREATE TABLE "journal_entry_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"source_reference" text,
	"source_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_settings" ADD CONSTRAINT "entity_settings_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_sources" ADD CONSTRAINT "journal_entry_sources_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entity_settings_entity" ON "entity_settings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "jes_journal_entry" ON "journal_entry_sources" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "jes_source" ON "journal_entry_sources" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jes_unique_source" ON "journal_entry_sources" USING btree ("journal_entry_id","source_type","source_id");