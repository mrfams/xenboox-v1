# Agent Spec: Document Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | Document Agent                                                                                                                                                                           |
| Tier          | Platform-wide (reports directly to CFO Agent)                                                                                                                                            |
| Reports to    | CFO Agent                                                                                                                                                                                |
| Oversees      | (none)                                                                                                                                                                                   |
| PRD reference | §6.5 "Document Agent"; §7.3 desktop OCR strategy                                                                                                                                         |
| Model         | claude-haiku-4-5 for classification/routing; Claude Vision API as the fallback OCR path specifically (PRD §7.3 — Tesseract primary, Vision fallback for complex/low-quality/handwritten) |

## 2. Mandate

The Document Agent is the universal ingestion point for every document entering Xenboox, from any source (email, upload, scan, mobile photo, desktop folder watch) and any format. It performs OCR extraction, classifies the document type, stores it securely, and — critically — links every document to its corresponding transaction so the audit trail is complete. Every other agent that consumes extracted data (AP, AR, Cash, Reconciliation) depends on this agent's extraction quality; errors here propagate everywhere downstream.

## 3. Scope Boundary

**This agent MUST:**

- Ingest documents from all sources: email, web upload, scan, mobile photo, desktop folder watch (via Tauri app coordination, PRD §7.3)
- Run OCR extraction using the correct strategy per PRD §7.3: Tesseract locally first, Claude Vision API fallback for complex/low-quality/handwritten documents
- Classify every document by type (invoice, receipt, contract, bank statement, payslip, grant letter, etc.)
- Store documents securely with encryption at rest
- Link every document to its corresponding transaction once that transaction is created downstream — this linkage is what makes the audit trail complete, not optional metadata
- Support retrieval on demand ("show me the invoice for this transaction")
- Manage retention policy by jurisdiction

**This agent MUST NEVER:**

