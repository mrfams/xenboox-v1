# XENBOOX — System Architecture & Data Model

> Engineering handoff doc. Companion to XENBOOX_PRD.md and XENBOOX_UI_SPEC.md.
> This is the skeleton every other spec (Agent Workforce, Accounting Rules, Data Ingestion, Security) attaches to. Build this first.
> Version: v1.0 | Last updated: July 2026

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS                                                      │
│  Web (Next.js)   Mobile (Phase 2)   Desktop (Tauri, Phase 3) │
└───────────────────────────┬───────────────────────────────────┘
                             │  tRPC over HTTPS
┌───────────────────────────▼───────────────────────────────────┐
│  API LAYER (Next.js API routes + tRPC)                        │
│  - Auth check → Entity scope check → Route to handler          │
└─────────┬─────────────────────────────────────┬───────────────┘
          │                                     │
┌─────────▼──────────┐              ┌───────────▼────────────┐
│  SYNCHRONOUS PATH   │              │  ASYNCHRONOUS PATH      │
│  Direct DB reads,   │              │  Trigger.dev jobs:      │
│  simple writes,     │              │  - Agent workflows       │
│  UI data fetching   │              │  - Document processing   │
│                     │              │  - Close sequences       │
│                     │              │  - Scheduled reports     │
└─────────┬───────────┘              └───────────┬─────────────┘
          │                                       │
          │              ┌────────────────────────▼──────────┐
          │              │  AGENT LAYER (LangGraph)            │
          │              │  19-agent hierarchy — see            │
          │              │  Agent Workforce Spec (doc #3)       │
          │              └────────────────────┬─────────────────┘
          │                                    │
┌─────────▼────────────────────────────────────▼─────────────────┐
│  DATABASE (Neon PostgreSQL, Drizzle ORM, Row-Level Security)    │
└───────────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│  STORAGE (Cloudflare R2) — documents, statements, exports        │
└───────────────────────────────────────────────────────────────┘
```

**Core principle:** the API layer never contains business/accounting logic. It authenticates, scopes to entity, and either (a) does a simple CRUD read/write, or (b) hands off to an async job. All accounting correctness lives in the Accounting Rules Engine (doc #4); all decision-making lives in the Agent Layer (doc #3). This document only defines the pipes connecting them.

---

## 2. Multi-Tenancy Model (locked, per PRD Section 9)

Three layers: **Platform → Organization → Entity**. All financial data lives at the Entity layer. This is non-negotiable and every table below inherits from it.

### 2.1 Core Identity Tables

```sql
organizations
  id                uuid PK
  name              text
  type              enum('sme','corporation','ngo','accounting_firm')
  plan              enum('free','starter','growth','pro','firm')
  billing_email     text
  stripe_customer_id text
  created_at        timestamptz

entities
  id                uuid PK
  organization_id   uuid FK -> organizations
  name              text
  type              enum('company','subsidiary','client','ngo')
  parent_entity_id  uuid FK -> entities (nullable, self-ref for subsidiaries)
  currency          text (ISO 4217)
  country           text (ISO 3166)
  fiscal_year_end   date
  created_at        timestamptz

users
  id                uuid PK
  organization_id   uuid FK -> organizations
  name              text
  email             text unique
  auth_provider     enum('password','google')
  created_at        timestamptz

user_entity_access
  user_id           uuid FK -> users
  entity_id         uuid FK -> entities
  role              enum(  -- see Security Spec (doc #6) for full permission matrix
                      'org_owner','org_admin','finance_director','accountant',
                      'payroll_officer','cashier','department_manager','employee',
                      'external_auditor','external_accountant','donor'
                    )
  scope_meta        jsonb  -- e.g. {"department": "sales"} for dept managers,
                            --      {"grant_id": "xyz"} for donors,
                            --      {"period_lock": "2026-06-30"} for auditors
  PRIMARY KEY (user_id, entity_id)
```

**Rule:** Every table below carries `entity_id` as a non-nullable FK. No exceptions. No table representing financial data may omit it.

### 2.2 Row-Level Security

- Enforced at the **database layer** via Postgres RLS policies keyed on `entity_id`, not just application-layer filtering.
- Every DB session (including agent jobs) sets `current_entity_id` in session context before any query executes.
- Full policy definitions and enforcement mechanics live in the Security Spec (doc #6) — this doc only establishes that RLS is mandatory and where it hooks in.

---

## 3. Core Financial Data Model

This section lists tables by module. Field-level accounting correctness (how depreciation is calculated, how double-entry is enforced, etc.) belongs in the Accounting Rules Engine spec — this doc defines shape and relationships only.

### 3.1 General Ledger (foundation — everything posts here)

```sql
accounts                  -- Chart of Accounts
  id, entity_id, code, name, type (asset/liability/equity/revenue/expense),
  parent_account_id (nullable, for sub-accounts), is_active

journal_entries
  id, entity_id, entry_date, description, source_module,
  posted_by_agent_id (nullable), posted_by_user_id (nullable),
  status (draft/posted/reversed), confidence_score, created_at

journal_lines
  id, journal_entry_id FK, account_id FK, debit, credit, memo
  -- CONSTRAINT: sum(debit) = sum(credit) per journal_entry_id, enforced at write time

ledger_periods
  id, entity_id, period_start, period_end, status (open/closing/closed/reopened),
  closed_at, closed_by, opening_balance_snapshot_id, closing_balance_snapshot_id
```

### 3.2 Accounts Payable / Receivable

```sql
suppliers        (id, entity_id, name, contact_info, payment_terms, tax_id)
customers        (id, entity_id, name, contact_info, payment_terms, donor_flag)

bills            -- AP
  id, entity_id, supplier_id, bill_number, amount, currency, due_date,
  status (unpaid/scheduled/paid/disputed/overdue), source_document_id,
  matched_po_id (nullable), journal_entry_id (nullable)

invoices         -- AR
  id, entity_id, customer_id, invoice_number, amount, currency, due_date,
  status (draft/sent/viewed/paid/overdue), journal_entry_id (nullable)

payments
  id, entity_id, direction (inbound/outbound), amount, currency, method
  (bank/mobile_money/cash/card), related_bill_id (nullable),
  related_invoice_id (nullable), payment_date, journal_entry_id
```

### 3.3 Cash, Bank, Mobile Money

```sql
bank_accounts     (id, entity_id, bank_name, account_number_masked, currency)
bank_transactions (id, entity_id, bank_account_id, date, amount, description,
                    matched_journal_entry_id (nullable), reconciliation_status)

mobile_money_accounts (id, entity_id, provider (wave/orange/mtn/mpesa/airtel), account_ref)
mobile_money_transactions (id, entity_id, mobile_money_account_id, date, amount,
                            counterparty, matched_journal_entry_id (nullable))

cash_tills        (id, entity_id, location, custodian_user_id, current_balance)
cash_transactions (id, entity_id, cash_till_id, type (in/out), amount, purpose)

imprest_records
  id, entity_id, holder_user_id, amount_issued, purpose, issued_at,
  status (outstanding/retired/overdue), retired_amount, retirement_receipts jsonb
```

### 3.4 Payroll (Phase 2, schema reserved now)

```sql
staff             (id, entity_id, name, salary, allowances jsonb, deductions jsonb,
                    bank_details_encrypted, start_date, end_date)
payroll_runs      (id, entity_id, period, status, total_gross, total_net, total_statutory)
payslips          (id, payroll_run_id, staff_id, gross, paye, social_security, net, pdf_url)
```

### 3.5 Fixed Assets, Inventory (Phase 3, schema reserved now)

```sql
assets            (id, entity_id, name, category, purchase_value, purchase_date,
                    depreciation_method, useful_life_years, current_book_value, status)
inventory_items   (id, entity_id, sku, name, quantity_on_hand, valuation_method, unit_cost)
```

### 3.6 Documents (feeds Data Ingestion spec, doc #5)

```sql
documents
  id, entity_id, source (email/upload/mobile/desktop_watch), file_url (R2),
  detected_type (invoice/receipt/bank_statement/payslip/contract/unknown),
  ocr_confidence, status (detected/processing/extracted/synced/agent_processing/done/failed),
  linked_transaction_id (nullable, polymorphic — bill/invoice/journal_entry),
  extracted_fields jsonb, created_at
```

### 3.7 Reporting & Analytics (materialized, not source of truth)

```sql
report_snapshots  (id, entity_id, report_type, period, generated_at, data jsonb, pdf_url)
budgets           (id, entity_id, fiscal_year, line_items jsonb)
health_scores     (id, entity_id, calculated_at, score, factors jsonb)
```

### 3.8 Agent System Tables (interface with doc #3)

```sql
agent_actions
  id, entity_id, agent_name, action_type, input_summary, output_summary,
  confidence_score, status (auto_completed/flagged/escalated), created_at
  -- This is the raw feed powering the Agent Activity Feed in the UI

approvals
  id, entity_id, agent_action_id FK, raised_by_agent, reason,
  recommended_action jsonb, status (pending/approved/rejected),
  resolved_by_user_id, resolved_at, resolution_note
  -- This is the queue powering the Approval Card UI pattern

audit_trail
  id, entity_id, actor_type (agent/user), actor_id, action, entity_affected,
  before_state jsonb, after_state jsonb, confidence_score, timestamp
  -- Full detail lives in Security Spec (doc #6); this table is defined here
  -- because every module above writes to it
```

---

## 4. API Layer

### 4.1 Structure (tRPC routers, mirrors module boundaries)

```
/server/api/routers/
  ledger.ts          journal.ts          coa.ts
  ap.ts               ar.ts               invoicing.ts
  cash.ts             bankRecon.ts        mobileMoney.ts
  documents.ts        reports.ts          approvals.ts
  agentActivity.ts    entities.ts         users.ts
  chat.ts             (routes CFO Agent chat to agent layer)
```

### 4.2 Every procedure follows this shape

```ts
export const someProcedure = protectedProcedure
  .input(schema)
  .use(entityScopeMiddleware)   // resolves entity_id, checks user_entity_access, sets RLS session var
  .use(roleCheckMiddleware)     // per-procedure role requirement
  .query/.mutation(async ({ ctx, input }) => {
    // simple CRUD only — no accounting logic, no agent orchestration here
    // complex writes dispatch to Trigger.dev job, return job_id for polling
  });
```

### 4.3 Sync vs Async — decision rule

- **Synchronous (direct DB):** reads for dashboards/lists, simple field updates, role/settings changes
- **Asynchronous (Trigger.dev job):** anything that touches the Agent Layer — document processing, reconciliation runs, close sequences, report generation, any multi-step workflow. Client polls job status or receives a websocket/SSE push.

**Non-negotiable per PRD tech stack decision:** agent workflows are long-running; API routes must never block waiting on an agent chain to finish.

---

## 5. Auth (Auth.js v5)

- Session-based, JWT for API calls
- On login: session carries `user_id` + resolved list of `{entity_id, role}` pairs
- Entity switcher in UI changes active `entity_id` in session context — every subsequent request scopes to it
- Org Owner/Admin roles are organization-scoped (see all entities); all other roles are entity-scoped per PRD Section 9.4/9.5

---

## 6. Agent Layer Interface (detail lives in doc #3, this section only defines the contract)

**How the API layer hands off to agents:**

1. API procedure writes a `job` record and enqueues a Trigger.dev task
2. Trigger.dev task invokes the relevant LangGraph agent graph, passing `entity_id` + payload
3. Agent graph executes, writes results to relevant module tables + `agent_actions` + `audit_trail`
4. If confidence below threshold → writes to `approvals` table, triggers notification
5. If confidence above threshold → auto-completes, still logged to `agent_actions` for the activity feed
6. Client polls or receives push update reflecting new state

**Chat is a special case:** CFO Agent chat (`chat.ts` router) is a synchronous-feeling but backend-async flow — message sent, job enqueued, streamed response returned via SSE, CFO Agent internally may call sub-agents synchronously within its own graph execution (not via separate Trigger.dev jobs, to keep chat responsive).

---

## 7. Storage (Cloudflare R2)

```
/documents/{entity_id}/{document_id}/original.{ext}
/documents/{entity_id}/{document_id}/extracted.json
/reports/{entity_id}/{report_type}/{period}.pdf
/payslips/{entity_id}/{staff_id}/{period}.pdf
```

- All buckets private, signed URLs only, short expiry
- Encryption at rest — full detail in Security Spec (doc #6)

---

## 8. Environment / Deployment Topology

```
Frontend + API routes    → Vercel
Database                 → Neon PostgreSQL (with RLS)
ORM                      → Drizzle
Background jobs          → Trigger.dev
Agent framework          → LangGraph (JS), invoked from Trigger.dev tasks
Object storage           → Cloudflare R2
Email                    → Resend (transactional + inbound parsing for forwarded invoices)
Observability            → LangFuse (agent traces) + Vercel/Neon native monitoring
```

**Inbound email ingestion note:** the per-entity forwarding address (`ap@[entity].xenboox.com`, per UI spec Section 8) requires an inbound email parsing webhook (Resend or equivalent) that creates a `documents` row and triggers the same processing pipeline as manual upload. This is the connective tissue between this doc and the Data Ingestion spec (doc #5) — flagged here so engineering doesn't build it twice.

---

## 9. What This Doc Deliberately Does NOT Cover

(So build agents don't duplicate or conflict with the other specs)

- Agent decision logic, escalation rules, confidence thresholds → **doc #3**
- How double-entry, depreciation, FX, close sequencing actually calculate → **doc #4**
- OCR pipeline, document classification logic, bank/mobile money parsing → **doc #5**
- Full RBAC permission matrix, encryption specifics, audit trail detail, legal notification requirements → **doc #6**

---

## 10. Build Order Dependency

```
This doc (schema + API shell)
        │
        ├──► doc #4 (Accounting Rules) — defines what's valid to write to ledger tables
        │
        ├──► doc #5 (Data Ingestion) — defines how documents table gets populated
        │
        ├──► doc #3 (Agent Workforce) — defines what runs inside the Trigger.dev jobs
        │
        └──► doc #6 (Security) — defines RLS policies + audit trail enforcement in detail
```

Recommend building/reading in roughly this order: Architecture → Accounting Rules → Ingestion → Agents → Security, since agents need both accounting rules and ingested data to have something to act on, and security wraps all of it.

---

_Companion to XENBOOX_PRD.md Section 9 (Multi-Tenancy), Section 18 (Tech Stack), and Section 19 (Security)._
_Next doc: Accounting Rules Engine Spec._
