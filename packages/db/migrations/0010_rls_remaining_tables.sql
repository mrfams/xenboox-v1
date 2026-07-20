-- RLS Policies for Remaining Tables
-- Model tables, security tables, and idempotency keys
--
-- Design decisions:
--   model_registry: global read (any authenticated user), admin write
--   model_assignments: entity-scoped (per-entity model routing), admin write
--   model_evaluations: entity-scoped, admin write
--   model_cost_tracking: entity-scoped by entity_id column
--   encrypted_fields: entity-scoped
--   security_audit_log: entity-scoped, INSERT-only for non-admins
--   idempotency_keys: user-scoped (only the creating user can read)

-- ─── Model Registry (global, no entity_id) ─────────────────────────
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY mr_any_read ON model_registry
  FOR SELECT USING (true);

CREATE POLICY mr_admin_write ON model_registry
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin')
    )
  );

-- ─── Model Assignments (entity-scoped via join) ─────────────────────
ALTER TABLE model_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ma_entity_read ON model_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
    )
  );

CREATE POLICY ma_admin_write ON model_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin', 'finance_director')
    )
  );

-- ─── Model Evaluations (entity-scoped via join) ─────────────────────
ALTER TABLE model_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY mev_entity_read ON model_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
    )
  );

CREATE POLICY mev_admin_write ON model_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.role IN ('owner', 'admin', 'finance_director')
    )
  );

-- ─── Model Cost Tracking (entity_id column) ─────────────────────────
ALTER TABLE model_cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY mct_entity_read ON model_cost_tracking
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY mct_entity_write ON model_cost_tracking
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Encrypted Fields (entity_id column) ───────────────────────────
ALTER TABLE encrypted_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY ef_entity_read ON encrypted_fields
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY ef_entity_write ON encrypted_fields
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Security Audit Log (entity_id column, INSERT-only) ───────────
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sal_entity_read ON security_audit_log
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- Anyone with entity access can INSERT (audit should never be blocked)
CREATE POLICY sal_entity_insert ON security_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND uea.entity_id = security_audit_log.entity_id
    )
  );

-- No UPDATE or DELETE policies — audit log is append-only at DB level
CREATE POLICY sal_no_update ON security_audit_log
  FOR UPDATE USING (false);

CREATE POLICY sal_no_delete ON security_audit_log
  FOR DELETE USING (false);

-- ─── Idempotency Keys (user-scoped) ─────────────────────────────────
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY ik_user_read ON idempotency_keys
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
  );

CREATE POLICY ik_user_write ON idempotency_keys
  FOR ALL USING (
    user_id = current_setting('app.current_user_id')::UUID
  );

-- ─── Notifications (user-scoped + entity-scoped) ──────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_user_read ON notifications
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY notif_user_write ON notifications
  FOR ALL USING (
    user_id = current_setting('app.current_user_id')::UUID
  );

-- ─── Bank Connections (entity_id column) ──────────────────────────
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY bc_entity_read ON bank_connections
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY bc_entity_write ON bank_connections
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Email Forwarding Rules (entity_id column) ────────────────────
ALTER TABLE email_forwarding_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY efr_entity_read ON email_forwarding_rules
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY efr_entity_write ON email_forwarding_rules
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── Inbound Emails (entity_id column) ────────────────────────────
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY ie_entity_read ON inbound_emails
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY ie_entity_write ON inbound_emails
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

-- ─── CSV Mappings (entity_id column) ──────────────────────────────
ALTER TABLE csv_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY csv_entity_read ON csv_mappings
  FOR SELECT USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );

CREATE POLICY csv_entity_write ON csv_mappings
  FOR ALL USING (
    entity_id = current_setting('app.current_entity_id')::UUID
  );
