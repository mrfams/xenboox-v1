# Pipeline 3: Invoice Flow — Sub-Part A — AR Record Layer — Deep Audit

**Scope:** AR schema (`packages/db/schema/ap-ar.ts` — salesInvoices, salesInvoiceLines,
paymentsAr, customers) + record procedures (`apps/web/server/routers/ar.ts` — create/
update/delete for customers/invoices/payments) + the creation UI wiring
(`create-invoice-dialog.tsx`, `invoice-lines-editor.tsx`, `customer-combobox.tsx`,
`invoicing.getNextInvoiceNumber`).

**Method:** one sub-part, engineering + edge-case + security + UX lens. Every finding
verified against actual code paths.

---

## Architecture map (verified)

| Surface            | Router                     | Role                                    |
| ------------------ | -------------------------- | --------------------------------------- |
| Writes (live UI)   | `ar` (ar.ts)               | customers/invoices/payments CRUD        |
| Reads/dashboards   | `invoicing` (invoicing.ts) | overview, PDF, email, next number       |
| Customer analytics | `customers` (customers.ts) | read-only dashboards (no writes — good) |
| AP equivalent      | `bills` / `ap`             | Pipeline 4 scope                        |

The UI create dialog calls `ar.createInvoice` + `invoicing.getNextInvoiceNumber` +
`invoicing.getCustomers` + `ar.createCustomer` (inline, via CustomerCombobox `onCreate`).
Earlier UX requests are confirmed landed: creatable customer combobox, auto first line item,
always ≥1 line on remove, month-scoped auto number (`INV-YYYY-MM-#####`).

---

## 🔴 CRITICAL

### A1 — AR invoices & payments never reach the general ledger

Verified: **nothing anywhere sets `journalEntryId` on `salesInvoices` or `paymentsAr`**
(grep across routers/jobs/agents — only banking, reconciliation, ingestion and the asset
pipeline write `journalEntryId`). Financial reports (`reports.ts`) read **posted journal
entries only** and never touch `salesInvoices`/`paymentsAr`.

Consequence: creating an invoice + recording payment has **zero effect on the P&L or
balance sheet**. Revenue is never recognized, AR never appears on the BS, the bank
receipt never lands. The AR module is an operational register that is financially
invisible — the exact class of bug P2-D fixed for banking (postToLedger).

→ Implementation is Sub-Part B (posting & GL integration), but it is the #1 reason the
invoice pipeline is not production grade.

## 🟠 HIGH

### A2 — No server-side money validation; junk & negative amounts accepted

- `unitPrice: z.string()` (createInvoice lines) — any string passes. `parseFloat("abc")`
  → NaN → TrustGuard logs NaN totals → insert 500s on the numeric column.
- `createPayment amount: z.string()` — `parseFloat("-50")` = -50. Guard is
  `paymentAmount > currentBalance` → -50 passes → **balance increases by 50, paidAmount
  goes negative**. "0" payments insert noise rows.
- Client dialog masks it by silently **dropping** invalid lines at submit (see A10).
- Money is stored as text columns (`numeric(15,2)` pg types but text/string inputs):
  no cents-cap, no scale check — `1.999` accepted where currency has 2dp.

### A3 — Date fields are unvalidated strings with no ordering

- `invoiceDate`/`dueDate` (invoice), `paymentDate` (payment): `z.string()` — "abc",
  "2026-13-99", and future-due dates all pass. Schema columns are `text`, so the DB
  cannot catch them either.
- No `dueDate >= invoiceDate` check (invoice due before issue is legal today).
- Downstream consumers do `new Date(str)` → Invalid Date → **NaN aging days** in
  `draftReminder`, `listCollections`, AR aging (`dunning.ts`), PDF/email rendering.

### A4 — Line `accountId` never entity-scope-checked

- Lines carry `accountId`; FK to `chartOfAccounts.id` guarantees existence _globally_,
  not within the entity. A caller who knows another entity's account uuid can book
  revenue lines against it. Every later posting/GL read then leaks cross-entity.
- Also no line-count cap and no distinct-account validation.

### A5 — `updateInvoice` is an unguarded raw set (state forgery)

- Zero UI callers (only the IDOR/RLS sweep references the name) — so it can be made a
  proper state machine without breaking UX.
- Today a caller can: set `status: "paid"` with no payment; set `status: "voided"`
  without reversal; flip a paid invoice back to pending; overwrite `totalAmount` to
  anything (desyncing header vs lines); `totalAmount` is not even recomputed from lines.

### A6 — Delete paths surface raw FK failures instead of clear conflicts

