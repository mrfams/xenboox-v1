-- ─── 0034: Audit chain + immutability fix ──────────────────────────────────
--
-- Two real defects shipped in earlier migrations and never present on
-- databases provisioned via `drizzle-kit push` (which skips custom SQL):
--
-- 1. Migration 0011's enforce_audit_log_immutable() references NEW.created_at
--    but security_audit_log has a `timestamp` column (no created_at) — every
--    INSERT into security_audit_log failed with `record "new" has no field
--    "created_at"`. Fixed with a table-aware default.
--
-- 2. Migration 0025's tamper-evident hash chain (audit_log_payload_text,
--    audit_log_chain_row, trg_audit_log_chain, audit_entity_seq_unique +
--    backfill) was never applied on pushed databases. Applied here so every
--    environment has a verified chain.
--
-- 3. No TRUNCATE protection existed: the table owner could TRUNCATE both
--    audit tables, bypassing the append-only triggers. Added BEFORE TRUNCATE
--    triggers that raise, closing the last mutation path.
--
-- Idempotent: safe to apply more than once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint

-- ─── 1. Fix the immutable INSERT trigger (table-aware default) ─────────────
CREATE OR REPLACE FUNCTION enforce_audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'security_audit_log' THEN
      NEW.timestamp = COALESCE(NEW.timestamp, NOW());
    ELSE
      NEW.created_at = COALESCE(NEW.created_at, NOW());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- ─── 2. Tamper-evident audit chain (from 0025, made idempotent) ────────────
