# P4 — Cross-Sub-Part Verification Loop — Fix Verification

Re-audit of the seams between P4-A/B/C/D after all four landed.

## Seams verified clean

- **AR↔AP reversal parity** — mechanical diff of `reverseArInvoiceJournal` vs
  `reverseApBillJournal` (names normalized): identical guards, reversed-status
  idempotency, swapped debit/credit lines, cleanup-on-failure, original marked
  `reversed` with `reversedAt`. ✅
- **Unposted payment rollback** — `postApPaymentToLedger` throws; `createPayment`'s
  compensation path deletes the payment row and restores the bill balance/status
  (tested in P4-A/B). ✅
- **Void vs payments** — void blocked while `paidAmount > 0`; void reversal only
  fires for bills with a posted JE. ✅
- **Overdue scan vs posted state** — independent concerns; posting never blocked
  by `overdue` status, scan never touches `journalEntryId`. ✅
- **retryPostBill idempotency** — already-posted bills return `{ posted: true }`
  no-op; UI only offers retry when unposted. ✅

## Finding & fix (V1 — High, cross-seam)

**Voided bills/invoices keep their `totalAmount`/`balance` on the row** (void only
sets `status`), but **5 AP aggregates and 4 AR/dashboard aggregates summed them
anyway** — voiding a bill inflated payables trend, vendor aging, top-vendors,
payables-per-vendor, revenue sparklines, AI forecast, and month-over-month
revenue/expense comparisons.

| File                                                      | Fix                                                                                                                                                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/server/routers/ap.ts`                           | `ne(invoicesAp.status, "voided")` added to: `getVendorsOverview` total + prev-total, `getTopVendors`, `listVendorsWithPayables` payables map, `getVendorAging` unpaid filter, `getPayablesTrend` monthly sums (6 sites). |
| `apps/web/server/routers/ai-workspace.ts`                 | `ne(status, "voided")` on current/prev revenue + current expenses.                                                                                                                                                       |
| `apps/web/server/routers/dashboard/get-ai-forecast.ts`    | Forecast revenue excludes voided.                                                                                                                                                                                        |
| `apps/web/server/routers/dashboard/get-dashboard-data.ts` | Revenue sparkline excludes voided.                                                                                                                                                                                       |
| `apps/web/server/routers/dashboard/get-scenario-data.ts`  | Scenario sparkline excludes voided.                                                                                                                                                                                      |

(`getOverview` in bills.ts and dashboard totals already used status IN lists /
explicit voided filters — verified, no change needed.)

## Verification

- `esbuild --bundle` parse on all 6 changed files → clean.
- `vitest run __tests__/ap-record-layer.test.ts __tests__/ar-ledger-posting.test.ts` → **45 passed**
  (new static coverage: ≥6 AP voided-exclusions, AR parity in ai-workspace/forecast).
- Full-suite delta: only pre-existing parallel-session failures remain (proven
  earlier via stash comparison).
