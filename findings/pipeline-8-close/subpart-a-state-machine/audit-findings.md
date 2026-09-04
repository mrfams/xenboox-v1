# Pipeline 8 — Sub-Part A: Month-End Close State Machine

**Scope:** `fiscal.ts` — period open/close/lock transitions and idempotency;
who owns reopen.

---

## 🔴 Findings & Fixes

### A1 — Closing a period could strand unpostable entries (silent money loss)

`closePeriod` flipped `open → closed` with no check for `draft` /
`pending_review` journal entries in that period. Once closed, those entries can
never post (posting requires an open period), so unposted work was silently
locked out of the books forever.

**Fix:** refuse the close with counts when any draft/pending_review entries
remain — "Cannot close — N draft and M pending review journal entries are
still unposted in this period. Post, discard, or reverse them first."

### A2 — Close snapshot insert could 500 on retry (idempotency)

`trial_balance_snapshots` has a UNIQUE (entityId, periodId, accountId) index;
`closePeriod` inserted the snapshot unconditionally, so a close retried after a
partial failure (snapshot wrote, status flip failed) hit a raw constraint 500.

**Fix:** `.onConflictDoNothing()` on the snapshot insert.

### A3 — Concurrent closes could double-flip

Two admins closing the same period both passed the pre-read status check.

**Fix:** the flip is now conditional (`where status = 'open'`); zero rows →
friendly `CONFLICT` ("Period was already closed").

### ✅ Verified sound (no change needed)

- `lockPeriod` requires `closed` first (closed → locked) and role-gates on
  owner/admin/finance_director.
- `delete` refuses non-open periods and any period with journal entries.
- Reopen is deliberately pipeline-owned: `agents/close-pipeline.ts` processes
  reopen requests and flips `closed → open` (clearing closedBy/closedAt),
  gated by `validateReopenPeriod` (agents/accounting-rules) which classifies
  by age (immediate / downstream-flagged / scope-assessed). Deeper audit of
  that flow belongs to the P8-D jobs/recovery pass.

---

## ✅ Verification

- `fiscal-close-record-layer.test.ts` — 5 static assertions (A1–A3 + lock +
  delete).
- Router parses clean.
