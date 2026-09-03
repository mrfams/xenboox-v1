# Sub-Part H Audit Findings — Background Jobs

**Employee #8** — Scope: document-processing (stages 1-6), ingestion job, bank-import, email-processing, auto-link, DLQ, trigger wiring

## 2 Critical, 4 High, 5 Medium, 2 Low — 13 findings

### 🔴 CRITICAL (2)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                | Impact                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **C1** | **Email-ingested documents never run the accounting pipeline** — `email-processing` creates docs at status `synced` (OCR/classify/extract inline) but **never triggers `run-document-ingestion`**. Nothing else picks up `synced` docs (only document-processing's `stageAgentProcessing` triggers ingestion). Every invoice/receipt received by email sits at `synced` forever — **no journal entry is ever created** | Silent accounting gap |
| **C2** | **Email bank statements trigger bank-import with an empty storage path** — `email-processing` calls `import-bank-statement` with `storagePath: ""`, and bank-import does `GetObjectCommand({ Key: "" })` → guaranteed R2 failure → DLQ spam. Email attachments are never written to R2, so the path is structurally broken                                                                                             | Broken bank import    |

### 🟠 HIGH (4)

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                   | Impact                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| H1  | **Email docs skip TrustGuard entirely** — created at `synced` with no `metadata.trustGuard`; ingestion's stage 10b falls back to re-running TrustGuard from `runTrustGuard(state)` (ok), BUT the doc's `ocrText` is empty in the constructed state (email path stores OCR in `metadata.ocr` text? — no, it stores `ocrText` on the row, which IS read). Verify trustGuard gets a real pass — otherwise LLM figures sail to GL unvalidated | TrustGuard gap           |
| H2  | **Ingestion job catches and swallows pipeline errors** — `run-document-ingestion` catch returns `{ success: false }` instead of rethrowing → Trigger.dev sees "success" → **no retries, no DLQ**. The `retry: { maxAttempts: 2 }` and `dlqOnFailure` config is dead code for the most important job                                                                                                                                       | Silent pipeline failures |
| H3  | **Ingestion job catch overwrites document metadata** — `.set({ status: "failed", metadata: { error, failedAt, pipelineStage } })` replaces the entire metadata object, **dropping extraction/classification/trustGuard context** needed for review                                                                                                                                                                                        | Data loss                |
| H4  | **Stage updates use `as any` casts** — `document-processing.ts` stages 3-5 (`status`, `metadata`, `type`) + `ingestion.ts` catch, 4+ casts — no compiler protection on status/metadata writes                                                                                                                                                                                                                                             | Type safety              |

### 🟡 MEDIUM (5)

| #   | Finding                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `stageDetected` runs at the start of EVERY task run including retries — re-sets `detected` from a later stage (harmless now that isValidTransition allows re-entry, but writes a redundant audit row per retry)                          |
| M2  | No `sizeBytes` update after R2 download in document-processing (stage 2 knows the real size but never writes it)                                                                                                                         |
| M3  | `email-processing` has no DLQ/onFailure hook and no retry config visible — a poison email silently dies                                                                                                                                  |
| M4  | `bank-import` + `document-processing` duplicate R2 client construction (identical S3Client setup in 3+ files) — env validation (missing R2_ACCOUNT_ID → `undefined` endpoint) crashes at import time                                     |
| M5  | `listBatches` (web) + batch flow depends on `tenantJobOptions` dedup — fine, but `process-document` idempotency key is per-doc so re-uploads of the SAME document create a NEW idempotency key (correct) — no dedup on identical content |

### 🟢 LOW (2)

| #   | Finding                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Zero test coverage for the jobs package (no `__tests__` dir at all) — retry/DLQ/parse logic all untested                                                                      |
| L2  | `auto-link` runs for invoices/receipts before the ingestion pipeline finishes (triggered at stageAgentProcessing) — races the posting engine's own vendor/customer resolution |

### ✅ Already Solid

- DLQ (`dlqOnFailure`) never throws, resolves org from entity ✓
- `process-document` has retry (3×), DLQ hook, per-tenant queue, idempotency keys ✓
- Magic-byte MIME sniffing at stage 2 ✓
- Per-tenant concurrency keys on all downstream triggers ✓
- Ingestion READY_STATUSES guards prevent premature runs ✓

---

## Proposed Fix Plan

### Phase 1 — Critical + High (6 fixes)

1. **C1:** After email-processing creates each `synced` doc, trigger `run-document-ingestion` (with idempotency key) — the missing journal-creation link
2. **C2:** Store email attachments in R2 (real storage path) before triggering `import-bank-statement`, or pass the email-stored path — never `""`
3. **H1:** Run TrustGuard in email-processing (or ensure stage 10b re-run reads real data); add `metadata.trustGuard` to email docs
4. **H2:** Ingestion job catch must rethrow after marking failed → retries + DLQ actually engage
5. **H3:** Merge metadata in ingestion job catch (`...existingMetadata, error, failedAt, pipelineStage`)
6. **H4:** Drop `as any` casts in document-processing + ingestion job

### Phase 2 — Medium (5 fixes)

7. M1: Skip `stageDetected` re-entry when doc already past `detected`
8. M2: Write real `sizeBytes` after R2 download
9. M3: Add DLQ + retry to email-processing
10. M4: Extract shared R2 client helper + env validation
11. M5: No-op (dedup by content is a product decision — document it)

### Phase 3 — Tests

12. Jobs test suite: email-processing triggers ingestion, bank-import rejects empty path, ingestion job rethrows, metadata merge
13. Test the ingestion job's READY_STATUSES + not-found paths
