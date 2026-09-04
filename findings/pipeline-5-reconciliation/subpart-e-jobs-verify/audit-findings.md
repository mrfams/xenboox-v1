# P5-E — Jobs/Scheduling + Verification Loop — Audit & Fixes

## Jobs/Scheduling audit

- **No reconciliation cron exists** (verified cron route list: bank-feed-sync, month-end-close, daily-digest, etc. — none touch reconciliation). Correct by design: reconciliation is a **human-decision process** (match/confirm/finalize) and must not auto-close. Auto-matching happens on user-triggered `autoReconcile`. ✅ no change.

## Findings

| #      | Severity | Finding                                                                                                                                                                                                                              | Fix                                                                                                                                         |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1** | High     | The standalone router's original `matchTransaction` (still mounted, no UI consumer) kept the **unvalidated link** — same cross-entity/posted hole A2/A3. Any future caller (agent, API) could link a foreign JE or overwrite a link. | Same guards as `reconcileTransaction`: 404 on missing tx, JE must exist + be entity-scoped + posted, no silent re-point, audit trail added. |
| **E2** | Medium   | `autoReconcile`/`finalizeReconciliation` accepted **bare strings** for dates and money.                                                                                                                                              | ISO-date regex on `startDate`/`endDate`/`statementDate`; money regex on `statementBalance`.                                                 |

## Verification-loop seams (clean)

- **Unreconcile after finalize** — clearing a link post-close leaves the historical closed record intact (append-only history; the record documents what was closed). Correct.
- **Auto-matched blocks finalize** — `finalizeReconciliation` requires `isReconciled = true` on every tx, so auto-matched items (linked, unconfirmed) force human confirmation. Correct.
- **One-to-one invariant** — P5-B's candidate exclusion + P5-A's re-point guard keep 1 JE ↔ 1 tx.
- **Agents** — the tier3 reconciliation-agent uses its own `matchTransactions` tool, not the router; no bypass path. ✅
- Known heuristic left as-is: `getOverview` account-status cards compare lifetime tx net vs current balance (status heuristic, not a financial record) — noted for the cross-pipeline final pass.

## Files

- `apps/web/server/routers/reconciliation.ts` — hardened `matchTransaction`, ISO/money input validation.

## Verification

- esbuild parse → clean (fixed a comment/declaration line-collapse the editor introduced).
- `vitest run __tests__/reconciliation-record-layer.test.ts` → **22 passed** (2 new P5-E assertions).
