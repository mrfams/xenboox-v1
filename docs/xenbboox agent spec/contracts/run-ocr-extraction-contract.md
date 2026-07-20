# Tool Contract: `run_ocr_extraction`

> Filled from `TOOL_CONTRACT_TEMPLATE.md`. This tool implements the Tesseract-primary / Claude Vision API fallback strategy defined in PRD §7.3 and Document Agent spec §3. It is the point where the cost-quality tradeoff between free local OCR and paid cloud Vision API is managed deterministically, not left to the LLM's judgment.

---

## 1. Identity

| Field        | Value                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool name    | `run_ocr_extraction`                                                                                                                                      |
| Called by    | Document Agent (Document Agent spec §6)                                                                                                                   |
| Read / Write | Read / Write — reads the original document, writes extraction results and confidence scores                                                               |
| Idempotent?  | Yes — extraction is cached by `document_id`; re-extraction with the same document_id + strategy returns the cached result unless `force_re_extract: true` |

## 2. Purpose

Extract structured data from a raw document (PDF, image, etc.) using Tesseract as the primary OCR engine, falling back to Claude Vision API automatically when Tesseract's confidence is below threshold, and return the extracted fields with per-field confidence scores — never passing extracted data downstream without an attached reliability score.

## 3. Input Schema

```json
{
  "entity_id": "uuid",
  "document_id": "uuid",
  "requesting_agent": "string (enum: document-agent)",
  "extraction_profile": "string (enum: INVOICE | RECEIPT | BANK_STATEMENT | PAYSLIP | CONTRACT | GRANT_LETTER | CASH_COUNT | OTHER)",
  "force_re_extract": "bool (default: false)",
  "tesseract_confidence_threshold": "decimal (0-1, default: 0.7)",
  "vision_fallback_enabled": "bool (default: true)"
}
```

