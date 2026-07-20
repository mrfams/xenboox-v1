# XENBOOX — Data Ingestion & Integrations Spec

> Engineering handoff doc. Companion to XENBOOX_PRD.md, XENBOOX_UI_SPEC.md, XENBOOX_SYSTEM_ARCHITECTURE.md, XENBOOX_ACCOUNTING_RULES_ENGINE.md.
> This is everything that gets data INTO Xenboox — every source, every format, every failure path. The `documents` table (Architecture doc, Section 3.6) is the shared spine all of this writes to.
> Version: v1.0 | Last updated: July 2026

---

## 1. Purpose and Boundary

This spec owns **getting raw external data into structured, entity-scoped records** — nothing about what accounting logic then happens to that data (that's doc #4) and nothing about which agent decides what to do with it (that's doc #3). The output of everything in this doc is either a populated `documents` row with `extracted_fields`, or a directly-created transaction row (`bank_transactions`, `mobile_money_transactions`, etc.) ready for an agent to act on.

```
External source → Ingestion pipeline (this doc) → documents/transactions row (Architecture doc)
                                                              │
                                                              ▼
                                              Agent picks it up (doc #3) → Rules Engine validates (doc #4)
```

---

## 2. Ingestion Sources (per PRD Section 11)

| Source                              | Format               | Priority | Path                                 |
| ----------------------------------- | -------------------- | -------- | ------------------------------------ |
| Bank PDF statement upload           | PDF                  | MVP #1   | Manual upload → Document Inbox       |
| Mobile money statement (Wave first) | PDF/CSV              | MVP #2   | Manual upload or API where available |
| Email-forwarded invoices            | PDF/image attachment | MVP #3   | Inbound email webhook                |
| Excel/CSV upload                    | .xlsx/.csv           | MVP #4   | Manual upload with mapping wizard    |
| QuickBooks/Xero                     | API                  | MVP #5   | OAuth via Merge.dev                  |
| Plaid bank feed                     | API                  | MVP #6   | Where available in-market            |
| Shopify                             | API                  | Post-MVP | Payout/order/refund sync             |
| Amazon Seller Central               | API                  | Post-MVP | Payout/fee/settlement sync           |
| Desktop local file watch            | All formats          | Phase 3  | Tauri file system watcher            |
| Mobile camera capture               | Image                | Phase 2  | Mobile app upload                    |

---

## 3. The Universal Pipeline

Every source, regardless of format, funnels into the same five-stage pipeline. This consistency is what makes the Document Inbox status pipeline (UI spec Section 8) a truthful, universal UI rather than a per-source special case.

```
1. DETECTED     → file/data lands in R2 or is received via webhook/API, documents row created, status='detected'
2. PROCESSING   → format detection routes to correct parser (Section 4), status='processing'
3. EXTRACTED    → structured fields populated in extracted_fields jsonb, OCR/parse confidence scored, status='extracted'
4. SYNCED       → extracted data validated against expected schema for its detected_type, status='synced'
5. AGENT_PROCESSING → handed to relevant agent (Document Agent classifies + routes to AP/AR/Reconciliation Agent per doc #3), status='agent_processing' → 'done'
```

- Any stage can transition to `failed` — see Section 7 (Failure Handling), which is not an edge case bolted on but a first-class path every stage must support
- Each stage transition writes to `agent_actions`/`audit_trail` (Architecture doc Section 3.8) so the pipeline is itself auditable

---

## 4. Format Detection & Parsing

### 4.1 Detection Logic

- File extension + MIME type as first pass
- Content-based classification as second pass (a `.pdf` could be a bank statement, an invoice, or a receipt — extension alone doesn't tell you `detected_type`)
- Classification model: lightweight classifier (Haiku-tier, per PRD cost strategy) trained/prompted against the fixed `detected_type` enum: `invoice | receipt | bank_statement | mobile_money_statement | payslip | contract | unknown`

### 4.2 Parser Routing

```
PDF (text layer present)   → direct text extraction, then field parsing
PDF (scanned/no text layer) → OCR pipeline (Section 5) → field parsing
Image (.jpg/.png/.webp)     → OCR pipeline → field parsing
Excel/CSV                   → structured parser + mapping wizard (Section 6)
Email (.eml/.msg, desktop)  → header/body parse + attachment extraction, attachments re-enter pipeline at stage 1
API payloads (Plaid/Merge/Shopify/Amazon) → direct structured mapping, skips OCR entirely, still passes through stages 3-5 for consistency
```

### 4.3 Field Parsing Per Type

- Each `detected_type` has a defined target schema for `extracted_fields` (e.g. invoice → vendor, amount, currency, date, line_items, tax_amount)
- Parsing prompt/model is constrained to only populate fields in that schema — no freeform extraction that agents downstream can't rely on
- Every extracted field carries its own confidence sub-score, not just one document-level score — lets the Document Viewer (UI spec) highlight exactly which fields need human eyes, not the whole document

---

## 5. OCR Strategy (per PRD Section 7.3, locked)

- **Tesseract** — primary, runs locally/self-hosted, no per-page API cost, handles clean/typed documents
- **Claude Vision API** — fallback, triggered when Tesseract confidence falls below threshold, or document is flagged low-quality/handwritten
- Routing logic: try Tesseract first always (cost discipline) → if confidence < threshold (configurable, start at 70%) → escalate to Claude Vision → if Claude Vision also low-confidence → status stays `extracted` but flagged amber, routed to human review rather than guessed
- OCR confidence score is stored per-field, feeds directly into the Confidence Badge system (UI spec Section 0)

---

## 6. Excel/CSV Ingestion — Mapping Wizard

Excel/CSV is uniquely risky because format varies wildly (no standard "bank statement CSV" shape exists across African banks) — this needs its own handling, not generic parsing:

1. Upload → engine reads header row + first N sample rows
2. UI presents column-mapping step: "Which column is Date? Amount? Description?" — pre-guessed via heuristics (column name matching, data type sniffing), user confirms/corrects
3. Once mapped, mapping is **saved per entity + source** so re-uploads from the same bank/source skip the wizard next time
4. Validation pass: date formats parse, amounts are numeric, no fully-empty required columns — reject with specific row-level errors, never silently drop rows

---

## 7. Failure Handling (per PRD Section 13 failure states — applies system-wide, not just onboarding)

**Principle: never leave a document or user on a dead end.**

| Failure                                                               | Response                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unrecognized file format                                              | Status → `failed`, UI offers "Enter manually" path                                              |
| OCR confidence too low even after Vision fallback                     | Status → `extracted` (not failed), amber flag, routed to human review queue rather than blocked |
| Mobile money statement format not recognized                          | Prompt for alternate export format, or fall through to CSV mapping wizard                       |
| QuickBooks/Xero OAuth fails                                           | Offer CSV export path as fallback                                                               |
| Bank PDF has no extractable text and OCR fails entirely               | Offer manual transaction entry, keep original file attached for reference                       |
| Duplicate document detected (same hash/same extracted invoice number) | Flag as potential duplicate, do NOT auto-discard — human confirms before it's ignored           |

Every failure path in this table must have a corresponding UI affordance per the Document Inbox spec — this doc defines the failure, UI spec defines the button.

---

## 8. Integration-Specific Notes

### 8.1 Merge.dev (QuickBooks + Xero)

- Single API surface per PRD's stack decision — one integration codebase serves both providers
- Initial sync pulls historical data per the onboarding "how far back" flow (PRD Section 13, Step 4); incremental sync thereafter via Merge's webhook/polling
- Mapped fields land as `documents` rows with `detected_type` inferred from Merge's object type (invoice, bill, etc.) — same pipeline as everything else from stage 3 onward

### 8.2 Plaid

- Used where available in-market; bank_transactions created directly (skips OCR/document stages, enters pipeline at stage 4 equivalent)
- Plaid coverage in Gambia/target African markets is expected to be sparse at launch — PDF upload remains the primary bank path; Plaid is additive, not depended upon

### 8.3 Mobile Money (Wave priority, per PRD)

- API access varies by provider and market — not yet confirmed (flagged as open item in PRD Section 21)
- Build the statement-import (PDF/CSV) path as the reliable baseline first; layer API integration in per-provider as access is secured, without changing the downstream data shape

### 8.4 Email Ingestion

- Inbound webhook (Resend or equivalent, per Architecture doc Section 8) receives forwarded emails to `{entity}@xenboox.com` addresses
- Email body itself is scanned for relevant text (some invoices are in the email body, not an attachment) but attachments are the primary path
- Sender reputation / spoofing check before processing — this is a security consideration flagged here, detailed in doc #6

### 8.5 Shopify / Amazon SP-API (Post-MVP)

- Payout reconciliation is the priority use case, not full order-catalog sync — scope tightly to what Treasury/Reconciliation Agents actually need (payout amount, fees, settlement date, linked orders/refunds)

---

## 9. Desktop-Specific Ingestion (Phase 3, per PRD Section 7.3)

- Rust file watcher monitors designated local folders continuously
- New/changed file detected locally → same format detection/parser routing runs **locally first** where possible (Tesseract is local-capable) to minimize cloud dependency and keep costs/latency low
- Extracted data queues via the cloud sync engine into the same `documents` pipeline stage 3 onward — desktop is a local front door, not a parallel pipeline (per PRD's "agents always run in the cloud" architecture decision)
- Local SQLite cache (AES-256 encrypted) holds pre-sync state so the desktop app remains useful offline; full encryption detail in doc #6

---

## 10. What This Doc Deliberately Does NOT Cover

- What happens to extracted data once an agent picks it up (matching, posting, categorization) → **doc #3**
- Whether extracted amounts are accounting-valid (balance checks, currency conversion) → **doc #4**
- `documents` table schema itself → **doc #2 (Architecture)**
- Who can view/upload documents for which entity, encryption of stored files → **doc #6**

---

_Companion to XENBOOX_PRD.md Section 7.3 (Desktop), Section 11 (Data Integrations), Section 13 (Onboarding failure states)._
_Next doc: Security, Access Control & Audit Trail Spec._
