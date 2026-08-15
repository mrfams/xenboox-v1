-- Force Row Level Security on all RLS-enabled tables
-- This ensures table owners/roles cannot bypass RLS policies.
-- Required for defense-in-depth: even superusers/owners must go through policies.

-- Also mark set_app_context as STABLE (it only sets session vars, doesn't modify DB)

CREATE OR REPLACE FUNCTION set_app_context(user_id UUID, entity_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, true);
  PERFORM set_config('app.current_entity_id', entity_id::TEXT, true);
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Auth Tables ──────────────────────────────────────────────────────────

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE entities FORCE ROW LEVEL SECURITY;
ALTER TABLE user_entity_access FORCE ROW LEVEL SECURITY;

-- ─── Accounting Tables ────────────────────────────────────────────────────

ALTER TABLE chart_of_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods FORCE ROW LEVEL SECURITY;

-- ─── AP/AR Tables ─────────────────────────────────────────────────────────

ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices_ap FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices FORCE ROW LEVEL SECURITY;

-- ─── Treasury/Cash Tables ─────────────────────────────────────────────────

ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE imprest_floats FORCE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_ledger FORCE ROW LEVEL SECURITY;

-- ─── Mobile Money Tables ──────────────────────────────────────────────────

ALTER TABLE mobile_money_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_transactions FORCE ROW LEVEL SECURITY;

-- ─── Document Tables ──────────────────────────────────────────────────────

ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- ─── Payroll Tables ───────────────────────────────────────────────────────

ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;

-- ─── Fixed Assets Tables ──────────────────────────────────────────────────

ALTER TABLE fixed_assets FORCE ROW LEVEL SECURITY;

-- ─── Inventory Tables ─────────────────────────────────────────────────────

ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
ALTER TABLE warehouses FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions FORCE ROW LEVEL SECURITY;

-- ─── Chat Tables ──────────────────────────────────────────────────────────

ALTER TABLE conversations FORCE ROW LEVEL SECURITY;

-- ─── Model Tables ─────────────────────────────────────────────────────────

ALTER TABLE model_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE model_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE model_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE model_cost_tracking FORCE ROW LEVEL SECURITY;

-- ─── Security Tables ──────────────────────────────────────────────────────

ALTER TABLE encrypted_fields FORCE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;

-- ─── Notification Tables ──────────────────────────────────────────────────

ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- ─── Integration Tables ───────────────────────────────────────────────────

ALTER TABLE bank_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE email_forwarding_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails FORCE ROW LEVEL SECURITY;
ALTER TABLE csv_mappings FORCE ROW LEVEL SECURITY;

-- ─── Legal/Compliance Tables ──────────────────────────────────────────────

ALTER TABLE legal_acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE owner_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE pro_tier_reviews FORCE ROW LEVEL SECURITY;
