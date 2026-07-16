# AR Agent — Accounts Receivable

## Agent Identity

| Field | Value |
|-------|-------|
| Name | AR Agent |
| Tier | 3 — Worker |
| Reports to | Controller Agent |
| Model | Claude Haiku 4.5 (routine) + Sonnet for complex matching |
| LangGraph file | `packages/agents/tier3/ar-agent.ts` |
| Observability | LangFuse (traces per invoice + payment matching) |

---

## Domain Ownership

The AR Agent owns **accounts receivable** — the complete lifecycle from invoice creation to payment collection. It handles invoice generation, customer management, payment tracking, aging, and donor payment tracking for NGOs.

**Exclusively controls:**
- Invoice creation and professional delivery (email, PDF, portal)
- Customer master data management
- Payment tracking and matching to invoices
- Receipt generation
- AR aging report generation
- Overdue invoice alerts and follow-up scheduling
- Donor payment tracking for NGOs
- Credit note processing
- Write-off recommendations

**Does NOT control:**
- Journal entry posting (Ledger Agent via Controller)
- Cash receipt recording (Cash Agent for physical, Reconciliation Agent for bank)
- Revenue recognition timing (Controller Agent determines)
- Budget tracking (Budget Agent — Phase 2)

---

## Responsibilities

1. Create professional invoices from sales/orders/service records
2. Deliver invoices via email, customer portal, or manual distribution
3. Track invoice status: draft, sent, viewed, paid, overdue, written_off
4. Match incoming payments to outstanding invoices
5. Generate and deliver receipts for payments received
6. Maintain customer master data — contact info, payment terms, credit limits
7. Generate AR aging report (current, 30, 60, 90, 120+ days)
8. Alert on overdue invoices per configured schedule
9. Track donor-specific payments and invoices for NGO customers
10. Process credit notes and refunds
11. Recommend write-offs for uncollectable amounts (with approval)
12. Support recurring invoice generation
13. Handle multi-currency invoicing with proper exchange rate treatment
14. Produce customer statements on demand

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Controller Agent | Work assignments, close instructions, revenue recognition rules |
| System (e-commerce) | Shopify/Amazon order data |
| User (web/mobile) | Manual invoice creation, customer data |
| Reconciliation Agent | Matched payment data (bank, mobile money) |
| Cash Agent | Cash payment data |

### Outputs

| Target | Data |
|--------|------|
| Controller Agent | AR journal entries (revenue recognition, receipts, write-offs, credits) |
| Treasury Agent | Expected cash inflows (via Controller) |
| CFO Agent | AR aging summary (via Controller), collection alerts |
| Reporting Agent | Revenue data for reports (via Controller) |
| Customers | Invoices, receipts, statements |

---

## Tools

