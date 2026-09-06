-- RLS catch-up for tables whose RLS statements originally lived in
-- 0010_rls_remaining_tables.sql but referenced tables created later (0015).
-- 
-- Why a new migration:
--   * Fresh databases: 0010 ran before 0015 created these tables, so the
--     original statements failed ("relation does not exist"). The statements
--     were removed from 0010 and live here instead.
--   * Production: this migration's timestamp is above prod's
--     __drizzle_migrations watermark, so drizzle applies it for real —
--     production gets the RLS coverage it was missing all along.
--   * 0030_force_rls later FORCEs RLS on all of these tables.
--
-- All statements are idempotent-safe: DROP POLICY IF EXISTS guards make this
-- deterministic even if a database already carries earlier versions of these
-- policies (e.g. from a pre-migrations db:push era).

-- ─── Model Registry (global, no entity_id) ─────────────────────────
ALTER TABLE "model_registry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mr_any_read" ON "model_registry";
CREATE POLICY mr_any_read ON "model_registry"
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "mr_admin_write" ON "model_registry";
CREATE POLICY mr_admin_write ON "model_registry"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin')
    )
  );

-- ─── Model Assignments (entity-scoped via join) ─────────────────────
ALTER TABLE "model_assignments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ma_entity_read" ON "model_assignments";
CREATE POLICY ma_entity_read ON "model_assignments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
    )
  );

DROP POLICY IF EXISTS "ma_admin_write" ON "model_assignments";
CREATE POLICY ma_admin_write ON "model_assignments"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin', 'finance_director')
    )
  );

-- ─── Model Evaluations (entity-scoped via join) ─────────────────────
ALTER TABLE "model_evaluations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mev_entity_read" ON "model_evaluations";
CREATE POLICY mev_entity_read ON "model_evaluations"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
    )
  );

DROP POLICY IF EXISTS "mev_admin_write" ON "model_evaluations";
CREATE POLICY mev_admin_write ON "model_evaluations"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin', 'finance_director')
    )
  );

-- ─── Model Cost Tracking (entity_id column) ─────────────────────────
ALTER TABLE "model_cost_tracking" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mct_entity_read" ON "model_cost_tracking";
CREATE POLICY mct_entity_read ON "model_cost_tracking"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "mct_entity_write" ON "model_cost_tracking";
CREATE POLICY mct_entity_write ON "model_cost_tracking"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Notifications (user-scoped + entity-scoped) ──────────────────
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_user_read" ON "notifications";
CREATE POLICY notif_user_read ON "notifications"
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "notif_user_write" ON "notifications";
CREATE POLICY notif_user_write ON "notifications"
  FOR ALL USING (
    user_id = current_setting('app.current_user_id')::UUID
  );

-- ─── Bank Connections (entity_id column) ──────────────────────────
ALTER TABLE "bank_connections" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bc_entity_read" ON "bank_connections";
CREATE POLICY bc_entity_read ON "bank_connections"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "bc_entity_write" ON "bank_connections";
CREATE POLICY bc_entity_write ON "bank_connections"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Email Forwarding Rules (entity_id column) ────────────────────
ALTER TABLE "email_forwarding_rules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efr_entity_read" ON "email_forwarding_rules";
CREATE POLICY efr_entity_read ON "email_forwarding_rules"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "efr_entity_write" ON "email_forwarding_rules";
CREATE POLICY efr_entity_write ON "email_forwarding_rules"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Inbound Emails (entity_id column) ────────────────────────────
ALTER TABLE "inbound_emails" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ie_entity_read" ON "inbound_emails";
CREATE POLICY ie_entity_read ON "inbound_emails"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "ie_entity_write" ON "inbound_emails";
CREATE POLICY ie_entity_write ON "inbound_emails"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── CSV Mappings (entity_id column) ──────────────────────────────
ALTER TABLE "csv_mappings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csv_entity_read" ON "csv_mappings";
CREATE POLICY csv_entity_read ON "csv_mappings"
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

DROP POLICY IF EXISTS "csv_entity_write" ON "csv_mappings";
CREATE POLICY csv_entity_write ON "csv_mappings"
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );
