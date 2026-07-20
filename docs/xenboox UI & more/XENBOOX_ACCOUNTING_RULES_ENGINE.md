# XENBOOX — Accounting Rules Engine Spec

> Engineering handoff doc. Companion to XENBOOX_PRD.md, XENBOOX_UI_SPEC.md, XENBOOX_SYSTEM_ARCHITECTURE.md.
> This is the domain-correctness layer. Agents decide _what_ to do (doc #3); this doc defines what is _mathematically and accounting-ly valid_ regardless of who or what is doing it. If this doc is wrong, the agents can orchestrate perfectly and still produce wrong books.
> Version: v1.0 | Last updated: July 2026

---

## 1. Purpose and Boundary

This engine is a **library of pure, deterministic functions and validators** that sit between the Agent Layer and the database. Agents call into this engine to post entries, calculate depreciation, close periods, etc. The engine never makes judgment calls (that's agent logic) — it only enforces "is this valid" and "what does correct math produce." No agent, no human, no API route may write directly to `journal_entries`/`journal_lines` bypassing this engine.

```
Agent decides "post this expense"  →  Rules Engine validates + calculates  →  DB write
        (doc #3 territory)               (this doc's territory)
```

---

## 2. Layer 1 — Hard Constraints (Zero AI tolerance, per PRD Section 6.7)

These are enforced in code, not by any model, and cannot be overridden by any agent or human user short of a database migration.

### 2.1 Double-Entry Enforcement

- Every `journal_entries` row must have ≥2 `journal_lines`
- `SUM(journal_lines.debit) = SUM(journal_lines.credit)` for every `journal_entry_id`, checked **before** commit, not after
- Implementation: Postgres constraint trigger on `journal_lines` insert/update, not just application-level validation — per Architecture doc's RLS-at-DB-layer philosophy, correctness lives at the DB layer wherever possible
- Any attempt to post an unbalanced entry is rejected with a specific error identifying the imbalance amount — never silently corrected or rounded away

### 2.2 Account Type Rules

- Each account has a `normal_balance` (debit or credit) derived from its `type`:
  - Assets, Expenses → normal debit balance
  - Liabilities, Equity, Revenue → normal credit balance
- Posting logic must flag (not block, but flag amber to Controller Agent) any entry that moves an account against its normal balance direction beyond a defined tolerance — usually valid (contra accounts, reversals) but worth a second look

### 2.3 Period Locking

- No journal entry may post to a `ledger_period` with status `closed`, full stop
- Reopening a period (via Error Recovery Flow) requires explicit status transition `closed → reopened`, logged in audit trail, before any new entries are accepted
- Reopening does not delete prior entries — corrections are new entries or explicit reversals, original is preserved (immutability principle, Section 6 below)

### 2.4 Currency Consistency

- Every `journal_lines` row inherits its entity's base currency for ledger purposes
- Foreign-currency source transactions are converted at posting time using the rate rules in Section 5 — the ledger itself only ever holds base-currency values plus a reference to the original transaction's foreign amount/rate for audit purposes

---

## 3. Chart of Accounts Rules

### 3.1 Standard Templates

- Templates keyed by `(business_type, country)` — e.g. `(sme, gambia)`, `(ngo, generic)`, `(corporation, nigeria)`
- Each template defines a standard account tree: Assets → Current/Fixed, Liabilities → Current/Long-term, Equity, Revenue → by category, Expenses → by category
- NGO templates include project/donor-code sub-accounts by default (ties to Donor Reporting, Phase 2)
- Templates are versioned data (JSON/seed files), not hardcoded — new country/type combos should be addable without a code deploy

### 3.2 Custom Accounts

- Users (or CFO Agent on their behalf) can add accounts under existing parent categories
- New top-level account types cannot be created outside the five fixed types (asset/liability/equity/revenue/expense) — this is a hard constraint, not a preference
- Deactivating an account (not deleting) is the only removal path if it has any transaction history — preserves audit trail integrity

---

## 4. Module-Specific Calculation Rules

### 4.1 Accounts Payable / Receivable

- Invoice/bill amounts are immutable once sent/received — corrections are credit notes or new documents, never in-place edits to a sent invoice (legal + audit reasons)
- Aging buckets (30/60/90) are calculated relative to `due_date`, computed on read, not stored — avoids stale aging data
- Payment matching: partial payments allowed, `bills`/`invoices` status only moves to `paid` when `SUM(payments) = amount` within a defined rounding tolerance (e.g. $0.01)

### 4.2 Cash and Imprest

- Imprest retirement math: `retired_amount + outstanding_receipts_total` must reconcile to `amount_issued` within tolerance; any gap becomes a flagged discrepancy, never auto-written-off
- Cash till balance is a running total recalculated from `cash_transactions`, not manually editable — any "adjustment" is itself a transaction with a reason code, preserving the audit trail

### 4.3 Bank & Mobile Money Reconciliation

- A reconciliation may only be marked `complete` when every `bank_transactions`/`mobile_money_transactions` row in the period has either a `matched_journal_entry_id` or an explicit `unmatched_reason` — per PRD Treasury Agent rule, "never closes with unresolved items," enforced here as a hard gate, not a suggestion
- Matching tolerance: transactions matched by amount + date window (configurable, default ±3 days for mobile money to bank settlement lag) — exact rule lives here so it's consistent regardless of which agent or human does the matching

### 4.4 Fixed Assets (Phase 3, rules defined now for schema readiness)

- Depreciation methods supported at launch: straight-line, reducing-balance
- Formula inputs: `purchase_value`, `useful_life_years`, `salvage_value (default 0)`, `depreciation_method`
- Depreciation runs monthly as part of close, posts one journal entry per asset class (not per asset, to avoid ledger bloat) — engine provides both per-asset and aggregated posting functions

### 4.5 Inventory (Phase 3, rules defined now for schema readiness)

- Valuation methods supported: FIFO, weighted-average (LIFO explicitly excluded — not IFRS-compliant, relevant for markets following IFRS)
- COGS calculated at point of sale using the entity's configured valuation method — method is set once per entity at setup, changing it mid-year requires an explicit, logged transition event (not a casual settings toggle)

---

## 5. Multi-Currency Rules (per PRD Section 12, locked)

- Rate source priority: ECB primary, Open Exchange Rates fallback, pulled daily at market close, stored with timestamp
- **Transaction date rate is used for recording**, never payout date — this is fixed and must not vary by agent or module
- Every foreign-currency transaction stores three values: original amount + currency, rate used, base-currency equivalent — all three persist even after conversion, never just the converted figure
- **Unrealized vs realized gain/loss determination:**
  - Unrealized: invoice/bill outstanding, rate has moved since recording → adjustment hits balance sheet (a designated FX reserve/translation account), not P&L
  - Realized: payment received/made and converted → difference between recorded rate and settlement rate posts to P&L as FX gain/loss
  - This engine provides the calculation function; the Ledger Agent (doc #3) calls it at the appropriate trigger points (period-end for unrealized, payment-matching for realized)

---

## 6. Immutability & Correction Principle

This applies across every module and is the single most important rule for audit trail integrity:

- **Nothing is ever deleted or silently overwritten.** Corrections are always new entries: reversals, credit notes, adjusting journal entries.
- Every correction references what it corrects (`corrects_entry_id` or equivalent FK)
- Both the original (wrong) and corrected state remain queryable — this is what makes the audit trail and Error Recovery Flow (PRD Section 8.1) possible at all
- The engine rejects any code path that attempts an in-place mutation of a posted `journal_entries`/`journal_lines` row

---

## 7. Month-End Close Sequencing (the logic behind PRD Section 8)

The engine defines the **deterministic checklist** that must be satisfied before a close can trigger — agents (Controller, Treasury, Compliance) are responsible for confirming each condition, but the engine defines what "confirmed" actually means numerically:

```
1. All journal_entries for the period have status = 'posted' (none stuck in 'draft')
2. SUM(debits) = SUM(credits) across the entire period (trial balance check)
3. All bank_transactions + mobile_money_transactions in period are matched or explicitly unmatched-with-reason
4. All bills/invoices in period are either paid, or correctly carried as open AP/AR (not orphaned)
5. Depreciation run has executed for the period (once Fixed Assets is live)
6. No unresolved imprest discrepancies above the defined tolerance
7. Tax calculations for the period pass the rule-based validator (once Tax module is live)
```

- Engine exposes a single `checkCloseReadiness(entity_id, period)` function returning pass/fail per condition — this is what the Close Center UI (UI spec Section 7) renders as the checklist
- Close only auto-triggers when **all** conditions pass AND all relevant agent confidence thresholds are met (confidence threshold logic itself lives in doc #3, but it reads this engine's pass/fail output as an input)

---

## 8. Validation Layer — Where Agents Actually Call This Engine

Every write path from any agent must pass through these engine functions before touching the DB:

```
postJournalEntry(lines[])           → validates balance, account types, period status
calculateDepreciation(asset, period) → returns amount, does not post
calculateFxGainLoss(txn, newRate)    → returns realized/unrealized amount + classification
matchReconciliation(bankTxn, ledgerEntries[]) → returns match or null, does not force-match
checkCloseReadiness(entity_id, period) → returns per-condition pass/fail
reopenPeriod(entity_id, period, reason) → validates reopen window rules (Section 9 below), logs, transitions status
```

Agents call these, inspect the result, and decide what to do with flags/failures (escalate, retry, notify human) — that decision logic is doc #3's territory. This engine only ever answers "is this valid" and "what does the correct number look like."

---

## 9. Reopen Window Rules (per PRD Section 8, Error Recovery Flow)

Encoded here as explicit, checkable logic rather than left to agent judgment:

```
last 3 months        → immediate reopen allowed, no extra confirmation
3–12 months          → reopen allowed, engine flags downstream-affected periods
                        (any period between reopened period and now with dependent balances)
beyond 12 months      → reopen allowed only after explicit scope assessment is generated
                        and human/CFO Agent confirms before any write occurs
```

- `reopenPeriod()` returns the list of downstream-affected periods computed from opening/closing balance dependencies — the CFO Agent uses this list to build its "honest scope assessment" message to the owner (PRD Section 8), but the _computation_ of what's affected is deterministic engine logic, not agent inference

---

## 10. Testing & Golden Dataset Hook

- This engine is the primary target of the golden dataset regression tests referenced in PRD Section 6.7 (Layer 3)
- Every function above should have a corresponding suite of known-input/known-correct-output test cases, run before every deploy
- Audit Agent (doc #3) calls into this same engine independently to cross-check ledger entries — meaning the engine's correctness is load-bearing for both normal posting AND the internal audit function; a bug here compromises both simultaneously, which is why it's isolated as its own spec rather than folded into agent logic

---

## 11. What This Doc Deliberately Does NOT Cover

- Which agent decides to call `postJournalEntry` and when → **doc #3**
- How documents get parsed into the structured data that becomes a journal entry input → **doc #5**
- Who is allowed to trigger a reopen, role permissions → **doc #6**
- Database schema/table definitions themselves → **doc #2 (Architecture)**

---

_Companion to XENBOOX_PRD.md Section 6.7 (Accuracy Architecture), Section 8 (Close Flow), Section 12 (Multi-Currency)._
_Next doc: Data Ingestion & Integrations Spec._
