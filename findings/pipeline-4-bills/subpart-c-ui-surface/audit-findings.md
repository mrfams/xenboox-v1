# P4-C — AP UI Surface (Posted State) — Fix Verification

**Context:** P4-B added ledger posting for bills/payments. Bills can now be
created into a closed period (skip → unposted, `journalEntryId` null) and
payments reject until the bill posts. The UI must surface both — it previously
knew nothing about the ledger.

## Findings

| #      | Severity | Finding                                                                                                                                                                                                                                    | Fix                                                                                                                                                                                           |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | High     | `bills.listBills` emitted `billNumber`/`vendorName`, but the client (`bills-view.tsx`) renders `row.invoiceNumber`/`row.supplierName` — **every bill row showed "—" as the bill number** ("Unknown vendor" fallback hid the second break). | Mapper now emits `invoiceNumber`/`supplierName` (aliases kept for external consumers) + comment.                                                                                              |
| **C2** | High     | No `journalEntryId` in `listBills`/`getBillDetail` — the UI could not show posted state.                                                                                                                                                   | Both queries now expose `journalEntryId` (list select + mapped output, detail return).                                                                                                        |
| **C3** | High     | No way to post a skipped bill (closed period at creation) from the UI.                                                                                                                                                                     | New `ap.retryPostBill` procedure (mirrors `ar.retryPostInvoice`): guarded (not found / voided), maps posting reasons to plain English via `friendlyApPostReason`.                             |
| **C4** | Medium   | Detail panel let users record payments on unposted bills — the server then rejected with a raw error.                                                                                                                                      | Amber "not in the general ledger" banner + **Post to ledger** button; Record Payment disabled with tooltip until posted. Payment success now invalidates `bills`/`ap` so the panel refreshes. |
| **C5** | Medium   | List rows gave no ledger signal.                                                                                                                                                                                                           | "Not in ledger" chip on rows (hidden for paid/voided), matching the AR invoices list.                                                                                                         |

## Files

- `apps/web/server/routers/bills.ts` — list select + mapper, detail `journalEntryId`.
- `apps/web/server/routers/ap.ts` — `retryPostBill` + `friendlyApPostReason`.
- `apps/web/components/finance/bill-detail-panel.tsx` — banner, retry, payment gate, invalidation.
- `apps/web/components/finance/bills-view.tsx` — `Bill` type + not-in-ledger chip.

## Verification

- `esbuild --bundle` parse check on all 4 files → clean.
- `vitest run __tests__/ap-record-layer.test.ts __tests__/ar-ledger-posting.test.ts __tests__/banking-ui-integrity.test.ts` → **51 passed** (new P4-C static coverage: query shape, C1 key fix, retryPostBill, panel gate, list chip).
