# AP Agent — Accounts Payable

## Agent Identity

| Field | Value |
|-------|-------|
| Name | AP Agent |
| Tier | 3 — Worker |
| Reports to | Controller Agent |
| Model | Claude Sonnet 4.6 (invoice matching — complex reasoning) |
| LangGraph file | `packages/agents/tier3/ap-agent.ts` |
| Observability | LangFuse (traces per invoice processing) |

---

## Domain Ownership

The AP Agent owns **accounts payable** — the complete lifecycle from invoice receipt to payment. It handles invoice ingestion from all formats, supplier management, PO matching, payment scheduling, and aging reports.

**Exclusively controls:**
- Invoice ingestion from all sources: email, PDF, image, WhatsApp photo, Excel, CSV
- Supplier master data management (create, update, deactivates)
- Invoice matching to purchase orders (2-way and 3-way match)
- Payment scheduling and due date tracking
- Cheque preparation tracking
- Mobile money payment recording
- AP aging report generation
- Duplicate invoice detection
- Credit note and debit note processing

**Does NOT control:**
- Journal entry posting (Ledger Agent via Controller)
- Cash disbursement (Cash Agent / Treasury Agent)
- Bank payments (Reconciliation Agent)
- Budget checking (Budget Agent — Phase 2)

---

## Responsibilities

1. Ingest invoices from all formats and sources
2. Extract structured data: supplier, amount, date, line items, tax, due date
3. Match invoices to purchase orders (2-way: PO + invoice, 3-way: PO + receipt + invoice)
4. Validate invoice data — completeness, reasonable amounts, valid supplier
5. Create and maintain supplier master records
6. Schedule payments based on due dates and cash availability
7. Track payment status — pending, scheduled, processing, completed
8. Generate AP aging report (current, 30, 60, 90, 120+ days)
9. Flag overdue invoices to Controller Agent
10. Process credit notes and apply to supplier accounts
11. Detect and flag duplicate invoices
12. Record mobile money payments to suppliers
13. Track withholding tax on supplier payments
14. Escalate disputed invoices to Controller Agent
15. Produce supplier statements on demand

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Controller Agent | Work assignments, close instructions, escalation responses |
| Document Agent | Parsed invoice data (from OCR/ingestion) |
| Email | Invoices forwarded to dedicated Xenboox address |
| Mobile app | Photographed invoices, WhatsApp forwarded invoices |
| Web upload | PDF, Excel, CSV invoice uploads |
| System | Purchase order data, supplier master data |

### Outputs

| Target | Data |
|--------|------|
| Controller Agent | AP journal entries (invoice accruals, payments, credits, WHT) |
| Treasury Agent | Payment schedule, due date alerts, cash requirement forecast |
| CFO Agent | AP aging summary (via Controller), escalation reports |
| Reporting Agent | AP data for reports (via Controller) |

---

## Tools

