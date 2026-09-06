-- RLS Policies for Remaining Tables
-- Model tables, security tables, and idempotency keys
--
-- NOTE (fresh-DB fix): the tables below that are created in
-- 0015_conscious_namora (model_registry, model_assignments, model_evaluations,
-- model_cost_tracking, notifications, bank_connections, email_forwarding_rules,
-- inbound_emails, csv_mappings) previously had their RLS statements here —
-- but 0015 runs later and creates the tables, so those statements failed on
-- any fresh database ("relation does not exist"). They moved to
-- 0043_rls_catchup.sql, which applies them to BOTH fresh databases and
-- production (production's __drizzle_migrations watermark predates them).
-- Only statements against tables that exist at this point in migration
-- order remain below.

-- ─── Encrypted Fields (entity_id column) ───────────────────────────
ALTER TABLE "encrypted_fields" ENABLE ROW LEVEL SECURITY;

CREATE POLICY ef_entity_read ON "encrypted_fields"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY ef_entity_write ON "encrypted_fields"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Security Audit Log (entity_id column, INSERT-only) ───────────
ALTER TABLE "security_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY sal_entity_read ON "security_audit_log"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- Anyone with entity access can INSERT (audit should never be blocked)
CREATE POLICY sal_entity_insert ON "security_audit_log"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = security_audit_log.entity_id
    )
  );

-- No UPDATE or DELETE policies — audit log is append-only at DB level
CREATE POLICY sal_no_update ON "security_audit_log"
  FOR UPDATE USING (false);

CREATE POLICY sal_no_delete ON "security_audit_log"
  FOR DELETE USING (false);

-- ─── Idempotency Keys (user-scoped) ─────────────────────────────────
-- Created in 0007 (user_id/entity_id are text — no ::UUID cast here).
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;

CREATE POLICY ik_user_read ON "idempotency_keys"
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')
  );

CREATE POLICY ik_user_write ON "idempotency_keys"
  FOR ALL USING (
    user_id = current_setting('app.current_user_id')
  );

-- ─── Model Registry / Assignments / Evaluations / Cost Tracking,
--     Notifications, Bank Connections, Email Forwarding Rules,
--     Inbound Emails, CSV Mappings ─────────────────────────────────
-- Tables are created in 0015; their RLS lives in 0043_rls_catchup.sql.
