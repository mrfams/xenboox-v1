# Sub-Part A: Intake Layer — Deep Audit Findings

**Employee:** Engineering Lead + Security Engineer + UX Designer  
**Date:** 2026-09-03  
**Files Audited:** 9 files across intake, validation, file-validation, types, jobs, and UI

---

## Findings Summary

| Dimension   | Critical | High   | Medium | Low   |
| ----------- | -------- | ------ | ------ | ----- |
| Engineering | 1        | 4      | 3      | 2     |
| Security    | 1        | 1      | 0      | 0     |
| UX          | 0        | 2      | 2      | 1     |
| Design      | 0        | 1      | 1      | 0     |
| Edge Cases  | 1        | 2      | 1      | 0     |
| **Total**   | **3**    | **10** | **7**  | **3** |

---

## CRITICAL Findings

### C1: `detectDuplicate` 30-day filter is computed but never applied

**File:** `packages/ingestion/intake/intake-service.ts`  
**Line:** ~195  
**What:** `const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()` is computed but the query only filters by `entityId`. It loads ALL documents for the entity (up to 500), not just recent ones.  
**Impact:** As entity accumulates thousands of documents, this query gets slower and slower. At 500 docs with metadata JSON parsing, this is O(n) per upload.  
**Fix:** Add `gte(documents.createdAt, thirtyDaysAgo)` to the query WHERE clause.

### C2: ZIP magic bytes are ambiguous — .docx detected as .xlsx

**File:** `packages/ingestion/engine/file-validation.ts`  
**Lines:** ~45-65  
**What:** `sniffMimeType()` matches `PK\x03\x04` for xlsx, docx, and msword. It returns the FIRST match, which is always `xlsx`. A valid `.docx` file gets detected as `xlsx`, causing a MIME mismatch error.  
**Impact:** All `.docx` uploads fail with "File content does not match declared type".  
**Fix:** For ZIP-based Office formats, accept any of the three MIME types when `PK` magic bytes are detected, or remove the ambiguous entries and rely on the declared MIME for ZIP containers.

### C3: Hash fallback produces weak hashes — false duplicate detection

**File:** `packages/ingestion/intake/intake-service.ts`  
**Lines:** ~280-295  
**What:** If `node:crypto` import fails, falls back to `md5-${buffer.length}-${buffer[0]}`. Two different files of the same length starting with the same byte get identical "hashes".  
**Impact:** Two different PDFs of the same size would be flagged as duplicates.  
**Fix:** If crypto is unavailable, throw an error instead of using a weak fallback. Hash computation is critical for dedup — we can't fake it.

---

## HIGH Findings

### H1: `checkRateLimit` loads 101 full document rows just to count

**File:** `packages/ingestion/intake/intake-service.ts`  
**Lines:** ~225-240  
**What:** `limit: RATE_LIMIT_UPLOADS + 1` loads 101 full document rows (with metadata JSON) just to check if count > 100.  
**Impact:** Wasteful I/O. Should use `SELECT COUNT(*)` or `$count`.  
**Fix:** Replace with a COUNT query.

### H2: `findDuplicateInvoiceNumber` loads 200 full documents

**File:** `packages/ingestion/intake/validation-layer.ts`  
**Lines:** ~260-290  
**What:** Loads 200 full document rows with metadata JSON just to check invoice numbers.  
**Impact:** Slow for entities with many documents.  
**Fix:** Use a targeted SQL query or at minimum load only `id, name, createdAt, metadata` fields.

### H3: No role enforcement on approveReview/rejectReview

**File:** `apps/web/server/routers/ingestion.ts`  
**Lines:** ~408, ~605  
**What:** `approveReview` and `rejectReview` use `rlsMutateProcedure` which ensures entity scoping but doesn't check user role. A Viewer-role member could approve/reject financial entries.  
**Impact:** Unauthorized financial operations.  
**Fix:** Add role check — only Admin, Manager, or Accountant roles can approve/reject.

### H4: Reject form has hardcoded light theme colors

**File:** `apps/web/components/ingestion/ingestion-review-panel.tsx`  
**Lines:** ~215-230  
**What:** Reject form input uses `border-slate-200 bg-white text-slate-900` — hardcoded light theme.  
**Impact:** Visual break in dark mode.  
**Fix:** Use theme-aware classes (`border-border bg-background text-foreground`).

### H5: Ingestion review panel approve button has no balance validation

**File:** `apps/web/components/ingestion/ingestion-review-panel.tsx`  
**Lines:** ~240-250  
**What:** The "Approve & Post" button is enabled even when debits ≠ credits (the warning is shown but not enforced). User can approve an unbalanced entry.  
**Impact:** Unbalanced journal entries could be posted.  
**Fix:** Disable the approve button when `totalDebit !== totalCredit` and show a clear message.

### H6: `document-upload-button.tsx` — no file size validation before upload

