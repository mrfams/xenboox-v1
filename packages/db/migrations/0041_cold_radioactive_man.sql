CREATE TABLE "journal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_date" text NOT NULL,
	"period_id" uuid,
	"event_type" text NOT NULL,
	"reverses_event_id" uuid,
	"reason" text,
	"source" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"currency" text NOT NULL,
	"lines" jsonb NOT NULL,
	"prev_event_hash" text NOT NULL,
	"event_hash" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_account_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"debit_minor" bigint DEFAULT 0 NOT NULL,
	"credit_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_events" ADD CONSTRAINT "journal_events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_events" ADD CONSTRAINT "journal_events_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account_balances" ADD CONSTRAINT "ledger_account_balances_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account_balances" ADD CONSTRAINT "ledger_account_balances_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account_balances" ADD CONSTRAINT "ledger_account_balances_period_id_fiscal_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."fiscal_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "journal_events_entity_seq" ON "journal_events" USING btree ("entity_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_events_entity_idem" ON "journal_events" USING btree ("entity_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "journal_events_entity_period" ON "journal_events" USING btree ("entity_id","period_id");--> statement-breakpoint
CREATE INDEX "journal_events_entity_date" ON "journal_events" USING btree ("entity_id","effective_date");--> statement-breakpoint
CREATE INDEX "journal_events_reverses" ON "journal_events" USING btree ("reverses_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_balances_key" ON "ledger_account_balances" USING btree ("entity_id","account_id","period_id","currency");--> statement-breakpoint
CREATE INDEX "ledger_balances_entity_period" ON "ledger_account_balances" USING btree ("entity_id","period_id");
-- ─── Append-only enforcement (Engine v2, KILLPLAN §4.1) ─────────────────────
-- journal_events is INSERT-only. This trigger is the DB-layer guarantee that
-- no posted event can ever be mutated or removed — corrections are reversal
-- events. Documented hand-addition to the drizzle-generated migration
-- (precedent: 0040 USING-cast correction; deviation logged in REBUILD_LOG).
CREATE OR REPLACE FUNCTION ledger_journal_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'journal_events is append-only — corrections are reversal events (event %)', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_events_append_only
  BEFORE UPDATE OR DELETE ON "journal_events"
  FOR EACH ROW EXECUTE FUNCTION ledger_journal_events_append_only();

-- The app role must also lack direct UPDATE/DELETE grants once roles are
-- hardened in deploy config (force-RLS role wiring, Epoch 1).
