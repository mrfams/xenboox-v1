-- ─── Database Performance Optimization ─────────────────────────────────────
--
-- pg_stat_statements: Query performance tracking
-- Autovacuum tuning: Optimize vacuum aggressiveness per table
-- Index recommendations: Based on common query patterns
--
-- Run these against the Neon PostgreSQL database:
--   psql $DATABASE_URL -f scripts/setup-pg-stat-statements.sql
--
-- Safe to run multiple times (idempotent).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. pg_stat_statements Extension
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable pg_stat_statements (requires superuser or Neon extension management)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset statistics (optional — run at start of monitoring period)
-- SELECT pg_stat_statements_reset();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Query Performance Views
-- ═══════════════════════════════════════════════════════════════════════════

-- Top 10 slowest queries by total time
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
  queryid,
  LEFT(query, 120) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_time_ms,
  ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_time_ms,
  rows,
  ROUND((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)) * 100, 2) AS cache_hit_pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Top 10 most called queries
CREATE OR REPLACE VIEW v_most_called_queries AS
SELECT
  queryid,
  LEFT(query, 120) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_time_ms,
  ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
  rows
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Queries with lowest cache hit ratio (need index optimization)
CREATE OR REPLACE VIEW v_low_cache_hit_queries AS
SELECT
  queryid,
  LEFT(query, 120) AS query_preview,
  calls,
  shared_blks_hit,
  shared_blks_read,
  ROUND((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)) * 100, 2) AS cache_hit_pct
FROM pg_stat_statements
WHERE (shared_blks_hit + shared_blks_read) > 100
  AND (shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)) < 0.95
ORDER BY cache_hit_pct ASC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Autovacuum Tuning
-- ═══════════════════════════════════════════════════════════════════════════

-- High-churn tables need more aggressive autovacuum
-- These are financial/audit tables that grow rapidly

-- Audit log — highest churn, needs aggressive vacuum
ALTER TABLE audit_log SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Journal entries — high volume financial data
ALTER TABLE journal_entries SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Bank transactions — append-heavy
ALTER TABLE bank_transactions SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Sales invoices — frequently updated
ALTER TABLE sales_invoices SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- AP invoices — frequently updated
ALTER TABLE invoices_ap SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Chat messages — high volume
ALTER TABLE chat_messages SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Notifications — high churn
ALTER TABLE notifications SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- Retention purge logs — append-only, high volume
ALTER TABLE retention_purge_logs SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2,
  autovacuum_vacuum_cost_limit = 400
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Recommended Indexes
-- ═══════════════════════════════════════════════════════════════════════════

-- Composite index for journal entry queries (entity + date range)
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_date
  ON journal_entries (entity_id, date DESC);

-- Composite index for sales invoices (entity + status + date)
CREATE INDEX IF NOT EXISTS idx_sales_invoices_entity_status_date
  ON sales_invoices (entity_id, status, invoice_date DESC);

-- Composite index for AP invoices (entity + status + date)
CREATE INDEX IF NOT EXISTS idx_invoices_ap_entity_status_date
  ON invoices_ap (entity_id, status, invoice_date DESC);

-- Composite index for bank transactions (entity + date range)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_entity_date
  ON bank_transactions (entity_id, transaction_date DESC);

-- Composite index for audit log (entity + created_at)
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_created
  ON audit_log (entity_id, created_at DESC);

-- Partial index for overdue invoices (hot query)
CREATE INDEX IF NOT EXISTS idx_sales_invoices_overdue
  ON sales_invoices (entity_id, due_date)
  WHERE status = 'overdue';

-- Partial index for overdue AP invoices
CREATE INDEX IF NOT EXISTS idx_invoices_ap_overdue
  ON invoices_ap (entity_id, due_date)
  WHERE status = 'overdue';

-- Composite index for reconciliation (entity + status + date)
CREATE INDEX IF NOT EXISTS idx_reconciliations_entity_status_date
  ON reconciliations (entity_id, status, statement_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Connection Pooling Stats
-- ═══════════════════════════════════════════════════════════════════════════

-- View current connection usage
CREATE OR REPLACE VIEW v_connection_stats AS
SELECT
  state,
  COUNT(*) AS count,
  MAX(NOW() - state_change) AS longest_duration
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Table Bloat Estimation
-- ═══════════════════════════════════════════════════════════════════════════

-- Estimate table bloat (dead tuples that need vacuuming)
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 20;
