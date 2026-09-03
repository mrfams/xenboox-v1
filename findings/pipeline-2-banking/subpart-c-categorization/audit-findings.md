# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part C — Categorization Engine — Deep Audit

**Scope:** auto-categorize/batch-categorize procedures, user-defined bank rules, keyword heuristics, category taxonomy conventions, provider-category signals, manual-override learning loop, confidence gating, undo semantics.

---

### 🔴 CRITICAL (3)

| #      | Finding                                                   | Location                                                                                                                                                                                                                               | Impact                                                                                                                                                                                                                                                                                                                      |
| ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **Unmatched withdrawals get labeled "Revenue"**           | `banking.ts` `categorizeTransaction` final fallback: `if (Number(tx.amount) > 0) return { category: "Revenue", confidence: 0.6 }`                                                                                                      | After the P2-B convention lock (amount = positive magnitude), `amount > 0` is **always true**. Every transaction that misses rules + keywords — including withdrawals, fees, transfers — is silently categorized as **Revenue at 0.6 confidence**. Revenue is fiction; books are wrong at the source.                       |
| **C2** | **Category taxonomy is inconsistent across 3 writers**    | `banking.ts` heuristics (Title Case "Bank Fees", "Payroll"), `bank-csv-parser.ts` + `bank-statement-parser.ts` (snake_case "bank_charges", "payroll", "other"), demo generator (Title Case + "Mobile Money"/"Transfer" not in UI list) | The UI color map + filter + common-category list only knows Title Case. Parser-imported transactions store snake_case into `metadata.category` and the main `category` column stays `"Uncategorized"` forever — **import-time categorization is computed then thrown away** (`bank-import.ts:198` writes to metadata only). |
| **C3** | **Provider category signals are collected and discarded** | `plaid-sync.ts` stores `plaidCategory` (Plaid's own high-quality category per tx), `mono-sync.ts` stores `monoCategory`                                                                                                                | Plaid/Mono already send a category with every transaction — arguably the strongest signal available — but the categorizer never reads them (it only sees description/reference/amount). `grep` shows zero readers of `metadata.plaidCategory` outside the jobs. Free accuracy left on the table.                            |

### 🟠 HIGH (5)

| #   | Finding                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **The "AI learns from manual override" claim is false** — `updateTransactionCategory` sets `categorizedBy: "manual"` and the comment says "so the AI learns", but nothing ever reads manual overrides to create/suggest rules or feed `aiCorrections`. The learning loop (`ai-corrections.ts` `record`) is never called from the banking flow. |
| H2  | **`autoCategorize` silently truncates at 100** (`limit: 100`) with no continuation — one click processes at most 100 of N uncategorized transactions and reports "done". No pagination loop, no feedback that more remain.                                                                                                                     |
| H3  | **Rules are direction-blind** — `amount_equals`/`amount_above`/`amount_below` compare magnitude against the stored positive amount with no `type` check; a withdrawal rule can fire on a deposit of the same magnitude.                                                                                                                        |
| H4  | **No confidence gating before auto-apply** — heuristics return 0.6–0.85 confidence and are written straight to the DB. Project policy: confidence < 0.7 → escalate. Nothing below 0.7 should auto-apply.                                                                                                                                       |
| H5  | **`countRuleMatches` is dead code** (defined `banking.ts:1501`, never referenced).                                                                                                                                                                                                                                                             |

### 🟡 MEDIUM (5)

| #   | Finding                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Three duplicate `categorizeTransaction` implementations** (banking.ts, csv parser, statement parser) — already drifted (csv has a stray Chinese "广告" keyword; parsers return "other", banking returns null). One source of truth needed.        |
| M2  | **Banking-view "Undo" after batch categorize is fake** — `useUndo` onUndo only toasts "reverted" + refetches; no API call restores the previous state. Data is changed and the user is told it was undone.                                          |
| M3  | **Sync/import never triggers categorization** — after plaid/mono sync or statement import, all new transactions sit "Uncategorized" until a human clicks a button. Not AI-native: the pipeline should auto-categorize confident matches on arrival. |
| M4  | Keyword heuristics are case/anchor-naive (`includes("ad ")` to catch "facebook ads" — misses "AdSense", "ADVANCE", "gradient"; `includes("charge")` catches "discharge", "recharge" — wrong category).                                              |
| M5  | `updateTransactionCategory` update `.where()` omits `entityId` (only id) — relies on the pre-fetch for scoping; should scope the write too.                                                                                                         |

### 🟢 LOW (2)

| #   | Finding                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | `reference` matching only checks rule `reference_contains` — Plaid's `payment_channel`/merchant_name never used as match fields.                                                     |
| L2  | No `name`/display for `categorizedBy: "ai"` overrides (UI shows only "AI" chip) — acceptable for now, but the AI correction trail should capture what the user changed it from → to. |

---

## Canonical Category Taxonomy (used by UI colors + filters)

`Uncategorized`, `Office Supplies`, `Travel & Transport`, `Meals & Entertainment`, `Software & Subscriptions`, `Professional Services`, `Utilities`, `Revenue`, `Payroll`, `Bank Fees`, `Marketing`, `Rent & Lease`, `Insurance`, `Taxes`, `Cost of Goods Sold` (+ demo-only `Mobile Money`, `Transfer`, `Interest`).

---

## Fix Plan — Sub-Part C

| #   | Fix                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Extract a shared, tested categorizer** into `packages/db/lib/bank-categorizer.ts`: canonical Title Case taxonomy, direction-aware (`deposit`/`interest` → income categories only; withdrawals → expense categories), provider-category signal input, confidence per match. Delete the 3 duplicates; wire banking.ts + both parsers to it. |
| F2  | **Fix C1**: remove the always-true `amount > 0 → Revenue` fallback. Unmatched deposits → `Revenue` at low confidence only when `type` is deposit/interest; unmatched withdrawals → `null` (stay Uncategorized).                                                                                                                             |
| F3  | **Consume provider categories** (C3): map Plaid/Mono/parser category strings into the canonical taxonomy where mappable; treat as a high-confidence hint.                                                                                                                                                                                   |
| F4  | **Parser import applies its category** (C2): write to the main `category` column + `categorizedBy: "rule"` + confidence, instead of burying in `metadata`.                                                                                                                                                                                  |
| F5  | **Real learning loop** (H1): `updateTransactionCategory` records an `aiCorrections` entry (from → to); adds a pattern-key so future auto-categorization of the same description is skipped/escalated to the corrected value.                                                                                                                |
| F6  | **Full coverage + gating** (H2/H4): `autoCategorize` loops until none remain (per-call cap preserved via pagination) and only auto-applies confidence ≥ 0.7; below that leaves Uncategorized and counts as "needs review".                                                                                                                  |
| F7  | **Direction-aware rules** (H3): rule matching takes `type` into account for amount rules.                                                                                                                                                                                                                                                   |
| F8  | **Real undo** (M2): capture prior state in the mutation response; banking-view undo calls a revert mutation instead of a toast.                                                                                                                                                                                                             |
| F9  | Post-sync/import auto-categorize hook (M3): sync jobs + bank-import invoke the categorizer for new rows so confident matches land immediately (scoped to new insert batch, never full-table).                                                                                                                                               |
| F10 | Remove dead `countRuleMatches`, fix M4 keywords, entity-scope the M5 update.                                                                                                                                                                                                                                                                |

---

### Verification (after build)

- db categorizer unit tests (direction, taxonomy, provider mapping, confidence)
- web banking suites + typecheck; jobs typecheck; parser tests
- No regressions on bank-feed-import / bank-auto-matching suites
