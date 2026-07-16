# DATABASE.md — Xenboox Database Schema

> Complete database schema reference for Xenboox.
> All tables use UUID primary keys, entity scoping, and audit timestamps.
> Schema is defined in Drizzle ORM. Never hand-write migrations.

---

## Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTH LAYER                              │
│  users │ accounts │ sessions │ user_entity_access           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  ORGANIZATION LAYER                         │
│  organizations │ entities                                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  ACCOUNTING CORE                            │
│  chart_of_accounts │ journal_entries │ journal_entry_lines  │
│  fiscal_periods │ trial_balance_snapshots                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    AP / AR                                   │
│  suppliers │ purchase_orders │ purchase_order_lines         │
│  invoices_ap │ invoice_ap_lines │ payments_ap               │
│  customers │ sales_invoices │ sales_invoice_lines           │
│  payments_ar │ receipts_ar                                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   TREASURY                                   │
│  bank_accounts │ bank_transactions │ reconciliations        │
│  reconciliation_items │ mobile_money_accounts               │
│  mobile_money_transactions                                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     CASH                                    │
│  cash_accounts │ cash_transactions │ imprest_floats         │
│  imprest_receipts │ petty_cash_ledger                       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  DOCUMENTS & AUDIT                          │
│  documents │ document_links │ audit_log │ agent_activity    │
│  exchange_rates │ currencies                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Auth Tables

### users
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image         TEXT,
  password_hash TEXT,                    -- null if OAuth only
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### accounts (OAuth providers)
```sql
CREATE TABLE accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  provider          TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token     TEXT,
  access_token      TEXT,
  expires_at        BIGINT,
  token_type        TEXT,
  scope             TEXT,
  id_token          TEXT,
  session_state     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);
```

### sessions
```sql
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires      TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### verification_tokens
```sql
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

---

## 2. Organization Layer

### organizations
```sql
CREATE TYPE org_type AS ENUM (
  'business', 'nonprofit', 'government', 'accounting_firm'
);

CREATE TYPE billing_plan AS ENUM (
  'free', 'starter', 'growth', 'pro', 'firm'
);

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,        -- URL-friendly name
  type          org_type NOT NULL DEFAULT 'business',
  plan          billing_plan NOT NULL DEFAULT 'free',
  owner_id      UUID NOT NULL REFERENCES users(id),
  settings      JSONB DEFAULT '{}',          -- org-level settings
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### entities
```sql
CREATE TYPE entity_type AS ENUM (
  'company', 'subsidiary', 'branch', 'client'
);

CREATE TABLE entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            entity_type NOT NULL DEFAULT 'company',
  currency        TEXT NOT NULL DEFAULT 'GMD',  -- ISO 4217
  country         TEXT NOT NULL DEFAULT 'GM',    -- ISO 3166-1 alpha-2
  fiscal_year_end INTEGER NOT NULL DEFAULT 12,   -- Month (1-12)
  tax_id          TEXT,                          -- Business registration number
  settings        JSONB DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### user_entity_access
```sql
CREATE TYPE entity_role AS ENUM (
  'owner', 'admin', 'finance_director', 'accountant',
  'payroll_officer', 'cashier', 'department_manager',
  'employee', 'external_auditor', 'donor'
);

CREATE TABLE user_entity_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role        entity_role NOT NULL,
  granted_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, entity_id)
);
```

---

## 3. Accounting Core