- `deleteInvoice` blocks only `status === "paid"`. An invoice in `partial` with recorded
  payments → FK RESTRICT (`paymentsAr.salesInvoiceId`, no onDelete) → raw 500
  "Failed to delete invoice".
- `deleteCustomer` deletes even when the customer has invoices (FK RESTRICT from
  `salesInvoices.customerId`) → same raw failure. No "deactivate instead" guidance
  (customers have `isActive`).

## 🟡 MEDIUM

### A7 — `createPayment` balance race + no real transaction

- Balance is read **before** `db.transaction`. And `packages/db/client.ts` documents
  that on the default neon-http driver, **`db.transaction` is a shim that executes the
  callback with NO real transaction**. Two concurrent payments for the same invoice can
  both pass the stale overpayment guard → overpaid invoice (paidAmount > total), money
  recorded twice with no lock or compare-and-set.
- Needs an atomic conditional update on the balance (single-statement compare-and-set
  works on both drivers), not read-modify-write.

### A8 — Next-invoice-number is count-based and fragile

- `getNextInvoiceNumber` counts invoices with `invoiceDate` in the current month —
  **including voided**, so voiding #3 makes the count suggest #4 while #3 is dead (gap)
  — actually the bug is the opposite: it counts ALL statuses, so after voiding #4 the
  count returns 3 and suggests #4 again → 409 conflict with the existing #4? No — count
  of {1,2,3,4(where 4 voided)} = 4 → suggests 5. Correct-ish, but deleting #2 → count 3
  → suggests 4 → collides with live #4 → 409. Deletions (allowed pre-payment) create
  re-suggestion collisions.
- No per-entity format/prefix configuration (discussed earlier; never built — requires an
  entity-settings column → deferred to a migration-safe moment, noted below).
- `invoiceNumber` zod is `min(1)` only — unbounded length, whitespace-only strings pass.

### A9 — Minor: reminder customer lookup unscoped + hardcoded "GMD"

- `draftReminder` customer query lacks the entity condition (defense-in-depth gap).
- Currency fallback chain ends in a hardcoded `"GMD"` — leaks a test locale; should be
  `entityCurrency ?? invoice.currency` (invoice.currency is NOT NULL).

### A10 — UI silently drops invalid lines at submit

- `create-invoice-dialog` filters lines through `validLines` (parseFloat >= 0 etc.) and
  submits only those — a user who typed a bad price or left a description blank gets the
  line **silently removed** from the created invoice, no error. Must validate inline and
  tell the user, not drop data.

### A11 — `deletePayment` never restored the invoice's paid/balance/status

Deleting a recorded payment removed the payment row but left the invoice
`paid`/`partial` with the old balance — paidAmount overstated, balance stuck at
0, books drift. (Found during implementation.)

---

## Fix plan (this sub-part)

1. **A2/A3/A8** — zod boundary: money strings (`^\d+(\.\d{1,2})?$`, cents math),
   date strings (ISO + real calendar date), `dueDate >= invoiceDate`, `invoiceNumber`
   trimmed ≤ 40, lines `min(1) max(200)`, payment `amount > 0`.
2. **A4** — entity-scope the line accounts (load distinct accountIds, all must belong
   to entity, else BAD_REQUEST).
3. **A5** — `updateInvoice` → gated: editable fields only (dates/notes, validated), no
   `totalAmount`; status changes restricted to `pending→voided` (only when no payments
   and zero paid), audit-logged; everything else rejected with plain-English guidance.
4. **A7** — `createPayment`: validate amount; atomic conditional update on
   `sales_invoices` (balance compare-and-set in one statement) as the authoritative
   mutation, then insert payment + audit; compensating delete on insert failure.
5. **A6** — delete guards with clear messages (payments exist / invoices exist →
   deactivate instead).
6. **A9** — scoped customer lookup; drop hardcoded GMD.
7. **A10** — dialog: inline line validation errors; never silently drop lines.
8. **getNextInvoiceNumber** — exclude voided; (per-entity prefix config deferred: needs
   entity-settings migration → do with the next planned migration when schema churn from
   parallel sessions settles).
9. Tests: pure unit tests for the money/date validators + static integrity tests for the
   guards; run AR/RLS/banking-UI suites + typecheck.

## Deferred to later sub-parts (explicit)

- **A1 posting → Sub-Part B** (GL integration: invoice → AR/Revenue JE, payment → Cash/AR
  JE, TrustGuard + open-period + idempotency; reversal & void semantics).
- Overdue state engine + reminders job correctness → jobs/notifications sub-part.
- PDF/email generation quality → Sub-Part D.
