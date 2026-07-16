# Document Agent — Document Ingestion & Management

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Document Agent |
| Tier | Platform-wide |
| Reports to | CFO Agent |
| Model | Claude Sonnet 4.6 (classification + extraction) + Haiku for simple OCR routing |
| LangGraph file | `packages/agents/platform/document-agent.ts` |
| Observability | LangFuse (traces per document processing pipeline) |

---

## Domain Ownership

The Document Agent owns the **complete document lifecycle** — ingestion from all sources, OCR extraction, classification, secure storage, and audit trail linking.

**Exclusively controls:**
- Document ingestion from all sources: email, upload, scan, mobile photo, desktop folder watch
- OCR extraction from all formats (text PDF, scanned PDF, images)
- Document classification: invoice, receipt, contract, bank statement, payslip, grant letter
- Secure storage with encryption at rest (Cloudflare R2)
- Document-to-transaction linking for audit trail
- Document retrieval on demand
- Retention policy management by jurisdiction
- Desktop app coordination for local file system watching
- Document processing pipeline orchestration

**Does NOT control:**
- Accounting decisions based on documents (other agents)
- Financial data posting (Ledger Agent)
- Payment processing (Treasury Agent)
- Report generation (Reporting Agent)

---

## Responsibilities

1. Ingest documents from all sources: email forwarding, web upload, mobile camera, desktop folder watch
2. Detect document format and route to correct parser
3. Extract text via OCR (Tesseract locally, Claude Vision API as fallback)
4. Classify documents into categories (invoice, receipt, bank statement, contract, payslip, etc.)
5. Extract structured data from classified documents (amounts, dates, parties, line items)
6. Store documents securely in Cloudflare R2 with AES-256 encryption
7. Link every document to its corresponding transaction for audit trail
8. Support document retrieval: "show me the invoice for this payment"
9. Manage retention policies per jurisdiction requirements
10. Coordinate with Tauri desktop app for local file system watching
11. Process documents in the background without blocking user interaction
12. Handle batch document ingestion (folder upload, multiple emails)
13. Deduplicate documents (same document uploaded twice via SHA-256 hash)
14. Maintain processing status pipeline: Detected -> Processing -> Extracted -> Synced -> Agent Processing -> Done

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| User (web) | File uploads (PDF, Excel, CSV, Word, image) |
| User (mobile) | Camera captures, photo library selects |
| User (desktop) | Folder watch detections, drag-and-drop |
| Email | Forwarded invoices, statements, documents |
| CFO Agent | Processing priorities, retention commands |
| Other agents | Document retrieval requests |

### Outputs

| Target | Data |
|--------|------|
| AP Agent | Parsed invoice data |
| Reconciliation Agent | Parsed bank statement data |
| Mobile Money Agent | Parsed mobile money statements |
| Expense Agent | Parsed receipt data |
| All agents | Document links and retrieval API |
| Human | Processing status updates, document retrieval |

---

## Tools

```typescript
const documentTools = {
  // Storage
  r2Client: cloudflareR2Client,
  uploadDocument: uploadToR2,
  getDocumentUrl: getPresignedR2Url,

  // OCR & Parsing
  tesseract: tesseractOcr,
  claudeVision: claudeVisionApi,
  pdfParser: pdfTextExtractor,
  imageOcr: imageOcrPipeline,
  excelParser: excelExtractor,
  wordParser: wordExtractor,
  csvParser: csvExtractor,
  emailParser: emailExtractor,

  // Classification
  documentClassifier: documentClassifierModel,
  dataExtractor: structuredDataExtractor,

  // Database
  insertDocument: db.insert(documents),
  updateDocument: db.update(documents),
  queryDocuments: db.query.documents,
  insertDocumentLink: db.insert(documentLinks),

  // Desktop coordination
  desktopSync: desktopSyncService,

  // Inter-agent
  sendToCFO: cfoAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

### Document Processing Pipeline

```typescript
type DocumentPipelineStage =
  | "detected"
  | "parsing"
  | "ocr"
  | "classifying"
  | "extracting"
  | "storing"
  | "linking"
  | "syncing"
  | "complete"
  | "failed";

type ProcessedDocument = {
  id: string;
  originalFilename: string;
  mimeType: string;
  source: "email" | "upload" | "camera" | "desktop_watch" | "api";
  pipelineStage: DocumentPipelineStage;
  classification: {
    type: "invoice" | "receipt" | "bank_statement" | "contract" | "payslip"
      | "grant_letter" | "tax_document" | "correspondence" | "other";
    confidence: number;
  };
  extractedData: Record<string, unknown> | null;
  storageUrl: string;
  sha256Hash: string;
  sizeBytes: number;
  entityId: string;
  linkedTransactions: string[];
  createdAt: Date;
  processedAt: Date | null;
  error: string | null;
};
```

---

## State Schema

```typescript
const documentAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  processingQueue: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    source: z.enum(["email", "upload", "camera", "desktop_watch", "api"]),
    mimeType: z.string(),
    sizeBytes: z.number(),
    stage: z.enum(["detected", "parsing", "ocr", "classifying", "extracting", "storing", "linking", "syncing", "complete", "failed"]),
    detectedAt: z.date(),
    startedProcessingAt: z.date().nullable(),
    completedAt: z.date().nullable(),
    error: z.string().nullable(),
    retryCount: z.number().default(0),
  })),

  currentDocument: z.object({
    id: z.string().uuid(),
    filename: z.string(),
    source: z.string(),
    rawContent: z.string().nullable(),
    ocrUsed: z.boolean(),
    ocrConfidence: z.number().nullable(),
    classification: z.object({
      type: z.string(),
      confidence: z.number(),
      possibleTypes: z.array(z.object({
        type: z.string(),
        confidence: z.number(),
      })),
    }).nullable(),
    extractedFields: z.record(z.unknown()).nullable(),
  }).nullable(),

  documents: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    classification: z.string(),
    source: z.string(),
    sizeBytes: z.number(),
    storageUrl: z.string(),
    sha256Hash: z.string(),
    linkedTransactions: z.array(z.string()),
    createdAt: z.date(),
    processedAt: z.date().nullable(),
    retentionExpiry: z.date().nullable(),
  })),

  desktopSync: z.object({
    connected: z.boolean(),
    lastSyncAt: z.date().nullable(),
    watchedFolders: z.array(z.object({
      path: z.string(),
      lastScanAt: z.date().nullable(),
      pendingFiles: z.number(),
    })),
    pendingSyncItems: z.number(),
  }).nullable(),

  stats: z.object({
    totalDocuments: z.number(),
    processedToday: z.number(),
    failedToday: z.number(),
    averageProcessingTime: z.number(),
    documentsByType: z.record(z.number()),
  }).nullable(),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Document Agent for [entity_name]. You manage all document