### chart_of_accounts
```sql
CREATE TYPE account_type AS ENUM (
  'asset', 'liability', 'equity', 'revenue', 'expense'
);

CREATE TYPE account_subtype AS ENUM (
  -- Assets
  'current_asset', 'fixed_asset', 'bank_account', 'cash',
  'accounts_receivable', 'inventory', 'prepaid',
  -- Liabilities
  'current_liability', 'long_term_liability', 'accounts_payable',
  'tax_liability', 'accrued_liability',
  -- Equity
  'owner_equity', 'retained_earnings', 'current_year_earnings',
  -- Revenue
  'sales_revenue', 'service_revenue', 'other_income', 'interest_income',
  -- Expenses
  'cost_of_goods_sold', 'operating_expense', 'payroll_expense',
  'tax_expense', 'depreciation', 'interest_expense', 'other_expense'
);

CREATE TABLE chart_of_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,              -- e.g., "1000", "4010"
  name          TEXT NOT NULL,              -- e.g., "Cash on Hand"
  type          account_type NOT NULL,
  subtype       account_subtype NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  parent_id     UUID REFERENCES chart_of_accounts(id), -- for sub-accounts
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, code)
);

CREATE INDEX idx_coa_entity ON chart_of_accounts(entity_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(entity_id, type);
```

### journal_entries
```sql
CREATE TYPE journal_status AS ENUM (
  'draft', 'pending_review', 'posted', 'reversed', 'voided'
);

CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  entry_number    SERIAL,                    -- auto-incrementing per entity
  description     TEXT NOT NULL,
  reference       TEXT,                      -- external reference number
  date            DATE NOT NULL,
  period_id       UUID NOT NULL REFERENCES fiscal_periods(id),
  status          journal_status NOT NULL DEFAULT 'draft',
  posted_by       TEXT,                      -- agent identifier or user_id
  posted_at       TIMESTAMPTZ,
  reversed_by     UUID REFERENCES journal_entries(id),
  reversed_at     TIMESTAMPTZ,
  confidence      REAL,                      -- 0.0 - 1.0, null if human-posted
  source          TEXT,                      -- which agent created this
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_je_entity_date ON journal_entries(entity_id, date);
CREATE INDEX idx_je_period ON journal_entries(entity_id, period_id);
CREATE INDEX idx_je_status ON journal_entries(entity_id, status);
```

### journal_entry_lines
```sql
CREATE TABLE journal_entry_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit           NUMERIC(15,2) DEFAULT 0,
  credit          NUMERIC(15,2) DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))  -- can't have both
);

CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);
```

### fiscal_periods
```sql
CREATE TYPE period_status AS ENUM (
  'open', 'closing', 'closed', 'locked'
);

CREATE TABLE fiscal_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          period_status NOT NULL DEFAULT 'open',
  closed_by       UUID REFERENCES users(id),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, year, month)
);

CREATE INDEX idx_fp_entity ON fiscal_periods(entity_id);
```

### trial_balance_snapshots
```sql
CREATE TABLE trial_balance_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  period_id     UUID NOT NULL REFERENCES fiscal_periods(id),
  account_id    UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_total  NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance       NUMERIC(15,2) NOT NULL DEFAULT 0, -- debit - credit
  generated_by  TEXT NOT NULL,                      -- agent or user
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, period_id, account_id)
);
```

---

## 4. Accounts Payable

### suppliers
```sql
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       JSONB,                      -- structured address
  tax_id        TEXT,
  payment_terms INTEGER DEFAULT 30,          -- days
  currency      TEXT NOT NULL DEFAULT 'GMD',
  bank_details  JSONB,                       -- bank account info
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_entity ON suppliers(entity_id);
```

### purchase_orders
```sql
CREATE TYPE po_status AS ENUM (
  'draft', 'sent', 'confirmed', 'received', 'cancelled'
);

CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  po_number     TEXT NOT NULL,
  date          DATE NOT NULL,
  expected_date DATE,
  status        po_status NOT NULL DEFAULT 'draft',
  subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'GMD',
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, po_number)
);

CREATE INDEX idx_po_entity ON purchase_orders(entity_id);
CREATE INDEX idx_po_supplier ON purchase_orders(entity_id, supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(entity_id, status);
```

### purchase_order_lines
```sql
CREATE TABLE purchase_order_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  quantity         NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(5,2) DEFAULT 0,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### invoices_ap
```sql
CREATE TYPE ap_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'scheduled',
  'partially_paid', 'paid', 'overdue', 'disputed', 'voided'
);