CREATE OR REPLACE FUNCTION audit_log_payload_text(
  a_entity_id uuid,
  a_action text,
  a_entity_type text,
  a_entity_id_ref uuid,
  a_actor_type text,
  a_user_id uuid,
  a_agent_id text,
  a_reason text,
  a_old_values jsonb,
  a_new_values jsonb,
  a_confidence numeric,
  a_ip_address text,
  a_user_agent text,
  a_session_id text,
  a_request_id text,
  a_created_at timestamptz
) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT jsonb_build_object(
    'action', a_action,
    'actorType', a_actor_type,
    'agentId', a_agent_id,
    'confidence', a_confidence::text,
    'createdAt', to_char(a_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'entityId', a_entity_id::text,
    'entityIdRef', a_entity_id_ref::text,
    'entityType', a_entity_type,
    'ipAddress', a_ip_address,
    'newValues', a_new_values,
    'oldValues', a_old_values,
    'reason', a_reason,
    'requestId', a_request_id,
    'sessionId', a_session_id,
    'userAgent', a_user_agent,
    'userId', a_user_id::text
  )::text;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION audit_log_chain_row() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_prev_hash text;
  v_payload text;
  v_seq integer;
BEGIN
  -- Serialize inserts for this entity. SELECT FOR UPDATE on the entity row.
  PERFORM 1 FROM entities WHERE id = NEW.entity_id FOR UPDATE;

  SELECT event_hash INTO v_prev_hash
  FROM audit_log
  WHERE entity_id = NEW.entity_id
  ORDER BY seq DESC NULLS LAST, created_at DESC, id DESC
  LIMIT 1;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq FROM audit_log WHERE entity_id = NEW.entity_id;

  v_payload := audit_log_payload_text(
    NEW.entity_id, NEW.action, NEW.entity_type, NEW.entity_id_ref,
    NEW.actor_type, NEW.user_id, NEW.agent_id, NEW.reason,
    NEW.old_values, NEW.new_values, NEW.confidence,
    NEW.ip_address, NEW.user_agent, NEW.session_id, NEW.request_id,
    COALESCE(NEW.created_at, now())
  );

  NEW.seq := v_seq;
  NEW.prev_hash := COALESCE(v_prev_hash, encode(digest('xenboox-audit-genesis', 'sha256'), 'hex'));
  NEW.event_hash := encode(digest(NEW.prev_hash || E'\n' || v_payload, 'sha256'), 'hex');
  NEW.payload_hash_input := v_payload;
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_audit_log_chain ON audit_log;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_chain
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_chain_row();--> statement-breakpoint

-- Unique per-entity sequence: hard guarantees no two events of one entity can
-- share a seq (NULLs are pre-backfill rows and remain allowed).
CREATE UNIQUE INDEX IF NOT EXISTS "audit_entity_seq_unique" ON "audit_log" ("entity_id", "seq");--> statement-breakpoint

-- ─── 3. Backfill existing history ──────────────────────────────────────────
-- One-time (idempotent): recompute the chain for every existing row using the
-- same payload expression, so the full history verifies from day one. Rows
-- whose chain fields are already set are skipped.
--
-- The UPDATE must not be blocked: drop the append-only UPDATE/DELETE guards
-- on audit_log first (they are re-created idempotently in section 5).
DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_security_audit_log_no_update ON security_audit_log;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_security_audit_log_no_delete ON security_audit_log;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_security_audit_log_immutable ON security_audit_log;--> statement-breakpoint

WITH RECURSIVE ordered AS (
  SELECT
    al.id,
    al.entity_id,
    row_number() OVER (
      PARTITION BY al.entity_id ORDER BY al.created_at, al.id
    ) AS rn,
    audit_log_payload_text(
      al.entity_id, al.action, al.entity_type, al.entity_id_ref,
      al.actor_type, al.user_id, al.agent_id, al.reason,
      al.old_values, al.new_values, al.confidence,
      al.ip_address, al.user_agent, al.session_id, al.request_id,
      al.created_at
    ) AS payload
  FROM audit_log al
  WHERE al.seq IS NULL OR al.prev_hash IS NULL OR al.event_hash IS NULL OR al.payload_hash_input IS NULL
),
chain AS (
  SELECT
    o.id,
    o.entity_id,
    o.rn,
    o.payload,
    encode(digest('xenboox-audit-genesis', 'sha256'), 'hex') AS prev_hash,
    encode(digest(
      encode(digest('xenboox-audit-genesis', 'sha256'), 'hex') || E'\n' || o.payload,
      'sha256'
    ), 'hex') AS event_hash
  FROM ordered o
  WHERE o.rn = 1

  UNION ALL

  SELECT
    o.id,
    o.entity_id,
    o.rn,
    o.payload,
    c.event_hash AS prev_hash,
    encode(digest(c.event_hash || E'\n' || o.payload, 'sha256'), 'hex') AS event_hash
  FROM ordered o
  JOIN chain c ON c.entity_id = o.entity_id AND c.rn = o.rn - 1
)
UPDATE audit_log al
SET
  seq = c.rn,
  prev_hash = c.prev_hash,
  event_hash = c.event_hash,
  payload_hash_input = c.payload
FROM chain c
WHERE al.id = c.id;--> statement-breakpoint

-- ─── 4. TRUNCATE protection (closes the last append-only bypass) ───────────
CREATE OR REPLACE FUNCTION audit_log_block_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: TRUNCATE is not permitted';
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_audit_log_no_truncate ON audit_log;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_truncate();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_security_audit_log_no_truncate ON security_audit_log;--> statement-breakpoint
CREATE TRIGGER trg_security_audit_log_no_truncate
  BEFORE TRUNCATE ON security_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_truncate();--> statement-breakpoint

-- ─── 5. Re-assert immutability triggers (idempotent) ───────────────────────
DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_immutable
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_immutable();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_security_audit_log_no_update ON security_audit_log;--> statement-breakpoint
CREATE TRIGGER trg_security_audit_log_no_update
  BEFORE UPDATE ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_security_audit_log_no_delete ON security_audit_log;--> statement-breakpoint
CREATE TRIGGER trg_security_audit_log_no_delete
  BEFORE DELETE ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_delete();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_security_audit_log_immutable ON security_audit_log;--> statement-breakpoint
CREATE TRIGGER trg_security_audit_log_immutable
  BEFORE INSERT ON security_audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_audit_log_immutable();--> statement-breakpoint
