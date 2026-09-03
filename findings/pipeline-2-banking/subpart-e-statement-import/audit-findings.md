# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part E — Statement / PDF Import — Deep Audit

**Scope:** statement-upload-zone → upload/confirmUpload → process-document → import-bank-statement job → CSV/PDF parsers → OCR pipeline, plus error/edge-case handling end to end.

---

### 🔴 CRITICAL (2)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Location                                                                                                                | Impact                                                                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **`parseErrors` are computed then thrown away.** The parsers push balance-equation mismatches, "no transactions found despite content", and "all amounts zero" errors into `parseErrors` — but `bank-import.ts` only logs the _count_ (`errors: parseResult.parseErrors.length`) and inserts whatever rows were extracted anyway. The user sees "Statement imported successfully — N transactions imported" even when the deterministic balance check FAILED or extraction produced garbage. The upload zone's done-state shows no error channel at all. | `bank-statement-parser.ts` (balance validation), `bank-csv-parser.ts`, `bank-import.ts:96`, `statement-upload-zone.tsx` | A corrupted/scanned/garbage statement silently imports wrong data into the books — exactly what the deterministic checks were built to prevent. TrustGuard philosophy violated: parse errors must surface and block (or clearly warn) before rows are written. |
| **C2** | **Single-amount CSV direction heuristic is backwards for many banks.** When a CSV has one amount column, `type = amountStr.startsWith("-") ? "debit" : "credit"` — positive → credit. Many African bank exports (and US statement exports) put debits as positive numbers in a single "Amount" column. After P2-B, direction comes from `type`; a wrong guess silently flips every row's money direction (withdrawals become deposits).                                                                                                                  | `bank-csv-parser.ts parseTransactionRow`                                                                                | Silent money-direction corruption at import for a large class of bank exports. The parser _does_ have a balance column — it can infer direction deterministically from balance deltas instead of guessing.                                                     |

### 🟠 HIGH (3)

| #   | Finding                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **No parse-error channel reaches the UI.** Even the "skipped" count in the done-state is derived from found−inserted (reference dedup), not from parse errors or balance failures. There is no way for a user to learn their statement failed validation.                                                                        |
| H2  | **Dedup by reference alone can drop legitimate duplicate transactions.** `bank-import.ts` skips any row whose `reference` exists in the entity — two identical same-day transfers (salary batches, standing orders, duplicate refs) are silently dropped, even when amounts/dates differ.                                        |
| H3  | **No validation that OCR actually produced usable text.** `ocrWithVision` returns `confidence: 0.92` whenever the model returns any non-empty string, and `ocrPdfPages` falls through to vision without checking whether the result parses into rows. The parser's "no transactions despite content" check is warning-only (C1). |

### 🟡 MEDIUM (4)

| #   | Finding                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Balance-equation tolerance is 0.1% of closing balance with a 1-cent floor — reasonable, but when opening/closing balances are absent from the parse, **no balance validation runs at all** (silently skipped).         |
| M2  | `parseDate` DD/MM vs MM/DD ambiguity is resolved by format-order, not by the bank's locale — a US-format CSV parsed as DD/MM silently swaps months/days.                                                               |
| M3  | CSV header detection requires ≥2 keyword matches but column mapping falls back to silent `-1` — a header-mismatch CSV produces `date === -1` rows dropped with only a generic parse error, no header-level diagnostic. |
| M4  | Import caps at `MAX_TRANSACTIONS = 10_000` with a log-only warning — silently truncated imports are reported as success.                                                                                               |

---

## Fix Plan — Sub-Part E

| #   | Fix                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | **Block on deterministic failures (C1).** `bank-import.ts` throws on balance-equation mismatch / zero-amount extraction / zero-rows-with-content, so the job fails (→ document status `failed`, DLQ, user-visible error via existing failed-channel). Persist `parseErrors` into the document metadata so they're recoverable. |
| F2  | **Balance-delta direction inference (C2).** In `parseTransactionRow` single-amount mode, when a balance column exists, infer `type` from the balance delta (balance decreased → debit, increased → credit) — deterministic, no guess. Keep sign-based fallback only when balance is absent.                                    |
| F3  | **Surface parse errors to the UI (H1).** Import job writes `parseErrors` (and per-row skip reasons) to `documents.metadata.bankImport`; the upload zone reads them and renders a warning list instead of a pure success card.                                                                                                  |
| F4  | **Smarter dedup (H2).** Dedup key = reference + amount (and only when both present); never skip on reference alone with a different amount.                                                                                                                                                                                    |
| F5  | **OCR usability gate (H3).** After OCR + parse, if zero rows and content exists → fail (part of F1).                                                                                                                                                                                                                           |
| F6  | **Balance validation always attempted (M1).** When opening/closing balances are absent, still validate the internal running-balance consistency of consecutive rows (balance[n] == balance[n−1] ± amount) where balances exist.                                                                                                |
| F7  | **Header diagnostics (M3).** When `date` or `description` column mapping fails, emit a specific parse error naming the expected columns.                                                                                                                                                                                       |

---

### Verification (after build)

- CSV parser tests: balance-delta direction (withdrawals-as-positive), dedup semantics, header-mismatch error
- bank-import failure tests: balance mismatch → throws; parseErrors persisted
- Web banking suites + jobs typecheck/tests; statement-upload-zone renders warnings
