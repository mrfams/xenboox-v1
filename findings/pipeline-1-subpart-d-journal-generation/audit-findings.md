# Pipeline 1 — Sub-Part D: Journal Generation — Deep Audit Findings

**Employee #4 · Date: 2026-09-03**
**Scope:** `journal-generator.ts`, `coa-mapper.ts`, `accounting-treatment.ts`, `general-ledger.ts`, `tax-calculator.ts` (+ wiring in `packages/ingestion/index.ts`)

## Verdict: 3 Critical, 10 High, 8 Medium, 4 Low — 25 findings

---

## 🔴 CRITICAL (3)

### C1 — Wildcard field patterns hijack workflow classification

**File:** `accounting-treatment.ts` (ap_payment + ar_invoice rules)

`fieldPatterns` regexes are tested against the **entire stringified JSON** of extracted data. Two rules use `/.*/` which matches _anything_:

- `ap_payment`: `fieldPatterns: { vendorName: /.*/ }` → **+2 on EVERY receipt**
- `ar_invoice`: `fieldPatterns: { customerName: /.*/ }` → **+2 on EVERY invoice**

Consequences:

- Every receipt scores ap_payment ≥5 → **customer payments (money IN) are booked as AP payments (money OUT)**. Cash expenses also lose to ap_payment on ties (array order).
- Every invoice scores ar_invoice ≥5 → **supplier invoices (money owed) are booked as AR/sales revenue**. An AP invoice becomes a sale — revenue fabrication.

This is the single most dangerous bug in the ingestion pipeline: wrong direction of money at scale.

**Fix:** Delete both wildcard patterns. Reorder `ar_payment` before `ap_payment` (a bare "receipt" defaults to money-in — the common SME case). Directional keywords ("paid", "received", "check", "customer") already differentiate via the keyword scorer.

### C2 — `postJournalEntry` reference check is TOCTOU (not atomic)

**File:** `journal-generator.ts`

Comment claims "Atomic reference check" but it's `findFirst` → `insert` with **no unique constraint** on `(entityId, reference)` in the schema. Two concurrent retries of the same document both pass the check and both post → double-posting to the GL.

**Fix:** Add `uniqueIndex("je_entity_reference")` + `uniqueIndex("je_entity_entry_number")` to the schema (generated migration). Rewrite `postJournalEntry` as a single `db.transaction` using `onConflictDoNothing` for the reference, and a bounded retry loop for entryNumber conflicts.

### C3 — Journal generator auto-balance leaves stale totals + broken metadata

**File:** `journal-generator.ts`

When an entry is unbalanced by ≤0.05, a rounding line is pushed but `totalDebit`, `totalCredit`, `balanced`, and `validation.doubleEntryValid` are **never recomputed**. A 0.03-diff entry:

- posts lines that actually balance, but
- records `balanced: false`, `doubleEntryValid: false`, and wrong totals in the entry/audit metadata.

Also the rounding line sets `accountCode: "9999"` / `accountName: "Rounding Adjustment"` while `accountId` points to a **different real account** — inconsistent GL data.

**Fix:** Recompute totals/balance after pushing the rounding line; populate code/name from the resolved account; require a valid `accountId` or fail validation instead of emitting a broken line.

---

## 🟠 HIGH (10)

### H1 — `entryNumber` computed in JS with no unique constraint → duplicate entry numbers

**File:** `journal-generator.ts` — two concurrent posts get the same `lastEntry + 1`. Fixed by the C2 migration + retry.

### H2 — `postJournalEntry` never verifies the entry is balanced

**File:** `journal-generator.ts` — posts whatever it's given. Add defense-in-depth: throw if `!entry.balanced` or any line has an empty `accountId` before inserting.

### H3 — `resolvePeriod` ignores fiscal period status → posts into CLOSED periods

**File:** `journal-generator.ts` — `fiscalPeriods.status` exists (`"open" | ...`) but the query filters only on year/month. A document dated in a closed month silently posts into locked books. **Fix:** require `status: "open"`; return null otherwise → "no open period" rejection path.

### H4 — `mapToChartOfAccounts` runs 2 full-table queries per suggestion, serially

**File:** `coa-mapper.ts` — `findAccountByLabel` loads **all** accounts for the entity and scores in JS; repeated per line. A 5-line invoice = 10+ queries. **Fix:** load all active accounts once, match code exact → label score in memory.

### H5 — `findAccountByLabel` can match the WRONG account type

**File:** `coa-mapper.ts` — type match is only +3 score, never a filter. A "Sales" label could match an expense account named similarly. Add a hard penalty (or exclusion) when types contradict.

### H6 — `getTrialBalance` (no period) = N+1 per account

**File:** `general-ledger.ts` — calls `getAccountBalance` per account serially; 100 accounts = 100+ queries. **Fix:** one `GROUP BY accountId` aggregation join.

### H7 — `listJournalEntries` loads all matching IDs just to count

**File:** `general-ledger.ts` — `.length` on full result set. Use `COUNT(*)`.

### H8 — `listJournalEntries` N+1 detail fetch (3 queries per entry)

