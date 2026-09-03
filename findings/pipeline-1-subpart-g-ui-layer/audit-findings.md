# Sub-Part G Audit Findings — UI Layer

**Employee #7** — Scope: ingestion-review-panel, batch-upload, batch-ingestion router, document-upload-button, use-document-upload hook, approveReview/rejectReview/getPendingReviews

## 3 Critical, 4 High, 4 Medium, 2 Low — 13 findings

### 🔴 CRITICAL (3)

| #      | Finding                                                                                                                                                                                                                                                                                                                                | Impact                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **C1** | **Batch ingestion is a fake simulation** — `simulateStageProcessing` sleeps 200-500ms per stage and **randomly throws 5% of the time**. Docs get marked `done` via `updateTerminalStatus` with **no real OCR, extraction, TrustGuard, journal generation, or posting**. Users are told "processing with AI" while nothing is processed | Fabricated completions |
| **C2** | **`startBatch` DB insert is broken** — inserts `fileName` (schema column is `name`), omits NOT NULL `name`, `type`, `r2Key`, `r2Bucket`. **Every** batch document insert throws at runtime → every doc fails with "Failed to create document record". TS errors TS2769 confirm. Batch feature is 100% broken end-to-end                | Broken feature         |
| **C3** | **Binary files ingested as placeholder text** — batch-upload sends `content = "[Binary file: name]"` for PDFs/images → `processDocumentForRAG` chunks garbage → poison in the knowledge base                                                                                                                                           | Corrupt embeddings     |

### 🟠 HIGH (4)

| #   | Finding                                                                                                                                                                                                                                                                                                              | Impact                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| H1  | **Review panel cannot edit the proposed entry** — `setEditedEntry` is declared but **never called**; the approveReview router fully supports `editedEntry` (edit before posting) yet there is zero UI to edit lines. Users can only approve-as-is or reject — the "AI-native review & correct" flow is a dead button | Broken correction flow |
| H2  | **`reviewItems` never rendered** — the panel fetches `reviewItems` (Sub-Part E now populates them with `check.expected` values) but displays **none of them**. The user never sees "AI was unsure about total — expected 100, extracted 90"                                                                          | Blind review           |
| H3  | **approveReview has no state guard** — can approve a `done` or `failed` doc; uses `entry as any` / `workflow as any` casts. A doc with **no proposed entry** shows the Approve button ENABLED (0===0 totals pass the disabled check) → server throws "No proposed journal entry found"                               | Misleading actions     |
| H4  | **Batch progress is in-memory** — `new Map()` module store; lost on restart and **not shared across serverless instances** (Vercel) → progress polling returns null after any instance spin-down                                                                                                                     | Broken progress        |

### 🟡 MEDIUM (4)

| #   | Finding                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `getPendingReviews` loads ALL `agent_processing` docs (twice — list + total) and filters requiresReview in JS instead of SQL                                           |
| M2  | `rejectReview` sets status `"failed"` — conflates "user rejected" with "pipeline failed"; rejected docs appear in failure counts and the review panel can re-open them |
| M3  | `batchDocumentSchema.content` has no max length — a huge text file ships the full string over tRPC (memory/DoS)                                                        |
| M4  | `listBatches` queries `auditLog.newValues` as `batchId` alias then re-parses — works but fragile; batches are only discoverable via audit log rows                     |

### 🟢 LOW (2)

| #   | Finding                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------- |
| L1  | `handleFileSelect` reads text files fully into memory client-side with no size cap before `readFileContent` |
| L2  | `batch-progress` polling has no error boundary for a `null` progress (silent hang)                          |

### ✅ Already Solid

- Client-side file size validation on upload (fixed in Sub-Part A) ✓
- Approve disabled when entry is unbalanced (UI + server both check) ✓
- `postJournalEntry` reference idempotency prevents double-approve double-post (Sub-Part D) ✓
- Review panel: Entity-scoped getReviewDetails, Escape-to-close, TrustGuard banner, accessibility labels ✓
- sendResolutionNotification carries documentId + journalEntryId for deep-linking ✓

---

## Proposed Fix Plan

### Phase 1 — Critical + High (7 fixes)

1. **C2:** Fix `startBatch` insert — `name` (from fileName), set `type`, use the real presigned-R2 upload path or a documented `type: "upload"` default; add required fields
2. **C1:** Replace the simulation with the real `processIngestion`/document pipeline per doc (or wire the existing document-processing task); remove fake delays and random failures
3. **C3:** Reject binary files with a clear message OR upload them to R2 and run real OCR — never ingest placeholder text
4. **H1:** Add inline line editing to the review panel (edit account/amounts) feeding `setEditedEntry`
5. **H2:** Render `reviewItems` with expected-vs-extracted display and per-item confidence
6. **H3:** Guard approveReview — require status `agent_processing` + proposed entry exists; disable Approve when no entry; drop `as any`
7. **H4:** Persist batch progress (DB table or Redis-compatible store) — or remove the fake progress feature

### Phase 2 — Medium (4 fixes)

8. M1: SQL-filtered pending reviews + COUNT(\*)
9. M2: distinct `rejected` handling — keep status but flag `resolvedAction: "rejected"`; hide from failed counts
10. M3: cap content length in zod (`max(5_000_000)`)
11. M4: batch listing via dedicated column/index on the document metadata instead of audit-log parsing

### Phase 3 — Tests

12. Review panel logic tests (approve-disabled states, reviewItems rendering)
13. Batch ingestion tests (insert shape, reject-binary, no-fake-failures)
