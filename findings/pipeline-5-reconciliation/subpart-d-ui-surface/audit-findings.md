# P5-D — Reconciliation UI Surface — Audit & Fixes

## Findings

| #      | Severity | Finding                                                                                                                                                             | Fix                                                                                                                                                                                                                                                                |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **D1** | High     | The view had **no Finalize flow** — users could match every item but never close the reconciliation (statement date + balance). The feature dead-ended at matching. | Added a Finalize panel (statement date + statement balance + Finalize button) calling `finalizeReconciliation`; blocks with a toast when no account is selected or the balance is missing; surfaces the server's "N transactions are not reconciled" error inline. |
| **D2** | Medium   | `reconcileTransaction` mutation had **no onError** — the new P5-A guards (unreconcile first, posted-only) failed invisibly.                                         | `onError: (err) => toast.error(err.message)` on reconcile + finalize mutations.                                                                                                                                                                                    |
| **D3** | Low      | HistoryView icon mapping never matched `closed` (checked `matched`), so **every closed reconciliation rendered a red alert icon**.                                  | `closed` → emerald CheckCircle2; `unmatched`/`partial` → amber; else red.                                                                                                                                                                                          |
| **D4** | Low      | `toast` was used but never imported — runtime ReferenceError on any error path.                                                                                     | Added `import { toast } from "sonner"`.                                                                                                                                                                                                                            |

## Files

- `apps/web/components/finance/reconciliation-view.tsx`.

## Verification

- esbuild parse → clean.
- `vitest run __tests__/reconciliation-record-layer.test.ts __tests__/banking-ui-integrity.test.ts` → **31 passed** (4 new P5-D assertions).
