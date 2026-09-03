CREATE UNIQUE INDEX "je_entity_reference" ON "journal_entries" USING btree ("entity_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "je_entity_entry_number" ON "journal_entries" USING btree ("entity_id","entry_number");
