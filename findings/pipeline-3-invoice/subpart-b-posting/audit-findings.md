# Pipeline 3: Invoice Flow — Sub-Part B — Posting & GL Integration

**Finding (A1 from Sub-Part A, now fixed):** AR invoices & payments never
reached the general ledger. Financial reports (`reports.ts`) read **posted
journal entries only**, and nothing anywhere set `journalEntryId` on
`salesInvoices` or `paymentsAr` (verified by grep across routers/jobs/agents —
only banking, reconciliation, ingestion and the asset pipeline wrote it).
Creating an invoice + recording a payment had ZERO effect on the P&L or
balance sheet: revenue unrecognized, AR invisible on the BS, bank receipts
never landed. The AR module was an operational register, financially
invisible.

---

## What was built

### `packages/db/lib/ar-ledger.ts` (pure — mirrors `bank-ledger.ts`)

- `resolveArReceivableAccount` — existing `accounts_receivable` row wins, else
  the canonical row to create (`1100 Accounts Receivable`).
- `resolvePaymentReceiptAccount` — by method: `cash` → cash subtype (else
  `1010 Cash on Hand`); bank/mobile/check/card → `bank_account` subtype (else
  `1020 Bank Account`).
- `buildArInvoiceLines` — Dr AR (total) / Cr each line account (integer cents).
- `buildArPaymentLines` — Dr receipt / Cr AR. Entries always balance to the cent.

### `apps/web/server/ar-posting.ts` (orchestration — mirrors banking postToLedger)

- **`postArInvoiceToLedger`** — accrual revenue recognition at issue:
  `ar-inv-{invoiceId}` JE, Dr AR / Cr line accounts. Idempotent by reference;
  never throws (a skipped post — closed period, missing accounts — is logged;
  invoice stays unposted with `journalEntryId` null for retry).
- **`postArPaymentToLedger`** — `ar-pay-{paymentId}` JE, Dr receipt / Cr AR.
  **Throws** when it cannot post — callers roll the payment back so money can
  never be recorded without hitting the ledger.
- **`reverseArInvoiceJournal`** — void reversal `ar-inv-rev-{invoiceId}`:
  mirrored lines, original marked `reversed` (journal reversal convention).
  No-op when nothing was posted / already reversed.
- Every entry: TrustGuard `validateJournalEntry` before insert, reference
  idempotency key (unique `je_entity_reference` index), open-period gate,
  deterministic account creation, cleanup of orphan JEs on late link failure.

### `ar.ts` wiring

- `createInvoice` → posts the invoice JE (best-effort, logged skip).
- `createPayment` → posts the receipt JE **before** the audit insert; any
  posting failure throws into the existing compensation catch → payment row
  deleted + CAS balance reverted + no audit trail (payment never happened).
- `updateInvoice` (void) → reverses the posted invoice JE.
- `deletePayment` → **blocks** deletion of a posted payment ("reverse its
  journal entry first") — mirrors the banking posted-lock convention.

---

## Explicitly deferred / documented limitations (not silent)

- **Retry UI for unposted invoices** (created in a closed period) → Sub-Part C/D
  (UI layer): surface "not posted" + a post-to-ledger action.
- **Multi-currency invoices** post in the invoice currency; FX translation /
  revaluation is the multi-currency pipeline's job (Pipeline 12), out of scope
  here.
- **Credit notes / refunds** for overpayment corrections → future module;
  void + reversal covers the unpaid case.
- `db.transaction` is a no-op shim on neon-http — same compensation discipline
  used across banking is applied here (single-statement CAS, cleanup on
  failure).

## Verification

- Unit: AR ledger builders balance (invoice multi-line, payment), account
  resolvers (AR / cash / bank routing + toCreate codes) — 7 tests.
- Static: posting wiring present in `ar.ts` (auto-post on create/payment,
  void reversal, delete guard) + module guards (TrustGuard, reference keys,
  open-period, cleanup) — 21 total across P3 suites, all green.
- Full tsc skipped this session by request; changes were self-reviewed
  region-by-region. Full-suite run recommended before release.
