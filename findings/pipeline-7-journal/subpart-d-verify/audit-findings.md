# Pipeline 7 — Sub-Part D: Verification Loop (journal writers audit)

**Scope:** cross-surface audit of every `journal_entries` writer — the
entry-number race, orphan risk, and reversal-period behavior across the app.

---

## 🔴 D1 — Systemic: entry-number races at every journal writer

Every direct `journalEntries` writer allocates `entryNumber = max + 1`
read-then-insert against the **UNIQUE (entityId, entryNumber)** index. Two
concurrent writers (bank sync + approval, two agent pipelines, UI + agent)
race → the loser aborts on a raw constraint error and a legitimate posting
never lands. Audited and hardened this pass:

| Writer                                                                                                                     | Fix                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `journal-posting-core.createPostedJournal` (shared choke point for expense approvals, claim reimbursements, AR/AP posting) | ✅ 3-attempt retry                                                                                                                   |
| `ar-posting.reverseArInvoiceJournal` (invoice void reversal)                                                               | ✅ retry                                                                                                                             |
| `ap-posting.reverseApBillJournal` (bill void reversal)                                                                     | ✅ retry                                                                                                                             |
| `ledger-agent/tools.postEntry` (architecture's single GL entry point for agent posts)                                      | ✅ retry + **batch lines + compensation** (was N+1 `Promise.all` with no cleanup → an orphaned posted entry if a line insert failed) |
| `journal.ts create` / `reverse` (P7-A/B)                                                                                   | ✅ already retry                                                                                                                     |

**Remaining sites (same pattern — mapped for their owning pipeline passes):**
`routers/banking.ts:1869`, `routers/data-import-export.ts:747`,
`lib/dunning.ts:574`, `ingestion/engine/journal-generator.ts:235/285` (P1),
`agents/core/asset-pipeline.ts:662`, `inventory-pipeline.ts:550`,
`payroll-pipeline.ts:1883`, `close-pipeline.ts:958`, `jobs/month-end-close.ts:219`
(P8). These run as single-instance-per-entity jobs in practice; each gets the
same bounded retry when its pipeline is deep-audited.

---

## 🔴 D2 — AR/AP void reversals dated today into the original's (possibly closed) period

`reverseArInvoiceJournal`/`reverseApBillJournal` post the reversal with
`date = today` but `periodId = original.periodId` — identical to the journal
router bug fixed in P7-B (B4): when the original month is closed, the void
reversal silently rewrites a locked period.

**Not changed in this pass:** AR/AP void semantics are P3/P4-owned and the
void flows may legitimately expect same-period reversal; changing their period
resolution needs the AR/AP verification pass to confirm UI + period-lock
behavior together. Flagged for that pass with the P7-B B4 fix as the reference
pattern (resolve the current open period; refuse when closed).

---

## ✅ Verification

- `journal-record-layer.test.ts` now 19 assertions (A + B + C + D).
- AR/AP/expense/canary suites: 89 green; all edited files parse clean.
