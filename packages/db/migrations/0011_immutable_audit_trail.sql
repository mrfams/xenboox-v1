-- Immutable Audit Trail
-- Enforces append-only semantics on audit_log and security_audit_log
-- using PostgreSQL triggers. RLS provides defense-in-depth; DB triggers
-- provide the iron guarantee.
--
-- Updates and deletes are blocked at the trigger level. Any attempt
-- to modify audit records results in an exception.

-- ─── Audit Log ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: updates are not permitted'
    USING HINT = 'Audit records cannot be modified after creation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: deletes are not permitted'
    USING HINT = 'Audit records cannot be deleted after creation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure created_at is always set correctly
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_immutable();

-- ─── Security Audit Log ───────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_security_audit_log_no_update ON security_audit_log;
CREATE TRIGGER trg_security_audit_log_no_update
  BEFORE UPDATE ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

DROP TRIGGER IF EXISTS trg_security_audit_log_no_delete ON security_audit_log;
CREATE TRIGGER trg_security_audit_log_no_delete
  BEFORE DELETE ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();

DROP TRIGGER IF EXISTS trg_security_audit_log_immutable ON security_audit_log;
CREATE TRIGGER trg_security_audit_log_immutable
  BEFORE INSERT ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_immutable();