**File:** `general-ledger.ts` — `getJournalEntryDetail` per entry (lines + accounts + period). Batch into 3 queries total.

### H9 — `output_vat` ignores category exemptions/zero-rating

**File:** `tax-calculator.ts` — the category rule only affects the `input_vat` branch. An **export** (zero-rated) or education sale still gets charged full output VAT. Apply zero/exempt in the output branch too.

### H10 — Extracted `taxAmount` trusted blindly (confidence 0.95)

**File:** `tax-calculator.ts` — if the LLM hallucinates a tax amount, it's used as-is with 0.95 confidence. **Fix:** compute expected rate = tax/subtotal and validate against the jurisdiction rate band (±2.5%); on mismatch drop confidence and flag — never trust the model.

---

## 🟡 MEDIUM (8)

### M1 — Entity jurisdiction never passed to `calculateTax`

**File:** `packages/ingestion/index.ts` — call site passes `undefined` (a comment placeholder). Fallback `inferJurisdiction` maps **USD → Gambia**, so a US entity (US config exists!) is taxed at 15% VAT. **Fix:** fetch `entity.country` once and pass it.

### M2 — Division by zero in taxRate computation

**File:** `accounting-treatment.ts` — `taxAmount / (totalAmount - taxAmount)` and `taxAmount / subtotal` produce `Infinity` when the divisor is 0. Guard both.

### M3 — Negative subtotal when taxAmount > totalAmount

**File:** `tax-calculator.ts` — `subtotal = totalAmount - taxAmount` can go negative → negative taxable amount. Clamp ≥ 0.

### M4 — `generateJournalEntry` ignores its `source` param

**File:** `journal-generator.ts` — entry hardcodes `source: "document_upload"` even for bank/payroll flows. Audit trail lies. Use the passed param.

### M5 — `conditions: any[]` type bypass

**File:** `general-ledger.ts` (2 spots) — violates strict-mode convention. Type as `SQL[]`.

### M6 — `getAccountHistory` N+1 per period

**File:** `general-ledger.ts` — 6 periods = 6 queries. Batch into one query grouped by period.

### M7 — `checkDuplicate` loads full rows to count

**File:** `engine/posting-engine.ts` — same `.length` anti-pattern as H7. Use `COUNT(*)`.

### M8 — `registerUnmappedAccounts` race on code generation

**File:** `coa-mapper.ts` — in-memory `existingCodes` prevents intra-call collisions, but two concurrent calls can generate the same code → unique violation. Acceptable for the user-approved flow, but catch-and-skip is cheap.

---

## 🟢 LOW (4)

### L1 — `reducedVatRate` is dead config — no category maps to `"reduced"`

**File:** `tax-calculator.ts` — dead branch; document or wire up later.

### L2 — `formatCurrency` hardcodes USD in treatment reasoning

**File:** `accounting-treatment.ts` — cosmetic (reasoning text only).

### L3 — `lineConfidence` keyed by accountCode collapses same-code lines

**File:** `coa-mapper.ts` — bank transfer (both sides code 1000) keeps one entry. Cosmetic.

### L4 — `getTrialBalance` snapshot path leaves `periodLabel` empty

**File:** `general-ledger.ts` — cosmetic; fetch label once.

---

## ✅ Already Production-Grade

- Entity scoping on every query (entityId everywhere) ✓
- `decidePosting` rejects on critical validation errors before posting ✓
- TrustGuard gate: failed deterministic checks block auto-post ✓
- COA unique constraint `(entityId, code)` exists ✓
- Double-entry construction with ≥2 lines check ✓
- Negative-amount and debit+credit validation ✓
- Unmapped account warnings surfaced ✓
- Period resolution by entityId ✓

---

## Fix Plan (grouped)

**Phase 1 — Critical (3):**

1. C1: Remove wildcard fieldPatterns; reorder ar_payment before ap_payment
2. C2: Schema unique indexes (entityId, reference) + (entityId, entryNumber); generate migration; transaction + onConflictDoNothing + retry loop
3. C3: Recompute totals/balance after rounding adjustment; use real account code/name; validate accountId

**Phase 2 — High (10):** 4. H1: entryNumber retry loop (part of C2) 5. H2: balanced + accountId assert before insert 6. H3: resolvePeriod requires open status 7. H4: batch COA load + in-memory matching 8. H5: type-contradiction penalty in label scoring 9. H6: GROUP BY trial balance 10. H7: COUNT(\*) for list total 11. H8: batch journal entry detail 12. H9: output_vat honors zero/exempt categories 13. H10: tax rate validation vs jurisdiction band

**Phase 3 — Medium (8):** 14. M1: pass entity.country to calculateTax 15. M2: guard taxRate divisions 16. M3: clamp subtotal 17. M4: use source param 18. M5: SQL[] types 19. M6: batch account history 20. M7: checkDuplicate COUNT 21. M8: registerUnmapped catch-and-skip

**Phase 4 — Tests:** 22. accounting-treatment classification tests (wildcard regression — invoice direction, receipt direction, cash expense) 23. tax-calculator tests (output VAT exemptions, rate validation, jurisdiction, negative subtotal) 24. journal-generator balance/rounding tests (pure logic via mocked db)
