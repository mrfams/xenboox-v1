ALTER TABLE "conversations" ADD COLUMN "forked_from_conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "forked_from_message_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_forked_from_conversation_id_conversations_id_fk" FOREIGN KEY ("forked_from_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_fork_source_idx" ON "conversations" USING btree ("forked_from_conversation_id");