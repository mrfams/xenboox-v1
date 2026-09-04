# Pipeline 7 — Sub-Part C: UI Surface (Ledger)

**Scope:** the Ledger page — journal editor, register, entry detail actions,
exports.

---

## 🔴 Findings & Fixes

### C1 — The journal Export button exported ZERO rows

The Ledger toolbar's `BulkExportButton` was hard-coded `rows={[]}` — clicking
Export silently produced an empty CSV. A dead feature on the record-of-truth
surface.

**Fix:** removed the dead header button and mounted a real export on the
Journal register's counts strip, bound to the loaded entries (Entry #, Date,
Status, Description, Debit, Credit, Source). Only rendered when entries exist.
Dropped the now-unused `canExport`/`ledger.export` gating.

### C2 — Drafts could not be discarded from the UI

The server `journal.delete` (draft-only, permission-gated since P7-B) had no UI
entry point — a user who mis-entered a draft could never remove it from the
register.

**Fix:** Entry Actions now shows **Discard Draft** for `draft` entries with an
inline two-step confirm ("…has not been posted, so nothing has hit the books.
This cannot be undone."), wired to `trpc.journal.delete`, invalidating the
register on success and surfacing server errors inline (matching the Post /
Reverse error pattern).

### ✅ Verified sound (no change needed)

- Editor starts with two blank lines (≥2 requirement), live debit/credit
  totals with an explicit "must balance" gate, and disables submission on
  imbalance.
- Post / Reverse actions exist with error surfacing; reversal requires a
  reason + explicit confirm.
- Detail drawer renders status chips, per-line debit/credit with currency
  formatting, source, and entry description.

---

## ✅ Verification

- `journal-record-layer.test.ts` now 16 assertions (A + B + C).
- Ledger page + form parse clean (esbuild, platform=node).
