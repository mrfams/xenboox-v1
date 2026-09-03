# Sub-Part C — Categorization Engine — Fix Verification

**Status:** ✅ Complete — all findings fixed, tested, committed & pushed.

---

## Fixes Executed

### 🔴 CRITICAL

| #      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Files                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **C1** | **Unmatched → "Revenue" at 0.6 on every transaction** (the amount > 0 fallback became always-true after the P2-B magnitude convention). Deleted the buggy fallback entirely. New shared categorizer is **direction-aware**: income categories only for deposit/interest/credit types; expense categories only for withdrawals/fees/transfers. Unmatched anything → null → stays Uncategorized.                                                                                                                                      | `packages/db/lib/bank-categorizer.ts` (new), `banking.ts` |
| **C2** | **Taxonomy inconsistent across 3 writers + parser results thrown away.** Extracted a **single shared categorizer** (`packages/db/lib/bank-categorizer.ts`) exporting the canonical Title Case taxonomy (`CANONICAL_CATEGORIES`). Both parsers + banking router now use it — 2 duplicate snake_case `categorizeTransaction` implementations deleted. Statement/CSV import now writes its confident (≥0.7) parser category into the **main `category` column** with `categorizedBy` + confidence instead of burying it in `metadata`. | parsers, `bank-import.ts`                                 |
| **C3** | **Provider category signals discarded.** Plaid/Mono ship a category per transaction; nothing read it. The shared categorizer now maps provider categories (Plaid `personal_finance_category` codes incl. detailed `X:Y` paths, Mono freeform) into the canonical taxonomy as a high-confidence signal, and **sync jobs categorize on arrival** so confident matches land immediately instead of sitting "Uncategorized".                                                                                                            | `bank-categorizer.ts`, `plaid-sync.ts`, `mono-sync.ts`    |

### 🟠 HIGH

| #   | Fix                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | **Fake learning loop → real one.** `updateTransactionCategory` now records an `aiCorrections` entry (from → to, pattern-keyed on the normalized description, upserted so repeat corrections increment `timesSeen` instead of spamming rows). Entity-scoped the update `.where()` (M5) too. |
| H2  | **autoCategorize silently truncated at 100.** Now loops in 500-row pages to a 5k/run cap with a skip-list so permanently-unclassifiable rows never cause a spin; returns `categorizedCount` + `needsReviewCount`.                                                                          |
| H3  | **Rules were direction-blind.** Shared `matchBankRules` treats signed rule values as direction signals: `+5000` only matches money-in, `-5000` only money-out; unsigned keeps legacy both-direction behavior. Priority order honored.                                                      |
| H4  | **No confidence gate.** Both procedures now enforce `MIN_AUTO_CONFIDENCE = 0.7`; below that → stays uncategorized, counted in `needsReview`.                                                                                                                                               |
| H5  | **Dead `countRuleMatches` removed** (was never called).                                                                                                                                                                                                                                    |

### 🟡 MEDIUM

| #   | Fix                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | Three duplicate categorizers → one shared engine (+ parsers import the pure `@xenboox/db/lib` barrel, not the neon-instantiating index).                                                                                               |
| M2  | **Fake undo → real undo.** `batchCategorize` returns the captured `previousState` per row; banking-view Undo calls the new `revertCategorization` mutation which restores the actual prior category/GL account/categorizer/confidence. |
| M3  | Sync jobs + statement import now auto-categorize confident matches on arrival (F3/F9).                                                                                                                                                 |
| M4  | Keyword heuristics rewritten with anchored regexes (`^(rent                                                                                                                                                                            | lease)`, `\bcab\b`, etc.) — no more `includes("ad ")`/`includes("charge")` false positives; the CSV parser's Chinese 广告 marketing keyword preserved. |
| M5  | Entity-scoped update in `updateTransactionCategory` + `batchCategorize` row updates.                                                                                                                                                   |

### 🟢 LOW

L1/L2 folded into the shared categorizer design (provider category + merchant fields usable as match signals; correction trail captures from → to).

---

## Bonus Fixes (found during build)

- `listTransactions` never returned `category`/`glAccountId`/`categorizedBy`/`categorizationConfidence` even though the banking-view UI filters and displays them → projection now includes them (was a silent always-"uncategorized" bug in the UI).
- `bank-import.ts` never typechecked (untyped `values` array + logger arg-order bug) → fixed.
- `lib/index.ts` name clash (`BankTxType` in two libs) → consolidated to `bank-amount` as the single source.

---

## Verification

| Check                                                                | Result                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bank-categorizer.test.ts` (db)                                      | ✅ 14/14 — direction (no Revenue on withdrawals), provider mapping (Plaid/Mono/detailed-path), rule priority + signed direction rules, type normalization |
| db full suite                                                        | ✅ 21 tests (7 amount + 14 categorizer)                                                                                                                   |
| jobs full suite                                                      | ✅ 10 tests                                                                                                                                               |
| ingestion full suite                                                 | ✅ 167 tests                                                                                                                                              |
| web banking suites                                                   | ✅ 31 tests                                                                                                                                               |
| web tsc `banking.ts`                                                 | ✅ clean                                                                                                                                                  |
| jobs tsc changed files (bank-import, parsers, plaid-sync, mono-sync) | ✅ clean                                                                                                                                                  |
| db tsc changed files                                                 | ✅ clean                                                                                                                                                  |

> **Pre-existing (not regressions, verified identical at HEAD via stash):** banking-view.tsx type errors (6) — listTransactions fields now correct but the component's local `Connection`/`transactionDate`/`status` typing mismatches remain for the Sub-Part F UI audit. Web-wide agents `tool-registry.ts` import issue noted in Sub-Part B still stands.
