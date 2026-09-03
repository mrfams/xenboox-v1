# Pipeline 1: Document Ingestion — Engineering Audit Findings

## Employee #3 (Engineering Lead) — Deep Audit

### 🔴 Critical Bugs (will cause data corruption or crashes)

| #   | Bug                                          | Location                                               | Impact                                                                                                                             |
| --- | -------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`runValidation()` is NEVER called**        | `packages/ingestion/index.ts`                          | Fraud detection, Benford's Law, required field validation, amount threshold checks — ALL dead code. Never executed.                |
| 2   | **TrustGuard runs TWICE**                    | `document-processing.ts` Stage 5 + `index.ts` Stage 10 | Wasteful. Also, Trigger.dev builds partial IngestionState (no OCR text), so first run skips OCR cross-check. Inconsistent results. |
| 3   | **No idempotency on `runIngestionPipeline`** | `index.ts`                                             | If retry happens after partial failure, journal entry gets posted AGAIN. No "already posted" check.                                |
| 4   | **Race condition on `postJournalEntry`**     | `journal-generator.ts`                                 | Two simultaneous pipelines for same entity → duplicate journal entries. `checkDuplicate` + insert is not atomic.                   |
| 5   | **`generateReference` not unique**           | `journal-generator.ts`                                 | Uses `Date.now().toString(36)` — two docs processed in same millisecond get same reference.                                        |

### ⚠️ Medium Issues

| #   | Issue                                                       | Location                       | Impact                                                                                     |
| --- | ----------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| 6   | **`checkDocumentDuplicate` full table scan**                | `index.ts`                     | Loads ALL documents for entity. O(N) for thousands of docs.                                |
| 7   | **`propagatePosting` staleness is just logging**            | `propagation.ts`               | "Mark stale" inserts agentActivity rows but nothing actually invalidates caches.           |
| 8   | **`console.warn/info/error` instead of structured logging** | `notifications.ts`, `index.ts` | Violates production logging standards.                                                     |
| 9   | **`stageAgentProcessing` + ingestion pipeline race**        | `document-processing.ts`       | `auto-link-document` and `run-document-ingestion` triggered simultaneously — may conflict. |
| 10  | **No timeout on individual pipeline stages**                | `index.ts`                     | COA mapping or entity resolution could hang forever.                                       |

### ✅ What's Solid

- TrustGuard deterministic cross-validation is comprehensive (math, dates, OCR, duplicates)
- Confidence scoring with 11 weighted signals
- Posting decision matrix (auto_post/pending_review/escalated/rejected)
- Audit logging on every mutation
- Entity scoping on every query
- DLQ on Trigger.dev task failure
- Intake validation (magic bytes, rate limiting, duplicate detection)
- Notification system for all decision outcomes
