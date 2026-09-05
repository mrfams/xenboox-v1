ALTER TABLE "ops_live_runs" ADD COLUMN "conversation_id" text;
--> statement-breakpoint
CREATE INDEX "ops_live_runs_conversation" ON "ops_live_runs" USING btree ("conversation_id");
--> statement-breakpoint
ALTER TABLE "close_tasks" ADD COLUMN "conversation_id" text;
--> statement-breakpoint
CREATE INDEX "close_tasks_conversation" ON "close_tasks" USING btree ("conversation_id");
--> statement-breakpoint
ALTER TABLE "daily_close_runs" ADD COLUMN "conversation_id" text;
--> statement-breakpoint
CREATE INDEX "daily_close_conversation" ON "daily_close_runs" USING btree ("conversation_id");
