-- Add last_used_entity_id to users table for cross-device entity persistence
ALTER TABLE "users" ADD COLUMN "last_used_entity_id" uuid;

-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_last_used_entity_id_fk"
  FOREIGN KEY ("last_used_entity_id") REFERENCES "entities"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX "idx_users_last_used_entity" ON "users" ("last_used_entity_id");
