# Pipeline 4: Bill Flow (AP) — Sub-Part A — Record Layer — Deep Audit

**Scope:** `apps/web/server/routers/ap.ts` (suppliers, POs, AP invoices, AP
payments) + `bills.ts` numbering + schema (`packages/db/schema/ap-ar.ts` AP
half: suppliers, purchaseOrders, poLines, invoicesAp, invoiceApLines,
paymentsAp).

The AP module duplicates the pre-P3-A AR shape **including every P3-A bug**,
plus a few AP-only ones. Verified against code:

## 🔴 CRITICAL

- **B1 — Nothing posts AP to the ledger.** No code sets `journalEntryId` on
  `invoicesAp`/`paymentsAp` (same verified gap P3-B fixed for AR). Bills and
  payments are invisible to the P&L (expenses never hit the income statement)
  and the BS (AP/liability never recognized; bank outflow never lands).
  → Posting is P4-B; the A-fix keeps the record layer ready for it.

## 🟠 HIGH (fixed this sub-part, mirroring P3-A)

- **B2 — No money/date validation**: `unitPrice`/`amount`/dates unvalidated
  strings everywhere (createPO, createInvoice, createPayment). Same NaN /
  negative-payment / garbage-date failure modes as AR's A2/A3.
- **B3 — No entity scope on links**: line `accountId`s never checked against
  the entity COA; `supplierId` never checked on createPO/createInvoice
  (defense-in-depth); **`purchaseOrderId` on createInvoice is never validated
  at all** — a foreign-entity PO or a nonexistent PO passes zod and dies as a
  raw FK error (or, worse, links a bill to another entity's PO).
- **B4 — No compensation on the create paths.** All three (PO/invoice/payment)
  wrap inserts in the `db.transaction` shim which **silently executes with no
  real transaction** on neon-http — a lines/audit insert failure leaves an
  orphan header. AR's createInvoice already compensated; AP never did.
- **B5 — `updateInvoice` raw-set state forgery** (same as AR A5) + duplicate
  invoice numbers surface as raw unique-violation 500s (AR had a friendly
  409 + pre-check; AP has neither).
- **B6 — Payment race + negative/zero amounts** (same as AR A7).
- **B7 — Delete paths**: deleteSupplier FK-500s on suppliers with history;
  deleteInvoice only blocks paid (payments exist → raw FK error; posted →
  orphaned JE once P4-B lands); deletePO blocks only `approved` (a PO linked
  to a bill dies as FK error); deletePayment never restores the bill's
  paid/balance (AR A11 parity).

## 🟡 MEDIUM

- **B8 — `updatePO` raw-set**: status + supplierId editable after approval;
  dates unvalidated.
- **B9 — `bills.getNextBillNumber` count-based** (same delete-collision bug
  fixed for AR in A8).## Fix plan (this sub-part)
  Zod money/date/length boundary; cents math; entity-scope supplier + line accounts + purchaseOrderId (approved-or-beyond PO); compensation instead of the no-op transaction shim; friendly 409 on duplicates; gated AP updateInvoice (void-only); atomic CAS payments; delete guards + AP deletePayment balance restore; updatePO guard post-approval; max-sequence bill numbering. Posting to the ledger = P4-B.

## Implemented (committed)

- B2/B3/B4/B5/B6/B7/B8/B9 all fixed in `ap.ts` + `bills.ts`, mirroring the
  P3-A patterns exactly (shared `ar-validation` module, cents math,
  compensation, atomic CAS, void-only state machine, delete guards, bill
  balance restore on deletePayment, max-sequence bill numbers).
- **B10 (found in dialog review):** `create-bill-dialog` silently dropped
  invalid lines at submit (same A10 bug as invoices) — now validates inline
  and blocks submit with visible errors.
- Verification: 121 static/unit tests green across AR+AP+RLS+banking suites;
  all changed files parse (esbuild); no UI caller of the changed procedures
  is broken (only `ap.createInvoice` + `ap.createPayment` are UI-called, and
  their payloads satisfy the new schemas).
