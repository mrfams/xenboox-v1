-- Row-Level Security Migration
-- NOTE: This migration requires WebSocket connections or a connection pooler
-- (e.g., PgBouncer) to support session-level variables (SET LOCAL).
-- Neon's HTTP driver does not support session variables.
--
-- Application-level entity scoping is already enforced in all tRPC routers.
-- These policies provide defense-in-depth at the database layer.

-- Helper function to set session context
CREATE OR REPLACE FUNCTION set_app_context(user_id UUID, entity_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, true);
  PERFORM set_config('app.current_entity_id', entity_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;

-- ─── Auth Tables ──────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_read ON users
  FOR SELECT USING (id = current_setting('app.current_user_id')::UUID);
CREATE POLICY users_own_write ON users
  FOR UPDATE USING (id = current_setting('app.current_user_id')::UUID);

-- ─── Organization Tables ──────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_member_read ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      JOIN entities e ON uea.entity_id = e.id
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND e.organization_id = organizations.id
    )
  );
CREATE POLICY org_admin_write ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access uea
      JOIN entities e ON uea.entity_id = e.id
      WHERE uea.user_id = current_setting('app.current_user_id')::UUID
      AND e.organization_id = organizations.id
      AND uea.role IN ('owner', 'admin')
    )
  );

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_member_read ON entities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_entity_access
      WHERE user_id = current_setting('app.current_user_id')::UUID
      AND entity_id = entities.id
    )
  );
CREATE POLICY entity_admin_write ON entities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_entity_access
      WHERE user_id = current_setting('app.current_user_id')::UUID
      AND entity_id = entities.id
      AND role IN ('owner', 'admin', 'finance_director')
    )
  );

ALTER TABLE user_entity_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY uea_member_read ON user_entity_access
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id')::UUID
    OR EXISTS (
      SELECT 1 FROM user_entity_access uea2
      WHERE uea2.user_id = current_setting('app.current_user_id')::UUID
      AND uea2.entity_id = user_entity_access.entity_id
      AND uea2.role IN ('owner', 'admin')
    )
  );

-- ─── Accounting Tables ────────────────────────────────────────────────────

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY coa_entity_read ON chart_of_accounts
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY coa_entity_write ON chart_of_accounts
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY je_entity_read ON journal_entries
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY je_entity_write ON journal_entries
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY jel_entity_read ON journal_entry_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.entity_id = current_setting('app.current_entity_id')::UUID
    )
  );
CREATE POLICY jel_entity_write ON journal_entry_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
      AND je.entity_id = current_setting('app.current_entity_id')::UUID
    )
  );

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_entity_read ON fiscal_periods
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY fp_entity_write ON fiscal_periods
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── AP/AR Tables ─────────────────────────────────────────────────────────

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_entity_read ON suppliers
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY supplier_entity_write ON suppliers
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_entity_read ON customers
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY customer_entity_write ON customers
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE invoices_ap ENABLE ROW LEVEL SECURITY;
CREATE POLICY ap_entity_read ON invoices_ap
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY ap_entity_write ON invoices_ap
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY ar_entity_read ON sales_invoices
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY ar_entity_write ON sales_invoices
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Treasury/Cash Tables ─────────────────────────────────────────────────

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_entity_read ON bank_accounts
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY bank_entity_write ON bank_accounts
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_tx_entity_read ON bank_transactions
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY bank_tx_entity_write ON bank_transactions
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_entity_read ON cash_accounts
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY cash_entity_write ON cash_accounts
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE imprest_floats ENABLE ROW LEVEL SECURITY;
CREATE POLICY imprest_entity_read ON imprest_floats
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY imprest_entity_write ON imprest_floats
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE petty_cash_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY petty_entity_read ON petty_cash_ledger
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY petty_entity_write ON petty_cash_ledger
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Mobile Money Tables ──────────────────────────────────────────────────

ALTER TABLE mobile_money_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY mm_entity_read ON mobile_money_accounts
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY mm_entity_write ON mobile_money_accounts
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mm_tx_entity_read ON mobile_money_transactions
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY mm_tx_entity_write ON mobile_money_transactions
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Document Tables ──────────────────────────────────────────────────────

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY docs_entity_read ON documents
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY docs_entity_write ON documents
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Payroll Tables ───────────────────────────────────────────────────────

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY emp_entity_read ON employees
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY emp_entity_write ON employees
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_entity_read ON payroll_runs
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY pr_entity_write ON payroll_runs
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Fixed Assets Tables ──────────────────────────────────────────────────

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_entity_read ON fixed_assets
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY fa_entity_write ON fixed_assets
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Inventory Tables ─────────────────────────────────────────────────────

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_entity_read ON inventory_items
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY inv_entity_write ON inventory_items
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY wh_entity_read ON warehouses
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY wh_entity_write ON warehouses
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_tx_entity_read ON inventory_transactions
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY inv_tx_entity_write ON inventory_transactions
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- ─── Chat Tables ──────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_entity_read ON conversations
  FOR SELECT USING (entity_id = current_setting('app.current_entity_id')::UUID);
CREATE POLICY conv_entity_write ON conversations
  FOR ALL USING (entity_id = current_setting('app.current_entity_id')::UUID);