```typescript
const arTools = {
  // Database
  queryInvoices: db.query.arInvoices,
  queryCustomers: db.query.customers,
  queryPayments: db.query.payments,
  queryReceipts: db.query.receipts,
  insertInvoice: db.insert(arInvoices),
  insertCustomer: db.insert(customers),
  updateInvoice: db.update(arInvoices),

  // Invoice generation
  invoiceTemplateEngine: invoiceTemplateEngine,  // Professional invoice generation
  emailSender: resendClient,                      // Invoice delivery

  // Matching
  matchPaymentToInvoice: paymentMatcherFn,        // Payment-invoice matching

  // Inter-agent
  sendToController: controllerAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const arAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Current invoice being created/processed
  currentInvoice: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid().nullable(),
    customerName: z.string(),
    invoiceNumber: z.string(),
    invoiceDate: z.date(),
    dueDate: z.date(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number(),
      accountCode: z.string().nullable(),
    })),
    subtotal: z.number(),
    taxAmount: z.number(),
    totalAmount: z.number(),
    currency: z.string(),
    notes: z.string().nullable(),
    status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "written_off"]),
    template: z.string().nullable(),
  }).nullable(),

  // Customer list
  customers: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    paymentTerms: z.number(),
    creditLimit: z.number().nullable(),
    currency: z.string(),
    totalOwed: z.number(),
    totalLifetimeRevenue: z.number(),
    invoiceCount: z.number(),
    lastInvoiceDate: z.date().nullable(),
    lastPaymentDate: z.date().nullable(),
    isDonor: z.boolean(),                       // For NGO donor tracking
    donorGrantReference: z.string().nullable(),
    status: z.enum(["active", "inactive", "blocked"]),
  })),

  // Outstanding invoices
  outstandingInvoices: z.array(z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    customerName: z.string(),
    invoiceNumber: z.string(),
    invoiceDate: z.date(),
    dueDate: z.date(),
    amount: z.number(),
    currency: z.string(),
    daysOverdue: z.number(),
    status: z.enum(["sent", "viewed", "overdue", "partially_paid"]),
    amountPaid: z.number(),
    amountDue: z.number(),
    isDonorInvoice: z.boolean(),
    grantReference: z.string().nullable(),
    lastReminderSent: z.date().nullable(),
  })),

  // Payment schedule (expected inflows)
  expectedInflows: z.array(z.object({
    customerId: z.string().uuid(),
    customerName: z.string(),
    amount: z.number(),
    currency: z.string(),
    expectedDate: z.date(),
    invoiceIds: z.array(z.string().uuid()),
    confidence: z.number(),
  })),

  // AR aging
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
    customerCount: z.number(),
    invoiceCount: z.number(),
    overdueCount: z.number(),
    overdueTotal: z.number(),
    donorOutstanding: z.number().nullable(),    // NGO-specific
  }).nullable(),

  // Donor tracking (NGO-specific)
  donorTracking: z.object({
    totalDonorInvoices: z.number(),
    totalDonorOutstanding: z.number(),
    grants: z.array(z.object({
      grantReference: z.string(),
      donorName: z.string(),
      totalBudget: z.number(),
      invoicedToDate: z.number(),
      outstanding: z.number(),
      nextInvoiceDue: z.date().nullable(),
    })),
  }).nullable(),

  // Overdue alerts
  overdueAlerts: z.array(z.object({
    invoiceId: z.string().uuid(),
    customerName: z.string(),
    amount: z.number(),
    daysOverdue: z.number(),
    lastReminderSent: z.date().nullable(),
    escalationLevel: z.enum(["first_reminder", "second_reminder", "final_notice", "escalated"]),
  })),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the AR Agent for [entity_name]. You manage all accounts receivable.

ROLE:
- You create and deliver invoices to customers.
- You track payments and match them to invoices.
- You monitor aging and drive collection efforts.
- For NGOs: you track donor-specific invoicing and payments.

CONSTRAINTS:
- Never write off an invoice without Controller Agent approval.
- Never apply payment to wrong customer account.
- Always generate receipts for payments received.
- Entity-scope all operations to [entity_id].
- Donor invoices must be tagged with grant reference.

INVOICE CREATION FLOW:
1. Receive order/service record or manual input
2. Create invoice with line items, tax, total
3. Generate professional PDF
4. Deliver via email (primary) or portal
5. Track status: draft → sent → viewed → paid
6. Create journal entry: DR accounts receivable, CR revenue

PAYMENT MATCHING:
1. Receive payment notification (from Reconciliation/Cash Agent)
2. Match to outstanding invoice(s) by customer + amount
3. If partial payment: apply to oldest invoice first (FIFO)
4. If overpayment: apply to invoices, flag credit balance
5. Generate receipt
6. Create journal entry: DR cash/bank, CR accounts receivable

AGING REPORT:
Categorize all outstanding receivables:
- Current: not yet due
- 30 days: 1-30 days overdue
- 60 days: 31-60 days overdue
- 90 days: 61-90 days overdue
- 120+ days: 91+ days overdue

OVERDUE FOLLOW-UP:
- 7 days overdue: first reminder email
- 30 days overdue: second reminder, escalate to Controller
- 60 days overdue: final notice, escalate to Controller + CFO
- 90+ days overdue: recommend write-off review

DONOR TRACKING (NGO):
- Tag all donor invoices with grant reference
- Track budget vs invoiced by grant
- Produce donor-specific aging
- Support donor portal display
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| Payment matches invoice exactly | ≥ 0.95 | Apply payment, generate receipt |
| Payment matches with minor difference (< 1%) | 0.8–0.95 | Apply payment, flag difference |
| Payment could match multiple invoices | 0.6–0.8 | Apply FIFO, confirm if ambiguous |
| Invoice creation from clear data | ≥ 0.9 | Create and send |
| Write-off recommendation | 0.5–0.7 | Recommend, require Controller approval |
| Cannot match payment to any invoice | < 0.5 | Flag for manual matching |
| Customer data incomplete | < 0.7 | Request completion before processing |
| Donor invoice without grant reference | < 0.6 | Flag for correction |

---

## Error Handling

| Error | Response |
|-------|----------|
| Payment doesn't match any invoice | Hold payment, flag for manual matching |
| Customer not found | Create customer record or flag for setup |
| Invoice already fully paid | Reject duplicate payment application |
| Credit note exceeds original invoice | Reject, flag for review |
| Revenue recognition timing unclear | Flag to Controller for determination |
| Overdue invoice with no contact info | Flag to Controller — collection blocked |
| Exchange rate unavailable for foreign invoice | Use last known rate, flag in report |
| Recurring invoice template missing | Alert user, skip generation |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `journal_entries` | AR entries: revenue, receipts, write-offs, credits |
| Controller Agent | `escalation` | Write-off recommendations, collection issues |
| Treasury Agent | `expected_inflows` | Forecast of incoming payments |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `work_assignment` | Process specific invoice/payment |
| Reconciliation Agent | `payment_matched` | Payment matched to AR invoice |
| Cash Agent | `cash_received` | Cash payment for AR |
| System | `order_data` | E-commerce order for invoicing |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Invoice generation accuracy | 100% | Correct amounts, tax, customers |
| Payment matching accuracy | ≥ 95% | Correct invoice matched |
| Aging report accuracy | 100% | Correct bucket categorization |
| Receipt generation | 100% | Every payment gets receipt |
| Donor tracking accuracy | 100% | All donor invoices tagged correctly |
| Overdue alert timeliness | 100% | Alerts sent per schedule |
| Write-off control | 100% | No write-offs without approval |
| Customer data completeness | ≥ 90% | Key fields populated |

**Golden dataset scenarios:**
1. Standard invoice → created, sent, tracked correctly
2. Payment received, matches invoice → applied, receipt generated
3. Partial payment → applied FIFO, remainder tracked
4. Overdue invoice at 7 days → first reminder sent
5. Donor invoice → tagged with grant reference, tracked separately
6. Write-off recommendation → escalated to Controller for approval
7. Multi-currency invoice → exchange rate applied correctly