**File:** `apps/web/components/module/document-upload-button.tsx`  
**What:** Accepts any file and sends it to the server. Client-side size check is missing — user uploads a 500MB file, waits for upload to fail server-side.  
**Impact:** Wasted bandwidth, poor UX.  
**Fix:** Add client-side file size check against `MAX_FILE_SIZES` before upload.

### H7: No ARIA labels on review panel interactive elements

**File:** `apps/web/components/ingestion/ingestion-review-panel.tsx`  
**What:** Collapsible sections, approve/reject buttons lack ARIA labels.  
**Impact:** Accessibility failure — screen readers can't navigate the panel.  
**Fix:** Add `aria-label` to buttons, `aria-expanded` to collapsible sections.

---

## MEDIUM Findings

### M1: `ROUND_AMOUNT` and `NO_CENTS` fraud flags overlap

**File:** `packages/ingestion/intake/validation-layer.ts`  
**Lines:** ~155-175  
**What:** For amount = 5000, both `ROUND_AMOUNT` (5000 % 100 === 0) and `NO_CENTS` (5000 % 1 === 0) fire. Double-counts in fraud score.  
**Fix:** Remove `NO_CENTS` — `ROUND_AMOUNT` already covers this.

### M2: CSV magic bytes are too broad (UTF-8 BOM)

**File:** `packages/ingestion/intake/intake-service.ts`  
**Lines:** ~120  
**What:** `ef bb bf` is just UTF-8 BOM — any UTF-8 file with BOM matches as CSV.  
**Fix:** Remove this entry from `MAGIC_BYTES` in intake-service (the `file-validation.ts` version has proper CSV detection with delimiter check).

### M3: `document-processing.ts` uses `as any` for Drizzle updates

**File:** `packages/jobs/document-processing.ts`  
**Lines:** ~100, ~140, ~175  
**What:** `.set({ ... } as any)` bypasses type safety.  
**Fix:** Use proper Drizzle typed updates or cast to the correct schema type.

### M4: No timeout on R2 download in document-processing

**File:** `packages/jobs/document-processing.ts`  
**Line:** ~80  
**What:** `r2.send(new GetObjectCommand(...))` has no explicit timeout.  
**Fix:** Add AbortController with 30s timeout.

### M5: Review panel extract data renders objects as JSON strings

**File:** `apps/web/components/ingestion/ingestion-review-panel.tsx`  
**Lines:** ~145  
**What:** `typeof value === "object" ? JSON.stringify(value) : String(value)` — raw JSON for line items, nested objects.  
**Fix:** Render structured data (line items as mini-tables, dates formatted, amounts with currency).

### M6: No "re-process" action on rejected documents

**File:** `apps/web/components/ingestion/ingestion-review-panel.tsx`  
**What:** After rejection, the document is marked "failed" with no way to re-process from the UI.  
**Fix:** Add a "Re-process" button on rejected documents.

### M7: `detectDuplicate` returns first match, not highest confidence

**File:** `packages/ingestion/intake/intake-service.ts`  
**Lines:** ~195-220  
**What:** Returns on first match (could be name+size at 0.9 confidence) even if a later doc would match at SHA-256 (1.0 confidence).  
**Fix:** Scan all candidates and return the highest-confidence match.

---

## LOW Findings

### L1: `document-upload-button.tsx` has no upload progress indicator

**What:** Shows "Uploading..." spinner but no progress percentage for large files.  
**Fix:** Use XMLHttpRequest with `onprogress` for upload progress.

### L2: TrustGuard test file has no tests for date sanity or OCR cross-check

**File:** `packages/ingestion/__tests__/trust-guard.test.ts`  
**What:** Tests cover math checks but not the new date sanity and OCR cross-check functions.  
**Fix:** Add test cases for `validateDateSanity` and `validateOcrVsExtraction`.

### L3: `intake-service.ts` text detection is heuristic

**What:** `detectMimeType` checks if all bytes are printable ASCII — a binary file with a text header could be misdetected.  
**Fix:** Lower priority — the downstream `assertMimeMatches` in document-processing provides defense in depth.

---

## Verification Checklist

- [ ] C1: Verify 30-day filter is applied in duplicate detection query
- [ ] C2: Test .docx upload — should not fail with MIME mismatch
- [ ] C3: Test hash computation — verify crypto is always available
- [ ] H1: Verify COUNT query is used for rate limiting
- [ ] H3: Test that Viewer role cannot approve/reject
- [ ] H4: Verify reject form looks correct in dark mode
- [ ] H5: Verify approve button is disabled when debits ≠ credits
- [ ] H6: Test client-side file size validation
- [ ] M1: Verify only ROUND_AMOUNT fires for round amounts
- [ ] M2: Test CSV upload with UTF-8 BOM
- [ ] M5: Verify structured data rendering in review panel
