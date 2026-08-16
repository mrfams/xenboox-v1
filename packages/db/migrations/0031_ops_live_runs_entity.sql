ALTER TABLE "ops_live_runs" ADD COLUMN "entity_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "ops_live_runs_entity" ON "ops_live_runs" USING btree ("entity_id");