```typescript
const apTools = {
  // Database
  queryInvoices: db.query.apInvoices,
  querySuppliers: db.query.suppliers,
  queryPurchaseOrders: db.query.purchaseOrders,
  queryPayments: db.query.payments,
  insertInvoice: db.insert(apInvoices),
  insertSupplier: db.insert(suppliers),
  updateInvoice: db.update(apInvoices),

  // Document processing
  ocrExtractor: ocrExtractorService,           // OCR for images/scans
  pdfParser: invoicePdfParser,                  // PDF invoice parsing
  excelParser: invoiceExcelParser,              // Excel invoice parsing
  emailParser: emailAttachmentParser,           // Email attachment extraction

  // Matching
  matchToPO: purchaseOrderMatcherFn,            // PO matching engine
  detectDuplicate: invoiceDuplicateDetector,    // Duplicate detection

  // Inter-agent
  sendToController: controllerAgent.invoke,
  sendToTreasury: treasuryAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const apAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Current invoice being processed
  currentInvoice: z.object({
    id: z.string().uuid(),
    source: z.enum(["email", "pdf_upload", "image", "whatsapp", "excel", "manual"]),
    rawData: z.string(),                        // Raw OCR/parse result
    extractedData: z.object({
      supplierName: z.string().nullable(),
      supplierId: z.string().uuid().nullable(),
      invoiceNumber: z.string().nullable(),
      invoiceDate: z.date().nullable(),
      dueDate: z.date().nullable(),
      totalAmount: z.number().nullable(),
      currency: z.string().nullable(),
      taxAmount: z.number().nullable(),
      lineItems: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        amount: z.number(),
        accountCode: z.string().nullable(),
      })).nullable(),
      poNumber: z.string().nullable(),
      notes: z.string().nullable(),
    }),
    extractionConfidence: z.number().min(0).max(1),
    validationStatus: z.enum(["pending", "valid", "needs_review", "rejected"]),
    validationErrors: z.array(z.string()),
  }).nullable(),

  // Invoice queue
  invoiceQueue: z.array(z.object({
    id: z.string().uuid(),
    supplierName: z.string(),
    invoiceNumber: z.string(),
    amount: z.number(),
    currency: z.string(),
    dueDate: z.date(),
    status: z.enum(["received", "extracting", "matching", "approved", "scheduled", "paid", "disputed"]),
    receivedAt: z.date(),
    poMatched: z.boolean().nullable(),
    poNumber: z.string().nullable(),
  })),

  // Suppliers
  suppliers: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    taxId: z.string().nullable(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    paymentTerms: z.number(),                   // days
    currency: z.string(),
    totalOwed: z.number(),
    invoiceCount: z.number(),
    lastInvoiceDate: z.date().nullable(),
    lastPaymentDate: z.date().nullable(),
    status: z.enum(["active", "inactive", "blocked"]),
  })),

  // Payment schedule
  paymentSchedule: z.array(z.object({
    invoiceId: z.string().uuid(),
    supplierName: z.string(),
    amount: z.number(),
    currency: z.string(),
    dueDate: z.date(),
    status: z.enum(["scheduled", "approved", "processing", "completed", "overdue"]),
    paymentMethod: z.enum(["bank_transfer", "mobile_money", "cheque", "cash"]).nullable(),
    scheduledPayDate: z.date(),
  })),

  // AP aging
  agingReport: z.object({
    generatedAt: z.date(),
    totalOutstanding: z.number(),
    currency: z.string(),
    buckets: z.object({
      current: z.number(),
      days30: z.number(),
      days60: z.number(),
      days90: z.number(),
      days120Plus: z.number(),
    }),
    supplierCount: z.number(),
    invoiceCount: z.number(),
    overdueCount: z.number(),
    overdueTotal: z.number(),
  }).nullable(),

  // Disputed invoices
  disputedInvoices: z.array(z.object({
    invoiceId: z.string().uuid(),
    supplierName: z.string(),
    amount: z.number(),
    reason: z.string(),
    raisedAt: z.date(),
    status: z.enum(["open", "investigating", "resolved", "written_off"]),
  })),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the AP Agent for [entity_name]. You manage all accounts payable.

ROLE:
- You ingest invoices from all formats and extract structured data.
- You match invoices to purchase orders.
- You schedule payments and track aging.
- You maintain the supplier master.

CONSTRAINTS:
- Never approve an invoice without valid supplier, amount, and date.
- Always check for duplicate invoices before processing.
- Entity-scope all operations to [entity_id].
- Flag invoices that seem unusual (very large amounts, new suppliers
  with large invoices, round numbers).

INVOICE INGESTION FLOW:
1. Receive invoice (any format)
2. Extract data using OCR/parser
3. Validate extracted data completeness
4. Check for duplicates (same supplier + invoice number + amount)
5. Match to purchase order if PO number provided
6. Create/update supplier record if new
7. Queue for payment scheduling
8. Create journal entry (via Controller): DR expense/asset, CR accounts payable

PO MATCHING:
- 2-way match: PO quantity/price vs invoice quantity/price
- Tolerance: ±2% on amount, ±1 unit on quantity
- If outside tolerance → flag for manual review
- If no PO found → process as non-PO invoice

AGING REPORT:
Categorize all outstanding invoices:
- Current: not yet due
- 30 days: 1-30 days overdue
- 60 days: 31-60 days overdue
- 90 days: 61-90 days overdue
- 120+ days: 91+ days overdue
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| Invoice complete, matched to PO, no issues | ≥ 0.9 | Process and schedule payment |
| Invoice complete, no PO, clear data | 0.7–0.9 | Process as non-PO invoice |
| OCR extraction partial, some fields missing | 0.5–0.7 | Flag for manual data completion |
| Duplicate invoice detected | 0.0 | Reject — flag as duplicate |
| Amount significantly differs from PO (> 2%) | 0.5–0.6 | Flag for manual review |
| New supplier with large invoice (> threshold) | 0.6–0.7 | Flag for approval |
| Cannot extract meaningful data from document | < 0.4 | Escalate to Controller with original document |
| Suspicious invoice (round number, no reference) | < 0.6 | Flag for manual review |

---

## Error Handling

| Error | Response |
|-------|----------|
| OCR extraction fails | Request manual entry or re-upload |
| Duplicate invoice detected | Reject with "Duplicate of invoice [X]" |
| PO match outside tolerance | Flag for manual review, do not auto-match |
| Supplier not found and cannot create | Flag for manual supplier setup |
| Invoice currency doesn't match entity currency | Handle with exchange rate, flag conversion |
| Payment scheduled but cash insufficient | Alert Treasury Agent, defer payment |
| Credit note received | Apply to original invoice, reduce payable |
| Invoice amount exceeds approval threshold | Escalate to Controller Agent |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `journal_entries` | AP entries: accruals, payments, credits, WHT |
| Controller Agent | `escalation` | Disputed invoices, large amounts, new suppliers |
| Treasury Agent | `payment_schedule` | Upcoming payment obligations |
| Treasury Agent | `cash_requirement` | Forecast of required cash for next 30 days |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `work_assignment` | Process specific invoice(s) |
| Document Agent | `parsed_invoice` | Extracted invoice data |
| System | `email_invoice` | Invoice received via email forwarding |
| System | `upload_invoice` | Invoice uploaded via web/mobile |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data extraction accuracy | ≥ 90% | Correct fields from OCR |
| Duplicate detection | 100% | No duplicate invoices processed |
| PO matching accuracy | ≥ 95% | Correct matches for matchable invoices |
| Processing turnaround | < 30s per invoice | Ingestion to queue |
| Aging report accuracy | 100% | Correct categorization |
| Payment scheduling accuracy | ≥ 98% | Correct amounts and dates |
| Supplier data completeness | ≥ 90% | Key fields populated |
| False positive duplicate rate | < 3% | Legitimate invoices incorrectly flagged |

**Golden dataset scenarios:**
1. Standard PDF invoice, matched to PO → processed correctly
2. WhatsApp photo invoice, partial OCR → flagged for manual completion
3. Duplicate invoice attempt → rejected
4. New supplier with large invoice → flagged for approval
5. Credit note received → applied to original invoice
6. Multi-currency invoice → exchange rate applied correctly
7. Overdue invoice → flagged in aging report
