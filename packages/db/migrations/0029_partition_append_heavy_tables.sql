-- ─── §17.2 Table Partitioning for Append-Heavy Financial Tables ─────────────
--
-- Converts the 3 largest append-only tables to partitioned tables:
--   1. audit_log — grows with every user/agent action
--   2. bank_transactions — grows with every bank sync
--   3. journal_entries — grows with every journal posting
--
-- Strategy: RANGE partitioning by created_at (monthly partitions).
-- Retention: keep 24 months of hot partitions, archive older ones.
--
-- IMPORTANT: This migration must be run on a direct (non-pooled) connection.
-- On Neon, use the compute endpoint URL, not the pooler URL.

-- ─── 1. audit_log ──────────────────────────────────────────────────────────

-- Create partitioned table
CREATE TABLE IF NOT EXISTS audit_log_partitioned (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id_ref uuid,
  old_values jsonb,
  new_values jsonb,
  confidence numeric(3, 2),
  ip_address text,
  user_agent text,
  actor_type text,
  agent_id text,
  reason text,
  session_id text,
  request_id text,
  seq integer,
  prev_hash text,
  event_hash text,
  payload_hash_input text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for current + next 3 months
CREATE TABLE audit_log_2026_08 PARTITION OF audit_log_partitioned
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_log_2026_09 PARTITION OF audit_log_partitioned
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit_log_2026_10 PARTITION OF audit_log_partitioned
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit_log_2026_11 PARTITION OF audit_log_partitioned
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS audit_log_partitioned_entity ON audit_log_partitioned (entity_id, created_at);
CREATE INDEX IF NOT EXISTS audit_log_partitioned_user ON audit_log_partitioned (user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_log_partitioned_action ON audit_log_partitioned (entity_id, action, created_at);
CREATE INDEX IF NOT EXISTS audit_log_partitioned_seq ON audit_log_partitioned (entity_id, seq);

-- ─── 2. bank_transactions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_transactions_partitioned (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL,
  transaction_date date NOT NULL,
  amount numeric(15, 2) NOT NULL,
  description text,
  reference text,
  category text,
  is_reconciled boolean DEFAULT false NOT NULL,
  reconciled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE bank_tx_partitioned_2026_08 PARTITION OF bank_transactions_partitioned
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE bank_tx_partitioned_2026_09 PARTITION OF bank_transactions_partitioned
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE bank_tx_partitioned_2026_10 PARTITION OF bank_transactions_partitioned
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE bank_tx_partitioned_2026_11 PARTITION OF bank_transactions_partitioned
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Indexes
CREATE INDEX IF NOT EXISTS bank_tx_partitioned_entity ON bank_transactions_partitioned (entity_id, created_at);
CREATE INDEX IF NOT EXISTS bank_tx_partitioned_account ON bank_transactions_partitioned (bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS bank_tx_partitioned_reconciled ON bank_transactions_partitioned (entity_id, is_reconciled) WHERE is_reconciled = false;

-- ─── 3. journal_entries ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries_partitioned (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  description text NOT NULL,
  reference text,
  source_type text,
  source_id uuid,
  status text DEFAULT 'draft' NOT NULL,
  posted_at timestamp with time zone,
  reversed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE journal_entries_partitioned_2026_08 PARTITION OF journal_entries_partitioned
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE journal_entries_partitioned_2026_09 PARTITION OF journal_entries_partitioned
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE journal_entries_partitioned_2026_10 PARTITION OF journal_entries_partitioned
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE journal_entries_partitioned_2026_11 PARTITION OF journal_entries_partitioned
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Indexes
CREATE INDEX IF NOT EXISTS journal_entries_partitioned_entity ON journal_entries_partitioned (entity_id, created_at);
CREATE INDEX IF NOT EXISTS journal_entries_partitioned_date ON journal_entries_partitioned (entity_id, entry_date);
CREATE INDEX IF NOT EXISTS journal_entries_partitioned_status ON journal_entries_partitioned (entity_id, status) WHERE status = 'draft';

-- ─── Notes ─────────────────────────────────────────────────────────────────
-- After verifying the partitioned tables work correctly:
-- 1. Rename old tables: ALTER TABLE audit_log RENAME TO audit_log_legacy;
-- 2. Rename new tables: ALTER TABLE audit_log_partitioned RENAME TO audit_log;
-- 3. Create a pg_cron job to auto-create new monthly partitions
-- 4. Drop legacy tables after 30-day verification period
--
-- DO NOT run this migration automatically — it requires manual oversight.
-- The data migration should be done during a maintenance window.
