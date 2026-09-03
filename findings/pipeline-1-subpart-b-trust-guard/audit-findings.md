# Sub-Part B: TrustGuard + Confidence — Deep Audit Findings

**Employee:** Engineering Lead + Security Engineer  
**Date:** 2026-09-03  
**Files Audited:** `trust-guard.ts`, `confidence.ts`

---

## Findings Summary

| Dimension   | Critical | High  | Medium | Low   |
| ----------- | -------- | ----- | ------ | ----- |
| Engineering | 0        | 3     | 4      | 2     |
| Security    | 0        | 1     | 0      | 0     |
| Edge Cases  | 1        | 2     | 1      | 0     |
| **Total**   | **1**    | **6** | **5**  | **2** |

---

## CRITICAL Findings

### C1: `customWeights` mutates global `DEFAULT_WEIGHTS` — race condition

**File:** `packages/ingestion/core/confidence.ts`  
**Line:** ~195  
**What:** `Object.assign(DEFAULT_WEIGHTS, customWeights)` permanently mutates the module-level `DEFAULT_WEIGHTS` object. If `computeIngestionConfidence` is called with different custom weights in concurrent Trigger.dev jobs, the weights leak across calls.  
**Impact:** Concurrent document processing could use wrong confidence weights, leading to incorrect auto-post decisions.  
**Fix:** Spread into a new object instead of mutating: `{ ...DEFAULT_WEIGHTS, ...customWeights }`.

---

## HIGH Findings

### H1: Duplicate amount consistency check — double-counting

**File:** `packages/ingestion/engine/trust-guard.ts`  
**What:** `validateAmountConsistency()` checks `subtotal + tax = total` for ALL document types. `validateInvoiceExtraction()` checks `invoice_total_formula` for invoices. For invoices with all three fields, BOTH checks run → duplicate error flags → double penalty on confidence.  
**Fix:** Skip the `amount_subtotal_tax_total` check when the invoice-specific check already covers it.

### H2: `DEFAULT_TOLERANCE = 0.0` is too strict for floating-point math

**File:** `packages/ingestion/engine/trust-guard.ts`  
**Line:** ~28  
**What:** `0.1 + 0.2 = 0.30000000000000004` in JavaScript. Even with `Math.round(x * 100) / 100`, edge cases exist. Real invoices legitimately have $0.01 rounding differences.  
**Impact:** Legitimate documents flagged as errors.  
**Fix:** Use tolerance of 0.01 for amount checks (matching bank statement tolerance).

### H3: Inconsistent tolerance across check types

**File:** `packages/ingestion/engine/trust-guard.ts`  
**What:** Bank statements use `<= 0.01`, payroll uses `<= 0.01`, but invoices and cross-field use `<= 0.0` (exact).  
**Fix:** Use 0.01 tolerance for all amount checks.

### H4: `duplicateSignal` is binary — doesn't scale with count

**File:** `packages/ingestion/core/confidence.ts`  
**Line:** ~75  
**What:** `existingEntries === 0 ? 1.0 : 0.3` — 1 duplicate = 0.3, 100 duplicates = 0.3. No distinction.  
**Fix:** Scale inversely: `Math.max(0.1, 1.0 - existingEntries * 0.2)`.

### H5: `amountConsistencySignal` fails for credit notes (negative amounts)

**File:** `packages/ingestion/core/confidence.ts`  
**Line:** ~230  
**What:** `ratio = totalAmount / maxLineAmount` — if `totalAmount` is negative, ratio is negative, always fails `> 0.95`.  
**Fix:** Use `Math.abs(totalAmount)` in the ratio calculation.

### H6: No TrustGuard checks for `purchase_order`, `contract`, `tax_document`

**File:** `packages/ingestion/engine/trust-guard.ts`  
**What:** These document types fall through to the default case with zero checks.  
**Fix:** Add at minimum the cross-field amount consistency check for these types.

---

## MEDIUM Findings

### M1: OCR cross-check is limited (only total + invoice number)

**What:** Doesn't verify vendor name, dates, or line item descriptions against OCR text.  
**Fix:** Add vendor name check when vendor is extracted with high confidence.

### M2: No currency mismatch check in TrustGuard

**What:** `validation-layer.ts` checks for multi-currency line items but TrustGuard doesn't.  
**Fix:** Add currency consistency check to TrustGuard.

### M3: Bank statement doesn't validate per-transaction running balances

**What:** Only checks aggregate balance equation, not `prev_balance + amount = new_balance` per transaction.  
**Fix:** Add per-transaction balance verification.

### M4: `validateDateSanity` creates `new Date()` inside function

**What:** Tests near midnight/year boundaries could get unexpected results.  
**Fix:** Accept optional `now` parameter for testability.

### M5: `coaMappingSignal` over-penalizes for unmapped accounts

**What:** One unmapped account = 0.2 penalty. If avg confidence is 0.85, result drops to 0.65.  
**Fix:** Use diminishing penalty: `Math.min(0.3, unmappedCount * 0.1)`.

---

## LOW Findings

### L1: No confidence tests exist

**What:** `confidence.ts` has zero test coverage. All 11 signal functions and the composite function are untested.  
**Fix:** Add comprehensive tests.

### L2: `trustGuardSignal` default value is 0.5 when not run

**What:** If TrustGuard hasn't run yet, the signal defaults to 0.5 (neutral). This could allow auto-posting of documents that never had math verification.  
**Fix:** Consider defaulting to 0.3 (cautious) instead of 0.5.

---

## Verification Checklist

- [ ] C1: Verify customWeights doesn't mutate defaults
- [ ] H1: Verify invoice checks don't double-count
- [ ] H2: Verify 0.01 tolerance works for edge cases
- [ ] H4: Verify duplicate signal scales with count
- [ ] H5: Verify credit notes don't fail amount consistency
- [ ] H6: Verify PO/contract/tax document types get checks
- [ ] L1: All confidence functions have tests
