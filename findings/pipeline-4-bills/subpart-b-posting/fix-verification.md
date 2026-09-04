# P4-B — AP Posting to the General Ledger — Fix Verification

**Finding (B1, critical):** AP bills and payments were recorded in `invoicesAp` /
`paymentsAp` but **never posted to the general ledger**. The P&L / balance sheet
read only posted `journalEntries`, so payables and vendor payments were
financially invisible — the exact gap P3-B fixed for AR, still open for AP.

## Fixes

| File                                                | Change                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/server/journal-posting-core.ts` **(new)** | Extracted the shared posted-JE core from `ar-posting.ts` so AR and AP post through one code path: reference idempotency (`je_entity_reference` unique index + pre-check), open-fiscal-period gate, TrustGuard validation, `entryNumber` = max+1, compensation on line-insert failure.                                                                                                        |
| `packages/db/lib/ap-ledger.ts` **(new)**            | Pure AP account resolvers/line builders: `resolveApPayableAccount` (2100 AP), `buildApInvoiceLines` (Dr lines / Cr AP), `buildApPaymentLines` (Dr AP / Cr receipt). Exported from the db barrel.                                                                                                                                                                                             |
| `apps/web/server/ap-posting.ts` **(new)**           | AP posting orchestration mirroring `ar-posting.ts`: bill → `ap-inv-{id}` (Dr expense/asset lines / Cr AP), payment → `ap-pay-{id}` (Dr AP / Cr receipt), void → `ap-inv-rev-{id}` reversal (swapped debit/credit, status `reversed`). Bill posting is best-effort (never blocks creation on a closed period); **payment posting throws** — money can never leave without hitting the ledger. |
| `apps/web/server/ar-posting.ts`                     | Refactored onto the shared core (behavior preserved, duplication removed).                                                                                                                                                                                                                                                                                                                   |
| `apps/web/server/routers/ap.ts`                     | Wiring at the three call sites: bill creation posts best-effort + logs the skip reason; void reverses the bill JE; payment posts **before** the audit insert so a rolled-back payment leaves no trail. Delete guards for posted rows already shipped in P4-A (B7).                                                                                                                           |
| `packages/db/lib/index.ts`, `packages/db/index.ts`  | Barrel exports for the new AP ledger module.                                                                                                                                                                                                                                                                                                                                                 |

## Integrity rules enforced (same as AR)

- **All-or-nothing line accounts** — a line account missing from the entity COA
  never redirects to the AP account; posting is skipped with `missing_line_account`
  and surfaced for a retry.
- **Idempotent by reference** — retries can't double-post (`ap-inv-{id}`,
  `ap-pay-{id}`, `ap-inv-rev-{id}`).
- **Payment requires a posted bill** — explicit error otherwise.
- **Void reverses, delete refuses** — posted bills/payments cannot be hard
  deleted (would orphan the JE); void instead, which reverses the books.

## Verification

- `vitest run __tests__/ap-record-layer.test.ts __tests__/ar-ledger-posting.test.ts` → **35 passed**.
  New static coverage: wiring presence/order (payment post precedes audit), core
  gate location (idempotency/TrustGuard/open-period in the shared core), AP
  module structure (references, reversal swap, bill-posted-first requirement,
  no silent account redirect).
- `esbuild --bundle` parse check on `ap.ts`, `ap-posting.ts`, `journal-posting-core.ts` → clean.
- Schema verified: `invoicesAp.journalEntryId`, `paymentsAp.journalEntryId`,
  JE `reversedBy/reversedAt/postedBy/postedAt/entryNumber/metadata` all exist;
  `je_entity_reference` unique index backs the idempotency claim.
- Full `--changed HEAD` web suite: the 8 real failures + 20 collection failures
  are **pre-existing** (agents `tax-install` alias graph from a parallel
  session) — proven identical with my changes stashed.