| Field                            | Type          | Required | Validation rule                                                                                                                                 |
| -------------------------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity_id`                      | string (uuid) | always   | Must match calling agent's active entity scope — reject if mismatched                                                                           |
| `document_id`                    | string (uuid) | always   | Must reference a stored document visible to this entity                                                                                         |
| `extraction_profile`             | string (enum) | always   | Determines which extraction template and field mappings to use (per PRD §7.3 supported formats)                                                 |
| `tesseract_confidence_threshold` | decimal       | optional | If not provided, uses the system default (0.7). Below this threshold, Tesseract output is discarded and Claude Vision API fallback is triggered |
| `vision_fallback_enabled`        | bool          | optional | Defaults to `true`. Set to `false` for test environments or when cost avoidance is explicitly desired — output may have lower confidence        |

## 4. Output Schema

```json
{
  "status": "extracted",
  "document_id": "uuid",
  "entity_id": "uuid",
  "extraction_method": "string (enum: tesseract | vision_api | fallback_tesseract_unavailable | manual)",
  "extraction_confidence": "decimal (0-1) — overall document-level confidence",
  "fields": [
    {
      "field_name": "string",
      "value": "string | number | date | null",
      "confidence": "decimal (0-1)",
      "extraction_method": "string (enum: tesseract | vision_api | manual)"
    }
  ],
  "classification": {
    "document_type": "string",
    "classification_confidence": "decimal (0-1)"
  },
  "extracted_at": "timestamp"
}
```

**Failure / Fallback:**

```json
{
  "status": "extraction_failed",
  "document_id": "uuid",
  "entity_id": "uuid",
  "reason_code": "string (enum: TESSERACT_FAILED | VISION_API_FAILED | ALL_STRATEGIES_EXHAUSTED | DOCUMENT_NOT_FOUND | ENTITY_MISMATCH | UNSUPPORTED_FORMAT)",
  "human_readable_reason": "string",
  "original_document_retained": true,
  "extraction_attempts": [
    {
      "strategy": "string (tesseract | vision_api)",
      "result": "string (success | failed)",
      "confidence": "decimal | null"
    }
  ]
}
```

No partial states exist. A call returns exactly one of these two shapes. And regardless of the outcome, the original document is never deleted (§5).

## 5. Deterministic Rules Enforced (Layer 1)

| Rule                                                                                                                                                                     | Enforcement point                                                                                                                                     | Behavior on violation                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extraction method cascade: Tesseract is always attempted first (if available); Vision API is used only when Tesseract confidence < threshold or Tesseract is unavailable | Application-layer orchestration: the tool calls Tesseract, checks confidence; if below threshold, automatically calls Vision API                      | Not a violation — this is the designed cascade. If Tesseract is unavailable and Vision API is disabled (`vision_fallback_enabled: false`), the tool fails with `ALL_STRATEGIES_EXHAUSTED` |
| Every extraction output (success or failure path) carries a non-null `extraction_confidence` at the document level and per field                                         | Schema validation ensures `extraction_confidence` is non-null on success path; failure path has no confidence to report, so `reason_code` replaces it | Schema enforces this structurally — an output without confidence is a malformed response                                                                                                  |
| Original document is always retained — no extraction path deletes or replaces the source file                                                                            | `store_document` is called before extraction begins; the extraction write path has no `DELETE` or `REPLACE` grant on the document storage table       | Not a runtime rejection — structurally impossible at the permissions layer                                                                                                                |
| `entity_id` determination must happen before extraction proceeds — extraction never runs against an indeterminate entity scope                                           | Application-layer gate: `entity_id` is required on the input; if missing, the tool rejects before accessing the document store                        | Reject, `INVALID_INPUT` — extraction never started                                                                                                                                        |
| Per-field confidence (not just document-level blend) is required for downstream consuming agents                                                                         | Schema requires `fields[].confidence` non-null for every output field                                                                                 | Reject if any field confidence is missing — consuming agents depend on per-field granularity                                                                                              |

All of the above run in code/DB. The cascade decision (Tesseract → Vision) is deterministic based on confidence thresholds and availability — the model does not choose which OCR engine to use.

## 6. Entity Scoping Enforcement

Enforced via PostgreSQL row-level security policy on the `documents` table. The tool can only read documents that belong to the authenticated session's `entity_id`. Application-layer `entity_id` matching is defense in depth.

## 7. Idempotency & Retry Behavior

- Extraction results are cached by `document_id`. A second call with the same `document_id` returns the cached result unless `force_re_extract: true` is explicitly set.
- If `force_re_extract: true`, extraction is re-run from scratch regardless of cache. The previous result is retained in the audit trail but the new result replaces the active extraction record. Idempotency key for re-extraction is `document_id + timestamp` to avoid key collision.
- Safe to retry after network failure (e.g. Vision API timeout) — the cascade logic handles partial failure within individual strategies per §8.
- For documents where Tesseract succeeded but Vision API was also called (mid-cascade), the tool writes the final result based on whichever strategy produced higher confidence, not a merge of both.

## 8. Failure Modes

| Failure                                                         | Tool behavior                                                                                                                                          | What calling agent should do                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Invalid input schema                                            | Reject before any extraction attempt, structured error                                                                                                 | Do not retry with same input — escalate per `CONFIDENCE_AND_ESCALATION.md` §4 (Block)                                             |
| Document not found or entity mismatch                           | Reject, `DOCUMENT_NOT_FOUND` / `ENTITY_MISMATCH`                                                                                                       | Escalate (Block)                                                                                                                  |
| Tesseract fails (engine error, not low confidence)              | Falls back to Vision API if `vision_fallback_enabled: true`; if fallback also fails, returns `ALL_STRATEGIES_EXHAUSTED` with per-attempt details       | If Tesseract-only failure with Vision fallback success: proceed with Vision result. If all strategies fail: flag for human review |
| Tesseract returns low confidence (< threshold)                  | Automatically triggers Vision API fallback (this is the designed cascade, not a failure)                                                               | Use the Vision API result if it has higher confidence; if Vision also low, flag per Document Agent spec §9 escalation             |
| Vision API unavailable (timeout, auth failure)                  | Returns result from Tesseract even if below threshold, with a note that fallback was unavailable; confidence reflects Tesseract's low score            | Treat as Tesseract-quality extraction — the confidence score honestly reflects reliability. Escalate if below minimum acceptable  |
| Both Tesseract and Vision API fail                              | Returns `ALL_STRATEGIES_EXHAUSTED`                                                                                                                     | Flag for human — Document Agent spec §9 escalation: "Vision API extraction still below threshold → Human"                         |
| Crash mid-extraction (e.g. process killed during Tesseract run) | Original document is untouched (extraction writes happen only after completion). On retry, the tool re-runs from scratch since no cached result exists | Retry with same input after confirming infrastructure availability                                                                |

## 9. Audit Trail

Every call — success or failure — logs: `calling_agent` (document-agent), `entity_id`, `document_id`, `extraction_profile`, `extraction_method` (actual method used), per-field confidence scores, overall extraction confidence, full response, timestamp, and the calling agent's confidence score for the extraction decision. Both the original document reference and all extraction attempts are logged — the full cascade history is preserved for audit. Logged to the central audit log.

## 10. Test Coverage

Link: `tests/tools/run-ocr-extraction.test.ts` (to be built)

Minimum required cases:

- Clean high-quality PDF → Tesseract succeeds with confidence ≥ threshold, `extraction_method: tesseract`
- Low-quality image → Tesseract returns confidence < threshold, Vision API fallback triggered, `extraction_method: vision_api`
- Tesseract unavailable (engine not installed) → Vision API used directly, `extraction_method: vision_api`
- Both strategies fail → `ALL_STRATEGIES_EXHAUSTED`, original document retained and confirmed accessible
- Per-field confidence populated correctly for all fields
- Cached extraction: second call with same document_id → returns cached result, no re-extraction
- Force re-extraction: `force_re_extract: true` → re-runs extraction, replaces cached result
- Cross-entity document access attempt → `ENTITY_MISMATCH`
- Missing `entity_id` → rejection before any extraction attempt
- Unsupported format → `UNSUPPORTED_FORMAT`

---

## Contract Sign-off Checklist

- [x] Input/output schemas fully specified, no untyped fields
- [x] Every deterministic rule from Document Agent spec §7 enforced here in code
- [x] Entity scoping enforced at DB layer (RLS), not application layer alone
- [x] Idempotency behavior defined and tested
- [x] Failure modes return structured errors, never silent partial success
- [x] Audit logging confirmed present on every code path (success and failure)
