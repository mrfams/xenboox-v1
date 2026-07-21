-- CHECK Constraints for Financial Data Integrity
-- Ensures financial records have valid, non-negative, and balanced values
-- All constraints are additive and non-destructive

-- AP Invoices: amounts must be positive, balance must not exceed total
ALTER TABLE invoices_ap ADD CONSTRAINT invoices_ap_total_amount_check CHECK (total_amount > 0);
ALTER TABLE invoices_ap ADD CONSTRAINT invoices_ap_balance_check CHECK (balance >= 0 AND balance <= total_amount);

-- AP Payments: amount must be positive
ALTER TABLE payments_ap ADD CONSTRAINT payments_ap_amount_check CHECK (amount > 0);

-- AR Invoices: amounts must be positive, balance must not exceed total
ALTER TABLE invoices_ar ADD CONSTRAINT invoices_ar_total_amount_check CHECK (total_amount > 0);
ALTER TABLE invoices_ar ADD CONSTRAINT invoices_ar_balance_check CHECK (balance >= 0 AND balance <= total_amount);

-- AR Payments: amount must be positive
ALTER TABLE payments_ar ADD CONSTRAINT payments_ar_amount_check CHECK (amount > 0);

-- Journal Entries: debit and credit totals must be non-negative
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_total_debit_check CHECK (total_debit >= 0);
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_total_credit_check CHECK (total_credit >= 0);

-- Journal Lines: amount must be non-zero (no zero-value entries)
ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_amount_check CHECK (amount != 0);

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

-- Warehouses: capacity must be positive if set
ALTER TABLE warehouses ADD CONSTRAINT warehouses_capacity_check CHECK (capacity > 0);

-- Employees: salary must be positive
ALTER TABLE employees ADD CONSTRAINT employees_salary_check CHECK (salary > 0);

-- Bank Transactions: amount must be non-zero
ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_amount_check CHECK (amount != 0);

-- Mobile Money Transactions: amount must be non-zero
ALTER TABLE mobile_money_transactions ADD CONSTRAINT mobile_money_transactions_amount_check CHECK (amount != 0);

-- Cash Accounts: balance must be non-negative
ALTER TABLE cash_accounts ADD CONSTRAINT cash_accounts_balance_check CHECK (balance >= 0);

-- Imprest Floats: amount must be positive
ALTER TABLE imprest_floats ADD CONSTRAINT imprest_floats_amount_check CHECK (amount > 0);

-- Petty Cash Entries: amount must be positive
ALTER TABLE petty_cash_entries ADD CONSTRAINT petty_cash_entries_amount_check CHECK (amount > 0);

-- Budget Line Items: budgeted amount must be positive, actual spent must be non-negative
ALTER TABLE budget_line_items ADD CONSTRAINT budget_line_items_budgeted_amount_check CHECK (budgeted_amount > 0);
ALTER TABLE budget_line_items ADD CONSTRAINT budget_line_items_actual_spent_check CHECK (actual_spent >= 0);

-- Purchase Orders: total amount must be positive
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_total_amount_check CHECK (total_amount > 0);

-- PO Lines: quantity and unit price must be positive
ALTER TABLE po_lines ADD CONSTRAINT po_lines_quantity_check CHECK (quantity > 0);
ALTER TABLE po_lines ADD CONSTRAINT po_lines_unit_price_check CHECK (unit_price > 0);
