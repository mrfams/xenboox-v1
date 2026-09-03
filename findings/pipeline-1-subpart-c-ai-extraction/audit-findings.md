# Sub-Part C: AI Extraction — Deep Audit Findings

**Employee:** Engineering Lead + Security Engineer  
**Date:** 2026-09-03  
**Files Audited:** `financial-assistant.ts`, `entity-resolution.ts`, `embeddings.ts`, `retrieval.ts`

---

## Findings Summary

| Dimension   | Critical | High  | Medium | Low   |
| ----------- | -------- | ----- | ------ | ----- |
| Engineering | 0        | 4     | 5      | 2     |
| Security    | 0        | 1     | 0      | 0     |
| Edge Cases  | 0        | 2     | 2      | 0     |
| **Total**   | **0**    | **7** | **7**  | **2** |

---

## HIGH Findings

### H1: `financial-assistant.ts` loads ALL journal entries just to count them

**File:** `packages/ingestion/engine/financial-assistant.ts`  
**What:** `answerWhatHappened`, `answerWhatRisksExist`, `answerWhatShouldWeDo` all load full journal entry rows just to get `.length`.  
**Fix:** Use `SELECT COUNT(*)` query.

### H2: `answerWhatNeedsAttention` loads all entries + all lines to find unbalanced ones

**File:** `packages/ingestion/engine/financial-assistant.ts`  
**Lines:** ~350-390  
**What:** Loads all posted entries, then all their lines, computes balances in JS.  
**Fix:** Use SQL query: `SELECT journalEntryId, SUM(debit), SUM(credit) FROM journalEntryLines GROUP BY journalEntryId HAVING ABS(SUM(debit) - SUM(credit)) > 0.01`.

### H3: `entity-resolution.ts` fuzzy match loads ALL records for entity

**File:** `packages/ingestion/engine/entity-resolution.ts`  
**What:** `resolveSupplier`, `resolveCustomer`, `resolveEmployee` each load all active records for fuzzy matching.  
**Fix:** Use SQL `LIKE` or `ILIKE` for initial filtering before loading for scoring.

### H4: `processDocumentForRAG` inserts chunks one at a time

**File:** `packages/ingestion/engine/embeddings.ts`  
**Lines:** ~280-310  
**What:** Individual `db.insert()` calls in a loop instead of batch insert.  
**Fix:** Use `db.insert(documentChunks).values([...])` with batch.

### H5: `retrieve` always inserts a citation even for empty results

**File:** `packages/ingestion/engine/retrieval.ts`  
**Line:** ~290  
**What:** Creates audit trail entries even when no chunks found.  
**Fix:** Only insert citation when chunks.length > 0.

### H6: `vectorSearch` fallback loads 1000 chunks for application-level cosine

**File:** `packages/ingestion/engine/retrieval.ts`  
**Lines:** ~80-100  
**What:** Full table scan with JS similarity computation.  
**Fix:** Add limit and use pgvector index when available.

### H7: `keywordSearch` loads 500 chunks for JS keyword scoring

**File:** `packages/ingestion/engine/retrieval.ts`  
**Lines:** ~120-140  
**What:** Loads full rows for keyword matching instead of using PostgreSQL full-text search.  
**Fix:** Use `ts_vector` / `ts_query` for production-grade keyword search.

---

## MEDIUM Findings

### M1: Hardcoded "USD" currency in `financial-assistant.ts`

**What:** `formatCurrency` always uses USD.  
**Fix:** Accept currency parameter or look up from entity settings.

### M2: `chunkText` doesn't split within very long paragraphs

**What:** Single paragraphs exceeding chunkSize become oversized chunks.  
**Fix:** Split by character count when paragraph exceeds chunkSize.

### M3: `scoreNameMatches` word overlap scoring is naive

**What:** "A Corp" matches "B Corp" at 0.5 score (1/2 words match "Corp").  
**Fix:** Weight exact word matches higher than substring matches.

### M4: Employee resolution only triggers for payroll/expense context

**What:** `isPayrollOrExpenseContext` misses employee vendors on regular invoices.  
**Fix:** Also check if vendor name matches an employee name.

### M5: `resolvePurchaseOrder` iterates all approved POs

**What:** Loads all POs then iterates for number match.  
**Fix:** Use SQL WHERE on `poNumber` field.

### M6: Mock embedding fallback produces semantically meaningless vectors

**What:** Hash-based mock embeddings don't capture semantic similarity.  
**Fix:** Log a warning and degrade gracefully (already done, but document the limitation).

### M7: `answerWhatHappened` confidence is hardcoded to 0.9

**What:** Doesn't scale with data quality (e.g., unbalanced trial balance should reduce confidence).  
**Fix:** Scale confidence based on data quality indicators.

---

## LOW Findings

### L1: No tests for `financial-assistant.ts`

**What:** Zero test coverage for the financial Q&A functions.

### L2: No tests for `entity-resolution.ts`

**What:** Zero test coverage for entity matching logic.

---

## Verification Checklist

- [ ] H1: Verify COUNT queries used for entry counting
- [ ] H2: Verify SQL-based unbalanced entry detection
- [ ] H3: Verify entity resolution uses SQL filtering
- [ ] H4: Verify batch insert for document chunks
- [ ] H5: Verify citation only inserted when results found
- [ ] M1: Verify currency is entity-aware
- [ ] M2: Verify long paragraphs are split
