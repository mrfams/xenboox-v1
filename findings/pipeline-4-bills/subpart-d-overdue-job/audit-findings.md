# P4-D — AP Background Jobs & Overdue Engine — Fix Verification

**Scope:** every scheduled job that touches the AP surface, plus notification copy.

## Audit result

| Area                                   | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mark-overdue-invoices` (reminders.ts) | Already covers **AP bills** with the P3-D hardening: ISO-date guard (`dueDate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'` — legacy garbage dates never silently marked overdue), statuses restricted to `pending`/`partial` (paid/voided excluded), finance-role audience (owner/admin/finance_director/accountant), per-entity failure isolation, audit trail per transition with `system` actor, daily dedup per user+entity. ✅ |
| `auto-link-document` (auto-link.ts)    | Document→bill matching is entity-scoped (`eq(invoicesAp.entityId, entityId)` + supplier/amount guards). Pipeline 1 scope, already audited. ✅                                                                                                                                                                                                                                                                            |
| PO approval automation                 | None exists — POs are money commitments that require human approval by design (`approvePO` is a gated mutation). Not a gap. ✅                                                                                                                                                                                                                                                                                           |
| PDF/email for AP                       | No vendor-facing bill send flow exists; the only AP email (`sendPaymentSentEmail`, supplier payment confirmation in `ap.createPayment`) is fire-and-forget with structured error logging. ✅                                                                                                                                                                                                                             |

## Finding & fix

| #      | Severity | Finding                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                                                      |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **D1** | Medium   | The overdue **notification copy was AR-voice regardless of direction** — a user whose vendor bills are overdue was told to "follow up to get paid faster" (collections language for money _you are owed_). For AP, you owe the vendor. | Direction-aware body: combined (invoices+bills) → "follow up on customer invoices and pay vendor bills"; invoices-only → original collections copy; bills-only → "pay them soon to protect vendor relationships and avoid late fees". Same dedup + title shape retained. |

## Files

- `packages/jobs/reminders.ts` — direction-aware notification body.

## Verification

- `esbuild` parse on reminders.ts → clean.
- `apps/web`: `vitest run __tests__/ap-record-layer.test.ts` → **28 passed** (new P4-D static coverage: AP overdue guard + audit actor + direction-aware copy).
- `packages/jobs`: `vitest run` → **25 passed** (no regression from the reminders change).
