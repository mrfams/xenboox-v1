-- Catch-up constraints for objects that could not be created earlier in the
-- migration sequence (their tables are created in 0015_conscious_namora):
--   * From 0013_financial_check_constraints: budget_lines amount check
--     (original referenced "budget_line_items" with columns that never existed;
--     budget_lines uses annual_amount).
--   * From 0014_unique_constraints_and_indexes: bank_connections + email rules
--     unique indexes (tables created in 0015, after 0014).
--   * Budget-lines CHECK from 0013.
-- These run on production too (timestamp above prod's __drizzle_migrations
-- watermark). Idempotent via IF NOT EXISTS / IF EXISTS.

-- ─── Budget lines: annual amount must be non-negative ──────────────
ALTER TABLE "budget_lines" DROP CONSTRAINT IF EXISTS "budget_lines_annual_amount_check";
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_annual_amount_check" CHECK ("annual_amount" >= 0);

-- ─── Bank connections: provider_connection_id unique per provider ──
DROP INDEX IF EXISTS "bank_conn_provider_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "bank_conn_provider_unique"
  ON "bank_connections" ("provider", "provider_connection_id");

-- ─── Email forwarding rules: address unique per entity ─────────────
DROP INDEX IF EXISTS "email_rules_entity_address_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "email_rules_entity_address_unique"
  ON "email_forwarding_rules" ("entity_id", "email_address");