CREATE TABLE invoices_ap (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  invoice_number  TEXT NOT NULL,
  supplier_invoice_number TEXT,              -- supplier's reference
  date            DATE NOT NULL,
  due_date        DATE NOT NULL,
  status          ap_status NOT NULL DEFAULT 'draft',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GMD',
  exchange_rate   NUMERIC(10,6) DEFAULT 1,
  base_amount     NUMERIC(15,2),            -- amount in entity's base currency
  document_id     UUID REFERENCES documents(id),  -- linked scanned document
  ocr_confidence  REAL,                     -- OCR extraction confidence
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, invoice_number)
);

CREATE INDEX idx_ap_entity ON invoices_ap(entity_id);
CREATE INDEX idx_ap_supplier ON invoices_ap(entity_id, supplier_id);
CREATE INDEX idx_ap_status ON invoices_ap(entity_id, status);
CREATE INDEX idx_ap_due ON invoices_ap(entity_id, due_date);
```

### invoice_ap_lines
```sql
CREATE TABLE invoice_ap_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_ap_id   UUID NOT NULL REFERENCES invoices_ap(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### payments_ap
```sql
CREATE TYPE payment_method AS ENUM (
  'bank_transfer', 'mobile_money', 'cash', 'cheque'
);

CREATE TYPE ap_payment_status AS ENUM (
  'pending', 'completed', 'failed', 'reversed'
);

CREATE TABLE payments_ap (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  invoice_ap_id   UUID NOT NULL REFERENCES invoices_ap(id),
  amount          NUMERIC(15,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GMD',
  exchange_rate   NUMERIC(10,6) DEFAULT 1,
  base_amount     NUMERIC(15,2),
  payment_method  payment_method NOT NULL,
  payment_date    DATE NOT NULL,
  reference       TEXT,                      -- cheque number, mobile money ref
  bank_account_id UUID REFERENCES bank_accounts(id),
  status          ap_payment_status NOT NULL DEFAULT 'pending',
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pay_ap_entity ON payments_ap(entity_id);
CREATE INDEX idx_pay_ap_invoice ON payments_ap(invoice_ap_id);
```

---

## 5. Accounts Receivable

### customers
```sql
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES entities(id),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       JSONB,
  tax_id        TEXT,
  payment_terms INTEGER DEFAULT 30,
  currency      TEXT NOT NULL DEFAULT 'GMD',
  credit_limit  NUMERIC(15,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_entity ON customers(entity_id);
```

### sales_invoices
```sql
CREATE TYPE ar_status AS ENUM (
  'draft', 'sent', 'viewed', 'partially_paid',
  'paid', 'overdue', 'written_off', 'voided'
);

CREATE TABLE sales_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  invoice_number  TEXT NOT NULL,
  date            DATE NOT NULL,
  due_date        DATE NOT NULL,
  status          ar_status NOT NULL DEFAULT 'draft',
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GMD',
  exchange_rate   NUMERIC(10,6) DEFAULT 1,
  base_amount     NUMERIC(15,2),
  notes           TEXT,
  sent_at         TIMESTAMPTZ,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, invoice_number)
);

CREATE INDEX idx_ar_entity ON sales_invoices(entity_id);
CREATE INDEX idx_ar_customer ON sales_invoices(entity_id, customer_id);
CREATE INDEX idx_ar_status ON sales_invoices(entity_id, status);
CREATE INDEX idx_ar_due ON sales_invoices(entity_id, due_date);
```

### sales_invoice_lines
```sql
CREATE TABLE sales_invoice_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id  UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES chart_of_accounts(id),
  description       TEXT NOT NULL,
  quantity          NUMERIC(15,4) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate          NUMERIC(5,2) DEFAULT 0,
  amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### payments_ar
```sql
CREATE TABLE payments_ar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID NOT NULL REFERENCES entities(id),
  sales_invoice_id  UUID NOT NULL REFERENCES sales_invoices(id),
  amount            NUMERIC(15,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'GMD',
  exchange_rate     NUMERIC(10,6) DEFAULT 1,
  base_amount       NUMERIC(15,2),
  payment_method    payment_method NOT NULL,
  payment_date      DATE NOT NULL,
  reference         TEXT,
  bank_account_id   UUID REFERENCES bank_accounts(id),
  status            ap_payment_status NOT NULL DEFAULT 'pending',
  journal_entry_id  UUID REFERENCES journal_entries(id),
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pay_ar_entity ON payments_ar(entity_id);
CREATE INDEX idx_pay_ar_invoice ON payments_ar(sales_invoice_id);
```

---

## 6. Treasury

### bank_accounts
```sql
CREATE TYPE bank_account_type AS ENUM (
  'checking', 'savings', 'money_market', 'other'
);

CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  name            TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_type    bank_account_type NOT NULL DEFAULT 'checking',
  currency        TEXT NOT NULL DEFAULT 'GMD',
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id), -- linked CoA account
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  plaid_access_token TEXT,                 -- Plaid integration
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_entity ON bank_accounts(entity_id);
```

### bank_transactions
```sql
CREATE TYPE bank_tx_type AS ENUM (
  'debit', 'credit'
);

CREATE TABLE bank_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  type            bank_tx_type NOT NULL,
  balance         NUMERIC(15,2),           -- running balance
  reference       TEXT,
  category        TEXT,                     -- auto-categorized
  reconciled      BOOLEAN NOT NULL DEFAULT FALSE,
  journal_entry_id UUID REFERENCES journal_entries(id),
  source          TEXT,                     -- 'plaid', 'pdf_upload', 'manual'
  raw_data        JSONB,                   -- original parsed data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_btx_entity ON bank_transactions(entity_id);
CREATE INDEX idx_btx_account ON bank_transactions(entity_id, bank_account_id);
CREATE INDEX idx_btx_date ON bank_transactions(entity_id, date);
CREATE INDEX idx_btx_reconciled ON bank_transactions(entity_id, reconciled);
```

### reconciliations
```sql
CREATE TYPE recon_status AS ENUM (
  'in_progress', 'pending_review', 'completed', 'disputed'
);

CREATE TABLE reconciliations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          recon_status NOT NULL DEFAULT 'in_progress',
  book_balance    NUMERIC(15,2) NOT NULL,  -- ledger balance
  bank_balance    NUMERIC(15,2) NOT NULL,  -- bank statement balance
  difference      NUMERIC(15,2) NOT NULL,  -- should be 0 when complete
  matched_count   INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  completed_by    TEXT,                     -- agent or user
  completed_at    TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recon_entity ON reconciliations(entity_id);
CREATE INDEX idx_recon_account ON reconciliations(entity_id, bank_account_id);
```

### reconciliation_items
```sql
CREATE TYPE recon_item_status AS ENUM (
  'matched', 'unmatched', 'disputed', 'ignored'
);

CREATE TABLE reconciliation_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  journal_entry_id  UUID REFERENCES journal_entries(id),
  status            recon_item_status NOT NULL DEFAULT 'unmatched',
  amount            NUMERIC(15,2) NOT NULL,
  description       TEXT,
  match_confidence  REAL,                    -- agent's match confidence
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ri_recon ON reconciliation_items(reconciliation_id);
```

---

## 7. Cash & Imprest

### cash_accounts
```sql
CREATE TABLE cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  name            TEXT NOT NULL,            -- e.g., "Main Office Petty Cash"
  location        TEXT,
  float_amount    NUMERIC(15,2) NOT NULL DEFAULT 0, -- standard float
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  responsible_person UUID REFERENCES users(id),
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_entity ON cash_accounts(entity_id);
```

### imprest_floats
```sql
CREATE TYPE imprest_status AS ENUM (
  'issued', 'partial_retirement', 'retired', 'overdue'
);

CREATE TABLE imprest_floats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  issued_to       UUID NOT NULL REFERENCES users(id),
  amount          NUMERIC(15,2) NOT NULL,
  purpose         TEXT NOT NULL,
  issued_date     DATE NOT NULL,
  expected_retirement_date DATE NOT NULL,
  actual_retirement_date   DATE,
  status          imprest_status NOT NULL DEFAULT 'issued',
  amount_spent    NUMERIC(15,2) DEFAULT 0,
  balance_due     NUMERIC(15,2),            -- amount - amount_spent
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imprest_entity ON imprest_floats(entity_id);
CREATE INDEX idx_imprest_status ON imprest_floats(entity_id, status);
CREATE INDEX idx_imprest_person ON imprest_floats(entity_id, issued_to);
```

### imprest_receipts
```sql
CREATE TABLE imprest_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imprest_float_id UUID NOT NULL REFERENCES imprest_floats(id) ON DELETE CASCADE,
  document_id     UUID REFERENCES documents(id),
  amount          NUMERIC(15,2) NOT NULL,
  description     TEXT NOT NULL,
  date            DATE NOT NULL,
  category        TEXT,                     -- expense category
  account_id      UUID REFERENCES chart_of_accounts(id), -- linked CoA
  receipt_image_url TEXT,                   -- R2 path
  ocr_extracted   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ir_float ON imprest_receipts(imprest_float_id);
```

### petty_cash_ledger
```sql
CREATE TABLE petty_cash_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
  date            DATE NOT NULL,
  type            TEXT NOT NULL,             -- 'receipt', 'replenishment', 'adjustment'
  amount          NUMERIC(15,2) NOT NULL,
  description     TEXT NOT NULL,
  reference_type  TEXT,                      -- 'imprest', 'direct_receipt', etc.
  reference_id    UUID,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pcl_entity ON petty_cash_ledger(entity_id);
CREATE INDEX idx_pcl_account ON petty_cash_ledger(entity_id, cash_account_id);
```

---

## 8. Mobile Money

### mobile_money_accounts
```sql
CREATE TYPE mobile_money_provider AS ENUM (
  'wave', 'orange_money', 'mtn_momo', 'mpesa', 'airtel_money'
);

CREATE TABLE mobile_money_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  provider        mobile_money_provider NOT NULL,
  phone_number    TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  current_balance NUMERIC(15,2) DEFAULT 0,
  account_id      UUID NOT NULL REFERENCES chart_of_accounts(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  api_access_token TEXT,                    -- provider API token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mm_entity ON mobile_money_accounts(entity_id);
CREATE INDEX idx_mm_provider ON mobile_money_accounts(entity_id, provider);
```

### mobile_money_transactions
```sql
CREATE TYPE mm_tx_type AS ENUM (
  'send', 'receive', 'pay_bill', 'buy_goods', 'withdraw', 'deposit', 'transfer'
);

CREATE TYPE mm_tx_status AS ENUM (
  'pending', 'completed', 'failed', 'reversed'
);

CREATE TABLE mobile_money_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id             UUID NOT NULL REFERENCES entities(id),
  mobile_money_account_id UUID NOT NULL REFERENCES mobile_money_accounts(id),
  provider_transaction_id TEXT UNIQUE,        -- provider's reference
  type                  mm_tx_type NOT NULL,
  status                mm_tx_status NOT NULL DEFAULT 'completed',
  amount                NUMERIC(15,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'GMD',
  exchange_rate         NUMERIC(10,6) DEFAULT 1,
  base_amount           NUMERIC(15,2),
  counterparty_name     TEXT,
  counterparty_phone    TEXT,
  description           TEXT,
  date                  DATE NOT NULL,
  timestamp             TIMESTAMPTZ NOT NULL,
  reconciled            BOOLEAN NOT NULL DEFAULT FALSE,
  journal_entry_id      UUID REFERENCES journal_entries(id),
  source                TEXT,                -- 'api', 'statement_import', 'manual'
  raw_data              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mtx_entity ON mobile_money_transactions(entity_id);
CREATE INDEX idx_mtx_account ON mobile_money_transactions(entity_id, mobile_money_account_id);
CREATE INDEX idx_mtx_date ON mobile_money_transactions(entity_id, date);
CREATE INDEX idx_mtx_status ON mobile_money_transactions(entity_id, status);
```

---

## 9. Multi-Currency

### currencies
```sql
CREATE TABLE currencies (
  code        TEXT PRIMARY KEY,             -- ISO 4217
  name        TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  decimals    INTEGER NOT NULL DEFAULT 2,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed: GMD, USD, EUR, GBP, NGN, GHS, KES, etc.
```

### exchange_rates
```sql
CREATE TABLE exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   TEXT NOT NULL REFERENCES currencies(code),
  quote_currency  TEXT NOT NULL REFERENCES currencies(code),
  rate            NUMERIC(15,8) NOT NULL,
  source          TEXT NOT NULL DEFAULT 'ECB',
  date            DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(base_currency, quote_currency, date)
);

CREATE INDEX idx_er_date ON exchange_rates(date);
CREATE INDEX idx_er_pair ON exchange_rates(base_currency, quote_currency);
```

---

## 10. Documents

### documents
```sql
CREATE TYPE doc_type AS ENUM (
  'invoice', 'receipt', 'bank_statement', 'contract',
  'payslip', 'tax_document', 'grant_letter', 'other'
);

CREATE TYPE doc_status AS ENUM (
  'uploaded', 'processing', 'extracted', 'classified',
  'linked', 'archived', 'failed'
);

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  name            TEXT NOT NULL,
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size            INTEGER NOT NULL,          -- bytes
  storage_path    TEXT NOT NULL,             -- R2 path
  type            doc_type DEFAULT 'other',
  status          doc_status NOT NULL DEFAULT 'uploaded',
  ocr_text        TEXT,                      -- extracted text
  ocr_confidence  REAL,
  classification  JSONB,                     -- agent classification result
  extracted_data  JSONB,                     -- structured data from OCR
  uploaded_by     TEXT,                      -- user_id or 'desktop-app'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_entity ON documents(entity_id);
CREATE INDEX idx_docs_type ON documents(entity_id, type);
CREATE INDEX idx_docs_status ON documents(entity_id, status);
```

### document_links
```sql
CREATE TABLE document_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES entities(id),
  linked_type     TEXT NOT NULL,             -- 'invoice_ap', 'payment', etc.
  linked_id       UUID NOT NULL,             -- ID of the linked record
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dl_document ON document_links(document_id);
CREATE INDEX idx_dl_linked ON document_links(linked_type, linked_id);
```

---

## 11. Audit & Activity

### audit_log
```sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  user_id         UUID REFERENCES users(id),
  agent_id        TEXT,                      -- agent identifier if agent-initiated
  action          TEXT NOT NULL,             -- 'invoice_ap.created', 'je.posted'
  entity_type     TEXT NOT NULL,             -- 'invoice_ap', 'journal_entry'
  entity_id_ref   UUID NOT NULL,             -- ID of the affected record
  changes         JSONB,                     -- { before: {}, after: {} }
  confidence      REAL,
  reasoning       TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_id);
CREATE INDEX idx_audit_ref ON audit_log(entity_type, entity_id_ref);
CREATE INDEX idx_audit_user ON audit_log(entity_id, user_id);
CREATE INDEX idx_audit_agent ON audit_log(entity_id, agent_id);
CREATE INDEX idx_audit_date ON audit_log(entity_id, created_at);
```

### agent_activity
```sql
CREATE TABLE agent_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES entities(id),
  agent_id        TEXT NOT NULL,             -- e.g., 'ledger-agent', 'cfo-agent'
  tier            INTEGER NOT NULL,          -- 1, 2, or 3
  action          TEXT NOT NULL,
  input           JSONB,
  output          JSONB,
  confidence      REAL,
  escalated_to    TEXT,                      -- who it escalated to
  reasoning       TEXT,
  duration_ms     INTEGER,                   -- execution time
  langfuse_trace_id TEXT,                    -- link to LangFuse
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aa_entity ON agent_activity(entity_id);
CREATE INDEX idx_aa_agent ON agent_activity(entity_id, agent_id);
CREATE INDEX idx_aa_date ON agent_activity(entity_id, created_at);
CREATE INDEX idx_aa_confidence ON agent_activity(entity_id, confidence);
```

---

## 12. Row-Level Security (RLS)

Enable RLS on every table. Create policies for entity isolation:

```sql
-- Example for invoices_ap:
ALTER TABLE invoices_ap ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_isolation ON invoices_ap
  USING (entity_id = current_setting('app.current_entity_id')::UUID);

-- Apply to all entity-scoped tables
-- The application sets the session variable before each query:
-- SET app.current_entity_id = '<entity-uuid>';
```

---

## 13. Common Query Patterns

### Entity-Scoped List with Pagination
```typescript
const invoices = await db.query.invoices_ap.findMany({
  where: and(
    eq(invoicesAp.entityId, ctx.entityId),
    eq(invoicesAp.status, "pending_approval")
  ),
  orderBy: desc(invoicesAp.createdAt),
  limit: 50,
  offset: 0,
  with: {
    supplier: true,
    invoiceApLines: true
  }
})
```

### Aging Report Query
```sql
-- AP Aging: invoices grouped by age bucket
SELECT
  s.name AS supplier_name,
  i.invoice_number,
  i.total,
  i.due_date,
  CASE
    WHEN CURRENT_DATE - i.due_date <= 0 THEN 'current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1_30'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31_60'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61_90'
    ELSE '90_plus'
  END AS aging_bucket
FROM invoices_ap i
JOIN suppliers s ON i.supplier_id = s.id
WHERE i.entity_id = $1
  AND i.status NOT IN ('paid', 'voided')
ORDER BY i.due_date;
```

### Trial Balance Generation
```sql
SELECT
  a.code,
  a.name,
  a.type,
  COALESCE(SUM(jel.debit), 0) AS total_debit,
  COALESCE(SUM(jel.credit), 0) AS total_credit,
  COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) AS balance
FROM chart_of_accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
  AND je.status = 'posted'
  AND je.date BETWEEN $1 AND $2
WHERE a.entity_id = $3
  AND a.is_active = TRUE
GROUP BY a.id, a.code, a.name, a.type
ORDER BY a.code;
```

---

## 14. Seed Data Templates

### Chart of Accounts — General Business (Gambia)
```
1000 - Cash on Hand
1010 - Petty Cash
1020 - Bank Account - Main
1030 - Mobile Money - Wave
1040 - Accounts Receivable
1100 - Inventory
1200 - Prepaid Expenses
1500 - Fixed Assets
1510 - Accumulated Depreciation

2000 - Accounts Payable
2100 - Accrued Expenses
2200 - Tax Payable - VAT
2300 - Tax Payable - PAYE
2400 - Social Security Payable
2500 - Loans Payable

3000 - Owner's Equity
3100 - Retained Earnings
3200 - Current Year Earnings

4000 - Sales Revenue
4100 - Service Revenue
4200 - Other Income
4300 - Interest Income

5000 - Cost of Goods Sold
5100 - Salary Expense
5110 - PAYE Expense
5120 - Social Security Expense
5200 - Rent Expense
5300 - Utilities Expense
5400 - Office Supplies
5500 - Travel Expense
5600 - Marketing Expense
5700 - Insurance Expense
5800 - Depreciation Expense
5900 - Bank Charges
5910 - Mobile Money Fees
5920 - Interest Expense
5990 - Miscellaneous Expense
```

---

*Last updated: July 2026*
*Reference: XENBOOX_PRD.md Section 9 for multi-tenancy architecture*
