-- CHECK Constraints for Financial Data Integrity
-- Ensures financial records have valid, non-negative, and balanced values
-- All constraints are additive and non-destructive

-- AP Invoices: amounts must be positive, balance must not exceed total
ALTER TABLE invoices_ap ADD CONSTRAINT invoices_ap_total_amount_check CHECK (total_amount > 0);
ALTER TABLE invoices_ap ADD CONSTRAINT invoices_ap_balance_check CHECK (balance >= 0 AND balance <= total_amount);

-- AP Payments: amount must be positive
ALTER TABLE payments_ap ADD CONSTRAINT payments_ap_amount_check CHECK (amount > 0);

-- AR Invoices (sales_invoices): amounts must be positive, balance must not exceed total
-- NOTE: original referenced "invoices_ar", which is not a real table (it's "sales_invoices")
ALTER TABLE sales_invoices ADD CONSTRAINT invoices_ar_total_amount_check CHECK (total_amount > 0);
ALTER TABLE sales_invoices ADD CONSTRAINT invoices_ar_balance_check CHECK (balance >= 0 AND balance <= total_amount);

-- AR Payments: amount must be positive
ALTER TABLE payments_ar ADD CONSTRAINT payments_ar_amount_check CHECK (amount > 0);

-- Journal Entries: no total_debit/total_credit columns exist on journal_entries
-- (they never did — those constraints were dead code). Lines carry debit/credit.

-- Journal Lines: debit/credit must not both be zero (original referenced "journal_lines"
-- with an "amount" column that never existed — journal_entry_lines has debit/credit instead)
ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_not_both_zero_check CHECK (NOT (debit = 0 AND credit = 0));

-- Fixed Assets: cost and useful life must be positive, salvage value non-negative
ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_cost_check CHECK (cost > 0);
ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_salvage_value_check CHECK (salvage_value >= 0);
ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_useful_life_check CHECK (useful_life_months > 0);
ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_accumulated_depreciation_check CHECK (accumulated_depreciation >= 0);
ALTER TABLE fixed_assets ADD CONSTRAINT fixed_assets_net_book_value_check CHECK (net_book_value >= 0);

-- Inventory Items: quantities must be non-negative, prices must be positive where set
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_quantity_on_hand_check CHECK (quantity_on_hand >= 0);
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_reorder_level_check CHECK (reorder_level >= 0);
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_reorder_quantity_check CHECK (reorder_quantity > 0);
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_standard_cost_check CHECK (standard_cost > 0);

-- Inventory Transactions: quantity and total cost must be positive
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_quantity_check CHECK (quantity > 0);
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_total_cost_check CHECK (total_cost > 0);

-- Warehouses: no capacity column exists (dead constraint removed)

-- Employees: no salary column on employees — salary lives on employee_contracts.basic_salary
ALTER TABLE employee_contracts ADD CONSTRAINT employee_contracts_basic_salary_check CHECK (basic_salary > 0);

-- Bank Transactions: amount must be non-zero
ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_amount_check CHECK (amount != 0);

-- Mobile Money Transactions: amount must be non-zero
ALTER TABLE mobile_money_transactions ADD CONSTRAINT mobile_money_transactions_amount_check CHECK (amount != 0);

-- Cash Accounts: balance must be non-negative (column is current_balance)
ALTER TABLE cash_accounts ADD CONSTRAINT cash_accounts_balance_check CHECK (current_balance >= 0);

-- Imprest Floats: amount must be positive
ALTER TABLE imprest_floats ADD CONSTRAINT imprest_floats_amount_check CHECK (amount > 0);

-- Petty Cash Ledger (original referenced "petty_cash_entries", which is not a real table)
ALTER TABLE petty_cash_ledger ADD CONSTRAINT petty_cash_ledger_balance_check CHECK (balance >= 0);

-- Budget Lines: moved to 0044_constraints_catchup.sql — budget_lines is created
-- in 0015 (after this file), and the original referenced a table/columns that never existed.

-- Purchase Orders: total amount must be positive
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_total_amount_check CHECK (total_amount > 0);

-- PO Lines: quantity and unit price must be positive
ALTER TABLE po_lines ADD CONSTRAINT po_lines_quantity_check CHECK (quantity > 0);
ALTER TABLE po_lines ADD CONSTRAINT po_lines_unit_price_check CHECK (unit_price > 0);