ingestion, processing, and storage.

ROLE:
- You ingest documents from all sources and extract structured data.
- You classify documents and link them to transactions.
- You store documents securely and manage retention.
- You coordinate with the desktop app for local file watching.

CONSTRAINTS:
- Never store documents unencrypted. All storage via R2 with AES-256.
- Never skip OCR for image-based documents.
- Always generate a SHA-256 hash for deduplication.
- Entity-scope all documents to [entity_id].
- Never retain documents past jurisdiction-required retention period.
- Always log processing actions in audit trail.

DOCUMENT CLASSIFICATION:
Classify every document into one of:
- Invoice (AP): supplier invoice for goods/services
- Receipt (AR): customer payment receipt
- Bank Statement: bank account statement
- Contract: legal agreement
- Payslip: employee payslip
- Grant Letter: donor grant agreement
- Tax Document: tax return, filing receipt
- Correspondence: business letter, email
- Other: unclassifiable

DATA EXTRACTION BY TYPE:

Invoice:
- Supplier name, invoice number, date, due date
- Line items (description, quantity, unit price, amount)
- Tax amount, total amount
- PO reference

Bank Statement:
- Account number, statement period
- Opening balance, closing balance
- Transaction lines (date, description, amount, balance)

Receipt:
- Merchant name, date, items, total, payment method

OCR STRATEGY:
- Text-based PDF: extract text layer directly (fast, free)
- Scanned PDF: Tesseract OCR (primary, local, free)
- Images: Tesseract OCR (primary), Claude Vision API (fallback for low quality)
- Handwritten documents: Claude Vision API (primary)

DEDUPLICATION:
- Compute SHA-256 hash of file content
- Check against existing documents
- If duplicate found: skip storage, link to existing document record
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| Text PDF, clean extraction | >= 0.95 | Process and classify |
| Scanned PDF, OCR confidence > 80% | 0.8 - 0.95 | Process, flag if OCR uncertain |
| Image, OCR confidence > 70% | 0.7 - 0.9 | Process, flag for review if needed |
| Image, OCR confidence 40-70% | 0.4 - 0.7 | Process with caveats, flag for manual review |
| Image, OCR confidence < 40% | < 0.4 | Escalate to human, cannot reliably extract |
| Classification confidence < 60% | < 0.6 | Flag for manual classification |
| Duplicate document detected | N/A | Skip processing, link to existing |
| Unsupported format | < 0.3 | Reject, notify user of unsupported format |

---

## Error Handling

| Error | Response |
|-------|----------|
| OCR fails completely | Request re-upload or manual entry |
| Document format not recognized | Notify user, request different format |
| R2 storage fails | Retry once, then queue for later |
| Classification uncertain | Flag for manual classification |
| Extraction produces no useful data | Notify user, suggest manual entry |
| Duplicate detected | Skip storage, link existing, notify |
| Desktop sync disconnected | Queue locally, sync when reconnected |
| Batch upload has mix of valid/invalid | Process valid files, report invalid ones |
| Retention period unclear | Use longest applicable jurisdiction period |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| AP Agent | `parsed_invoice` | Extracted invoice data |
| Reconciliation Agent | `parsed_statement` | Extracted bank statement data |
| Mobile Money Agent | `parsed_statement` | Extracted mobile money statement |
| Expense Agent | `parsed_receipt` | Extracted receipt data |
| CFO Agent | `processing_complete` | Batch processing summary |
| CFO Agent | `processing_failed` | Processing failure with reason |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| CFO Agent | `priority_processing` | Specific documents to prioritize |
| Any Agent | `document_retrieval` | Request for stored document |
| Desktop App | `file_detected` | New file in watched folder |
| System | `email_document` | Document received via email forwarding |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| OCR extraction accuracy | >= 90% | Correct text from clean documents |
| Classification accuracy | >= 85% | Correct document type assigned |
| Deduplication accuracy | 100% | No duplicate documents stored |
| Processing throughput | < 30s per document | Average processing time |
| Pipeline completion rate | >= 95% | Documents reaching "complete" stage |
| Entity scoping | 100% | No cross-entity document leakage |
| Audit trail completeness | 100% | Every document linked to transactions |
| Storage encryption | 100% | All documents encrypted at rest |

**Golden dataset scenarios:**
1. Clean PDF invoice -> extracted, classified, linked to AP
2. WhatsApp photo receipt -> OCR extracted, classified, linked to expense
3. Bank statement PDF -> parsed, transactions extracted, handed to Reconciliation Agent
4. Duplicate upload of same invoice -> deduplicated, linked to existing record
5. Unsupported file format -> rejected with clear user message
6. Batch upload of 20 documents -> all processed, status reported
7. Desktop folder watch detects new PDF -> processed automatically