- Pass extracted data downstream without an attached confidence score — every consuming agent (AP, AR, Cash, Reconciliation) depends on knowing extraction reliability to decide whether to auto-proceed or hold
- Silently "correct" an OCR result that looks wrong based on assumed context (e.g. auto-fixing what looks like a typo'd amount) — a low-confidence extraction is flagged for human review or Vision API fallback, never guessed into a "more sensible" number
- Discard the original document image/file after extraction — the source document must remain retrievable for audit purposes even after structured data is extracted, always
- Classify a document with high confidence when the classification is genuinely ambiguous (a document that could be either a receipt or an invoice, for instance) — ambiguous classification escalates rather than committing to a guess

## 4. Inputs

| Input                               | Source                                                           | Format                                                                                | Validation required before processing                                                  |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Raw document (any supported format) | Email forwarding, web upload, desktop folder watch, mobile photo | Raw file (PDF, image, Excel, Word, email export, etc. per PRD §7.3 supported formats) | entity_id determinable (from upload context, email routing address, or folder mapping) |

## 5. Outputs

| Output                    | Destination                                                     | Schema                   | Required fields                                                                                                                 |
| ------------------------- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Extracted structured data | Requesting/consuming agent (AP, AR, Cash, Reconciliation, etc.) | `ExtractedDocumentData`  | `document_id`, `document_type`, `extraction_confidence`, `extraction_method` (tesseract/vision_api/manual), `structured_fields` |
| Document classification   | Same as above, plus stored metadata                             | `DocumentClassification` | `document_type`, `classification_confidence`                                                                                    |
| Stored document reference | All agents (retrieval capability)                               | `DocumentReference`      | `document_id`, `storage_location`, `linked_transaction_id: nullable until linked`                                               |

## 6. Tools This Agent Can Call

| Tool                           | Purpose                                                        | Read/Write                                |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------- |
| `store_document`               | Persist encrypted document + metadata                          | Write                                     |
| `run_ocr_extraction`           | Tesseract primary, Vision API fallback per PRD §7.3            | Read (extraction), Write (storing result) |
| `link_document_to_transaction` | Associate stored document with a downstream transaction record | Write                                     |
| `retrieve_document`            | Fetch a document by transaction or document_id                 | Read                                      |

Contracts: none written this pass — flagged as next step. `run_ocr_extraction` is highest priority given it's the point where the Tesseract/Vision fallback decision (a real cost/quality tradeoff per PRD §7.3) actually gets implemented.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                     | Enforcement point                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Every extraction output carries a non-null confidence score — no extraction result is emitted without one                | Schema validation on `run_ocr_extraction` output                                                          |
| Original document file is always retained in storage regardless of extraction outcome                                    | `store_document` — write path doesn't have a "discard original" option at all, not just a discouraged one |
| entity_id determination happens before extraction proceeds — extraction never runs against an indeterminate entity scope | Application-layer gate before `run_ocr_extraction` is called                                              |

## 8. Confidence Scoring

- **Extraction confidence** — per-field, ideally (an invoice with a clear total but a smudged date should reflect that granularity, not a single blended score that hides which specific field is unreliable)
- **Classification confidence** — how confident the document-type classification is, independent of extraction quality (a perfectly legible document can still be ambiguous as to type)

## 9. Escalation Triggers

| Trigger condition                                                                       | Escalates to                                                                                                             | Escalation type                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Tesseract extraction confidence below threshold                                         | Automatic fallback to Claude Vision API (not a human escalation — this is the designed cost-saving cascade per PRD §7.3) | N/A — internal retry path, not an escalation in the `CONFIDENCE_AND_ESCALATION.md` sense |
| Vision API extraction still below threshold after fallback                              | Human (via whichever agent/workflow initiated the document ingestion)                                                    | Flag — data held, not passed downstream as if reliable                                   |
| Document classification ambiguous between two plausible types                           | Human, or the most likely-relevant downstream agent for a first read                                                     | Flag                                                                                     |
| Document cannot be linked to any transaction within a reasonable window after ingestion | CFO Agent (notify — incomplete audit trail is a compliance-relevant gap, not just a UX nuisance)                         | Notify                                                                                   |

## 10. Failure Modes & Recovery

- **Known failure mode:** handwritten or heavily annotated documents (common in African field operations — handwritten receipts, annotated imprest forms per PRD §22 founder insight) producing confidently-wrong extractions rather than appropriately low-confidence ones, since OCR models can be fluent-but-wrong on messy handwriting. Mitigation: this is exactly the case class the golden dataset needs to stress-test hardest (see §11) — a wrong-but-confident extraction is worse than a correctly-flagged low-confidence one, and eval calibration checks (per `EVAL_HARNESS_SPEC.md` §3.3) should specifically include handwritten-document cases.
- **Recovery:** documents can be re-submitted for re-extraction; original file is always retained (§7) so nothing is unrecoverable.

## 11. Golden Dataset Coverage

Link: `datasets/document-agent-golden.yaml` (not yet built). Target: standard 28-case floor, but weight `adversarial` heavily toward degraded-quality real-world document types (handwritten, photographed at an angle, poor lighting — common mobile-photo submission conditions) rather than clean synthetic PDFs, since that's the actual production distribution this agent will face.

## 12. Cross-Agent Dependencies

- **Upstream:** none (entry point for document data)
- **Downstream:** AP Agent, AR Agent (indirectly), Cash Agent (receipts), Reconciliation Agent (PDF statements), every agent that consumes documents
- **Flow tests:** appears as step 1 in the "Supplier invoice → payment → close" flow and the "Bank statement upload → reconciliation" flow in `CROSS_AGENT_FLOW_TESTS.md` §3 — this agent's output schema stability matters even more than Ledger Agent's in terms of _breadth_ of downstream consumers, even though Ledger Agent is more critical in terms of _depth_ of consequence per error

## 13. Open Questions

- Exact confidence threshold that triggers Tesseract → Vision API fallback (§9) — cost/quality tradeoff, needs real-world tuning once there's production document volume, not a number to guess now.
- Per-field vs. single blended confidence scoring (§8) — per-field is clearly better for downstream agents but adds implementation complexity; needs a decision before schemas are finalized, not deferred indefinitely.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — entry point agent, no overlap concerns with other agents (all downstream agents consume its output, don't compete with its role)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — none yet, `run_ocr_extraction` flagged highest priority
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified
