# SME & Developing Country Features — Xenboox

> **The Global Accounting Platform:** Not just for Silicon Valley startups. For the tailor in Lagos, the shopkeeper in Mumbai, the farmer in Kenya, the freelancer in Manila.

---

## The Problem with Current Platforms

| Assumption              | Reality in Developing Countries         |
| ----------------------- | --------------------------------------- |
| Bank feeds available    | 60%+ of transactions are cash-based     |
| Digital payments common | Mobile money, cash, informal channels   |
| Stable internet         | Intermittent connectivity, mobile-first |
| Tech-savvy users        | Limited digital literacy                |
| English-speaking        | Multi-language, local contexts          |
| Formal economy          | Informal economy is 30-60% of GDP       |

---

## Part 1: SME-Specific Features

### What SMEs Actually Need

| Need                     | Why                        | Current Solutions    | Gap                      |
| ------------------------ | -------------------------- | -------------------- | ------------------------ |
| **Simple invoicing**     | Get paid faster            | Complex forms        | No AI invoice generation |
| **Cash flow visibility** | Avoid running out of money | Static reports       | No predictive cash flow  |
| **Tax compliance**       | Avoid penalties            | Manual tracking      | No auto-filing           |
| **Expense tracking**     | Deductible expenses        | Receipt hoarding     | No OCR extraction        |
| **Inventory management** | Stockouts = lost sales     | Spreadsheet tracking | No AI forecasting        |
| **Multi-currency**       | International customers    | Complex setup        | No auto-conversion       |
| **Mobile access**        | Work from anywhere         | Desktop-first        | No mobile-first design   |

### SME Feature Set

#### 1. Quick Invoice Generator

```
User: "Invoice Acme Corp for 10 hours consulting at $150/hour"
    ↓
AI Agent: [Creates professional invoice]
    ↓
AI Agent: [Adds payment terms, late fees, tax]
    ↓
AI Agent: [Sends via email with Stripe link]
    ↓
AI Agent: "Invoice #INV-047 sent to Acme Corp. $1,500 + tax.
           Payment due in 30 days. I'll remind you if it's overdue."
```

#### 2. Cash Flow Dashboard

```
User: "How's my cash flow looking?"
    ↓
AI Agent: "You have $12,450 in the bank. You'll receive $8,200 from
           outstanding invoices in the next 7 days. You have $6,500 in
           bills due. Net position: +$14,150. You're in good shape."
    ↓
AI Agent: "However, I notice you have a $3,200 bill due on the 28th
           that might be tight. Want me to set a reminder?"
```

#### 3. Receipt Scanner

```
User: [Snaps photo of receipt]
    ↓
AI Agent: [OCR extracts: Vendor, Amount, Date, Items]
    ↓
AI Agent: [Categorizes: "Office supplies - Staples"]
    ↓
AI Agent: [Checks policy: "Within $500 limit"]
    ↓
AI Agent: "Receipt processed. $247.83 at Staples.
           Categorized as Office Supplies. Added to expense report."
```

#### 4. Inventory Tracker

```
User: "How much stock do I have of Product X?"
    ↓
AI Agent: "You have 45 units of Product X. Based on last month's sales,
           you'll run out in 18 days. Your reorder point is 30 units.
           Want me to create a purchase order?"
    ↓
User: "Yes, order 100 units from Vendor Y"
    ↓
AI Agent: "PO #048 created for 100 units at $25 each = $2,500.
           Sent to Vendor Y. Expected delivery: March 15."
```

#### 5. Tax Helper

```
User: "What taxes do I owe this quarter?"
    ↓
AI Agent: "Based on your transactions:
           - Sales Tax (CA): $2,450 collected, $2,450 owed
           - Income Tax: Estimated $4,200 based on $16,800 profit
           - Payroll Tax: $1,800 for 2 employees

           Total estimated tax liability: $8,450

           Sales tax filing due: April 30
           Quarterly estimated tax due: April 15"
```

---

## Part 2: Developing Country Features

### The Cash Economy Reality

| Transaction Type       | % in Developing Countries | How We Handle It                |
| ---------------------- | ------------------------- | ------------------------------- |
| **Cash sales**         | 40-60%                    | Manual entry + photo receipt    |
| **Mobile money**       | 20-40%                    | M-Pesa, MTN, Airtel integration |
| **Informal transfers** | 10-20%                    | Manual categorization           |
| **Formal bank**        | 20-40%                    | Bank feeds (where available)    |
| **Barter/exchange**    | 5-10%                     | Manual journal entries          |

### Mobile Money Integration

#### M-Pesa (Kenya, Tanzania, DRC)

```typescript
// Mobile Money Agent
const mobileMoneyAgent = {
  // Connect M-Pesa account
  async connectMpesa(phoneNumber: string) {
    // Via Safaricom API or provider like Africa's Talking
    return await mpesaApi.register({
      phone: phoneNumber,
      businessShortCode: process.env.MPESA_SHORTCODE,
    });
  },

  // Sync transactions
  async syncTransactions(accountId: string) {
    const transactions = await mpesaApi.getTransactions({
      phone: phoneNumber,
      startDate: lastSyncDate,
    });

    // AI categorizes each transaction
    for (const tx of transactions) {
      await categorizeTransaction(tx);
    }
  },

  // Send money
  async sendMoney(to: string, amount: number, reason: string) {
    return await mpesaApi.send({
      to,
      amount,
      reason,
    });
  },
};
```

#### MTN Mobile Money (Uganda, Ghana, Cameroon)

```typescript
const mtnMomoAgent = {
  async connectMTN(accountNumber: string) {
    return await mtnApi.register({
      accountNumber,
      country: "UG", // or GH, CM
    });
  },

  async syncTransactions(accountId: string) {
    // Similar to M-Pesa
  },
};
```

#### Airtel Money (Multiple African Countries)

```typescript
const airtelMoneyAgent = {
  async connectAirtel(phoneNumber: string) {
    return await airtelApi.register({
      phone: phoneNumber,
    });
  },
};
```

### PDF Bank Statement Upload

#### The Pipeline

```
User: [Uploads PDF bank statement]
    ↓
Stage 1: PDF Extraction
├── Parse PDF structure
├── Extract text, tables, transactions
├── Handle different bank formats
└── Output: Raw transaction data

Stage 2: AI Processing
├── Categorize each transaction
├── Match to existing records
├── Flag discrepancies
└── Output: Categorized transactions

Stage 3: Reconciliation
├── Match to invoices/bills
├── Identify gaps
├── Suggest corrections
└── Output: Reconciled statement

Stage 4: Learning
├── Learn from user corrections
├── Improve categorization
├── Update bank format templates
└── Output: Improved accuracy
```

#### Implementation

```typescript
// PDF Statement Processor
const statementProcessor = {
  async processPDF(file: File, bankId: string) {
    // Stage 1: Extract data from PDF
    const extracted = await pdfExtractor.extract({
      file,
      bankTemplate: await getBankTemplate(bankId),
    });

    // Stage 2: AI categorization
    const categorized = await aiCategorizer.categorize({
      transactions: extracted.transactions,
      entityId: currentEntity.id,
    });

    // Stage 3: Reconciliation
    const reconciled = await reconciler.reconcile({
      transactions: categorized,
      existingRecords: await getExistingRecords(),
    });

    // Stage 4: Present to user
    return {
      totalTransactions: extracted.transactions.length,
      autoCategorized: categorized.filter((t) => t.confidence > 0.8).length,
      needsReview: categorized.filter((t) => t.confidence <= 0.8).length,
      reconciled: reconciled.matched.length,
      unmatched: reconciled.unmatched.length,
      transactions: reconciled,
    };
  },
};
```

#### Bank Format Templates

```typescript
// Common bank statement formats
const bankTemplates = {
  // Kenya
  kcb: {
    name: "Kenya Commercial Bank",
    format: "pdf",
    columns: ["date", "description", "debit", "credit", "balance"],
    datePattern: "DD/MM/YYYY",
    encoding: "utf-8",
  },
  equity: {
    name: "Equity Bank",
    format: "pdf",
    columns: ["date", "ref", "description", "amount", "balance"],
    datePattern: "DD-MM-YYYY",
  },

  // Nigeria
  gtbank: {
    name: "Guaranty Trust Bank",
    format: "pdf",
    columns: ["date", "time", "description", "amount", "balance"],
    datePattern: "DD MMM YYYY",
  },
  access: {
    name: "Access Bank",
    format: "pdf",
    columns: ["date", "narration", "debit", "credit", "balance"],
    datePattern: "DD/MM/YYYY",
  },

  // India
  hdfc: {
    name: "HDFC Bank",
    format: "pdf",
    columns: [
      "date",
      "narration",
      "chq/no",
      "withdrawal",
      "deposit",
      "balance",
    ],
    datePattern: "DD/MM/YY",
  },
  sbi: {
    name: "State Bank of India",
    format: "pdf",
    columns: ["date", "description", "debit", "credit", "balance"],
    datePattern: "DD MMM YYYY",
  },

  // Philippines
  bdo: {
    name: "BDO Unibank",
    format: "pdf",
    columns: ["date", "reference", "description", "amount", "balance"],
    datePattern: "MM/DD/YYYY",
  },
  bpi: {
    name: "Bank of the Philippine Islands",
    format: "pdf",
    columns: ["date", "description", "amount", "balance"],
    datePattern: "DD-MMM-YYYY",
  },

  // Tanzania
  crdb: {
    name: "CRDB Bank",
    format: "pdf",
    columns: ["date", "description", "debit", "credit", "balance"],
    datePattern: "DD/MM/YYYY",
  },
  nmb: {
    name: "NMB Bank",
    format: "pdf",
    columns: ["date", "description", "amount", "balance"],
    datePattern: "DD/MM/YYYY",
  },
};
```

### Invoice/Receipt Photo Upload

#### The Pipeline

```
User: [Takes photo of paper invoice/receipt]
    ↓
Stage 1: Image Processing
├── Enhance image quality
├── Deskew and crop
├── Detect text regions
└── Output: Enhanced image

Stage 2: OCR Extraction
├── Extract text via OCR
├── Identify key fields (vendor, amount, date, items)
├── Handle handwritten text (if possible)
└── Output: Structured data

Stage 3: AI Enhancement
├── Correct OCR errors
├── Infer missing fields
├── Categorize transaction
└── Output: Complete transaction

Stage 4: Validation
├── Check against business rules
├── Flag anomalies
├── Request confirmation
└── Output: Validated transaction
```

#### Implementation

```typescript
// Photo Invoice Processor
const photoProcessor = {
  async processPhoto(
    file: File,
    type: "invoice" | "receipt" | "bank_statement",
  ) {
    // Stage 1: Image enhancement
    const enhanced = await imageProcessor.enhance({
      file,
      operations: ["deskew", "denoise", "contrast"],
    });

    // Stage 2: OCR extraction
    const ocrResult = await ocrExtractor.extract({
      image: enhanced,
      language: await detectLanguage(enhanced),
    });

    // Stage 3: AI processing
    const processed = await aiProcessor.process({
      ocrText: ocrResult.text,
      type, // invoice, receipt, or bank_statement
      entityId: currentEntity.id,
    });

    // Stage 4: Validation
    const validated = await validator.validate({
      data: processed,
      businessRules: await getBusinessRules(),
    });

    return {
      originalImage: file,
      extractedData: processed,
      confidence: ocrResult.confidence,
      needsReview: ocrResult.confidence < 0.8,
      suggestedCategory: processed.category,
    };
  },
};
```

### Multi-Language Support

#### Language Detection and Translation

```typescript
const multiLanguageAgent = {
  async processInLocalLanguage(text: string, countryCode: string) {
    // Detect language
    const language = await detectLanguage(text);

    // Process in original language
    const processed = await aiProcessor.process({
      text,
      language,
    });

    // Translate to English for internal processing
    const translated = await translator.translate({
      text: processed.description,
      from: language,
      to: "en",
    });

    // Store both versions
    return {
      original: processed,
      translated,
      language,
      countryCode,
    };
  },
};
```

#### Supported Languages by Region

| Region             | Languages                     | Currency      | Tax System   |
| ------------------ | ----------------------------- | ------------- | ------------ |
| **East Africa**    | Swahili, English              | KES, UGX, TZS | VAT (16-18%) |
| **West Africa**    | French, English, Yoruba, Igbo | NGN, GHS, XOF | VAT (5-15%)  |
| **South Asia**     | Hindi, Urdu, Bengali, Tamil   | INR, PKR, BDT | GST (5-28%)  |
| **Southeast Asia** | Filipino, Thai, Vietnamese    | PHP, THB, VND | VAT (7-12%)  |
| **Latin America**  | Spanish, Portuguese           | BRL, MXN, ARS | IVA (16-21%) |

### Cash Transaction Tracking

#### The Problem

In developing countries, 40-60% of transactions are cash. Current platforms assume digital payments.

#### The Solution

```typescript
// Cash Transaction Agent
const cashAgent = {
  // Record cash sale
  async recordCashSale(amount: number, description: string, category: string) {
    return await journal.create({
      entries: [
        {
          account: "cash_on_hand",
          debit: amount,
        },
        {
          account: "sales_revenue",
          credit: amount,
        },
      ],
      metadata: {
        type: "cash_sale",
        description,
        category,
        recordedBy: "user",
        recordedAt: new Date(),
      },
    });
  },

  // Record cash expense
  async recordCashExpense(
    amount: number,
    vendor: string,
    category: string,
    receipt?: File,
  ) {
    // If receipt provided, OCR it
    let receiptData = null;
    if (receipt) {
      receiptData = await receiptProcessor.process(receipt);
    }

    return await journal.create({
      entries: [
        {
          account: category, // e.g., 'office_supplies'
          debit: amount,
        },
        {
          account: "cash_on_hand",
          credit: amount,
        },
      ],
      metadata: {
        type: "cash_expense",
        vendor,
        category,
        receiptData,
        recordedBy: "user",
        recordedAt: new Date(),
      },
    });
  },

  // Reconcile cash box
  async reconcileCashBox(
    openingBalance: number,
    transactions: CashTransaction[],
  ) {
    const totalIn = transactions
      .filter((t) => t.type === "in")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalOut = transactions
      .filter((t) => t.type === "out")
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedClosing = openingBalance + totalIn - totalOut;

    return {
      openingBalance,
      totalIn,
      totalOut,
      expectedClosing,
      transactions: transactions.length,
    };
  },
};
```

### Informal Economy Features

#### Barter/Exchange Tracking

```typescript
const barterAgent = {
  // Record barter transaction
  async recordBarter(
    itemGiven: {
      description: string;
      quantity: number;
      estimatedValue: number;
    },
    itemReceived: {
      description: string;
      quantity: number;
      estimatedValue: number;
    },
  ) {
    // Use fair market value for both items
    const fairValue = Math.max(
      itemGiven.estimatedValue,
      itemReceived.estimatedValue,
    );

    return await journal.create({
      entries: [
        // Record what you received
        {
          account: "inventory",
          debit: fairValue,
          description: `Received: ${itemReceived.quantity} ${itemReceived.description}`,
        },
        // Record what you gave
        {
          account: "cost_of_goods_sold",
          debit: fairValue,
          description: `Given: ${itemGiven.quantity} ${itemGiven.description}`,
        },
      ],
      metadata: {
        type: "barter",
        itemGiven,
        itemReceived,
        fairValue,
        recordedBy: "user",
      },
    });
  },
};
```

#### Informal Loan Tracking

```typescript
const informalLoanAgent = {
  // Track informal loans (common in developing countries)
  async trackLoan(
    type: "given" | "received",
    amount: number,
    counterparty: string,
    interestRate?: number,
    dueDate?: Date,
  ) {
    return await db.loan.create({
      entityId: currentEntity.id,
      type,
      amount,
      counterparty,
      interestRate: interestRate || 0,
      dueDate,
      status: "active",
      createdAt: new Date(),
    });
  },

  // Remind about due loans
  async checkDueLoans() {
    const dueLoans = await db.loan.findMany({
      where: {
        entityId: currentEntity.id,
        dueDate: { lte: new Date() },
        status: "active",
      },
    });

    for (const loan of dueLoans) {
      await notifyUser({
        title: `Loan ${loan.type === "given" ? "from" : "to"} ${loan.counterparty} is due`,
        message: `Amount: ${loan.amount}. Please follow up.`,
      });
    }
  },
};
```

---

## Part 3: Full Processing Pipelines

### Pipeline 1: Bank Statement Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    BANK STATEMENT PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Upload     │ →  │   Extract    │ →  │   Process    │      │
│  │  (PDF/Image) │    │  (OCR/PDF)   │    │  (AI/Categorize)│   │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Validate    │ →  │  Reconcile   │ →  │  Post        │      │
│  │  (Rules)     │    │  (Match)     │    │  (Journal)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Learn       │ →  │  Report      │ →  │  Notify      │      │
│  │  (Improve)   │    │  (Insights)  │    │  (User)      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Stage 1: Upload

```typescript
async function uploadStatement(file: File, bankId: string) {
  // Validate file
  if (!isValidPDF(file) && !isValidImage(file)) {
    throw new Error("Invalid file type. Please upload PDF or image.");
  }

  // Store file
  const stored = await storage.upload({
    file,
    path: `statements/${currentEntity.id}/${Date.now()}`,
  });

  // Create processing job
  const job = await jobs.create({
    type: "statement_processing",
    data: {
      fileId: stored.id,
      bankId,
      entityId: currentEntity.id,
    },
  });

  return { jobId: job.id, status: "processing" };
}
```

#### Stage 2: Extract

```typescript
async function extractStatement(fileId: string, bankId: string) {
  const file = await storage.get(fileId);
  const template = bankTemplates[bankId];

  if (file.type === "pdf") {
    return await pdfExtractor.extract({
      file,
      template,
    });
  } else {
    return await ocrExtractor.extract({
      file,
      template,
    });
  }
}
```

#### Stage 3: Process (AI)

```typescript
async function processTransactions(
  transactions: RawTransaction[],
  entityId: string,
) {
  const processed = [];

  for (const tx of transactions) {
    // AI categorization
    const category = await aiCategorizer.categorize({
      description: tx.description,
      amount: tx.amount,
      entityId,
    });

    // Anomaly detection
    const anomaly = await anomalyDetector.check({
      amount: tx.amount,
      category: category.id,
      entityId,
    });

    processed.push({
      ...tx,
      category: category.id,
      confidence: category.confidence,
      isAnomaly: anomaly.isAnomaly,
      anomalyReason: anomaly.reason,
    });
  }

  return processed;
}
```

#### Stage 4: Validate

```typescript
async function validateTransactions(transactions: ProcessedTransaction[]) {
  const validated = [];

  for (const tx of transactions) {
    const issues = [];

    // Check for duplicates
    const isDuplicate = await checkDuplicate(tx);
    if (isDuplicate) issues.push("duplicate");

    // Check against business rules
    const ruleViolations = await checkRules(tx);
    if (ruleViolations.length > 0) issues.push(...ruleViolations);

    // Check for anomalies
    if (tx.isAnomaly) issues.push(tx.anomalyReason);

    validated.push({
      ...tx,
      issues,
      needsReview: issues.length > 0 || tx.confidence < 0.8,
    });
  }

  return validated;
}
```

#### Stage 5: Reconcile

```typescript
async function reconcileTransactions(transactions: ValidatedTransaction[]) {
  const reconciled = {
    matched: [],
    unmatched: [],
    suggestions: [],
  };

  for (const tx of transactions) {
    // Try to match to existing records
    const match = await matchToRecord(tx);

    if (match) {
      reconciled.matched.push({ transaction: tx, record: match });
    } else {
      // Try to find similar transactions
      const similar = await findSimilar(tx);
      if (similar.length > 0) {
        reconciled.suggestions.push({ transaction: tx, suggestions: similar });
      } else {
        reconciled.unmatched.push(tx);
      }
    }
  }

  return reconciled;
}
```

#### Stage 6: Post

```typescript
async function postTransactions(reconciled: ReconciledData) {
  // Post matched transactions
  for (const { transaction, record } of reconciled.matched) {
    await journal.post({
      entry: createJournalEntry(transaction, record),
      confidence: transaction.confidence,
    });
  }

  // Create new records for unmatched
  for (const tx of reconciled.unmatched) {
    const newRecord = await createRecord(tx);
    await journal.post({
      entry: createJournalEntry(tx, newRecord),
      confidence: tx.confidence,
    });
  }

  // Log all actions
  await audit.log({
    action: "statement_posted",
    entityId: currentEntity.id,
    transactionsPosted: reconciled.matched.length + reconciled.unmatched.length,
    confidence: average(
      reconciled.matched.map((m) => m.transaction.confidence),
    ),
  });
}
```

#### Stage 7: Learn

```typescript
async function learnFromCorrections(corrections: Correction[]) {
  for (const correction of corrections) {
    // Update categorization model
    await aiCategorizer.learn({
      original: correction.originalCategory,
      corrected: correction.correctedCategory,
      description: correction.transaction.description,
      amount: correction.transaction.amount,
    });

    // Update bank template if needed
    if (correction.type === "extraction_error") {
      await updateBankTemplate(correction.bankId, correction.field);
    }

    // Update anomaly thresholds
    if (correction.type === "false_positive") {
      await anomalyDetector.adjustThreshold({
        category: correction.category,
        amount: correction.amount,
      });
    }
  }
}
```

#### Stage 8: Report

```typescript
async function generateInsights(transactions: PostedTransaction[]) {
  return await aiInsightsGenerator.generate({
    transactions,
    entityId: currentEntity.id,
    insights: [
      "spending_trends",
      "category_breakdown",
      "anomalies",
      "recommendations",
    ],
  });
}
```

#### Stage 9: Notify

```typescript
async function notifyUser(results: ProcessingResults) {
  const message = buildNotificationMessage(results);

  await notificationService.send({
    userId: currentUserId,
    title: "Statement Processing Complete",
    message,
    data: {
      jobId: results.jobId,
      transactionsProcessed: results.total,
      needsReview: results.needsReview,
    },
  });
}
```

### Pipeline 2: Invoice Processing (Upload)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE PROCESSING PIPELINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Upload     │ →  │   OCR        │ →  │   AI Parse   │      │
│  │  (PDF/Image) │    │  (Extract)   │    │  (Structure) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Validate    │ →  │  Create      │ →  │  Schedule    │      │
│  │  (Invoice)   │    │  (AP Record) │    │  (Payment)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Approve     │ →  │  Pay         │ →  │  Reconcile   │      │
│  │  (Workflow)  │    │  (Stripe)    │    │  (Match)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// Full Invoice Processing Pipeline
const invoicePipeline = {
  async process(file: File, type: "incoming" | "outgoing") {
    // Stage 1-3: Extract and parse
    const extracted = await invoiceExtractor.extract(file);

    // Stage 4: Validate
    const validated = await invoiceValidator.validate(extracted);

    // Stage 5: Create record
    let record;
    if (type === "incoming") {
      record = await ap.createInvoice({
        vendor: validated.vendor,
        invoiceNumber: validated.invoiceNumber,
        date: validated.date,
        dueDate: validated.dueDate,
        items: validated.items,
        total: validated.total,
        tax: validated.tax,
        currency: validated.currency,
        source: "ocr",
        originalFile: file.id,
      });
    } else {
      record = await ar.createInvoice({
        customer: validated.customer,
        invoiceNumber: validated.invoiceNumber,
        date: validated.date,
        dueDate: validated.dueDate,
        items: validated.items,
        total: validated.total,
        tax: validated.tax,
        currency: validated.currency,
        source: "ocr",
        originalFile: file.id,
      });
    }

    // Stage 6: Schedule payment (for incoming)
    if (type === "incoming") {
      await paymentScheduler.schedule({
        invoiceId: record.id,
        amount: record.total,
        dueDate: record.dueDate,
        method: "bank_transfer", // or 'mobile_money', 'cash'
      });
    }

    // Stage 7: Approval workflow
    if (record.total > approvalThreshold) {
      await approvalWorkflow.submit({
        recordId: record.id,
        type: type === "incoming" ? "ap_invoice" : "ar_invoice",
        amount: record.total,
        requestedBy: currentUserId,
      });
    }

    // Stage 8: Send (for outgoing)
    if (type === "outgoing") {
      await emailAgent.send({
        to: record.customer.email,
        subject: `Invoice #${record.invoiceNumber}`,
        body: await emailComposer.compose("invoice", record),
        attachments: [await pdfGenerator.generate("invoice", record)],
      });
    }

    return record;
  },
};
```

### Pipeline 3: Receipt Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECEIPT PROCESSING PIPELINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Photo      │ →  │   Enhance    │ →  │   OCR        │      │
│  │  (Camera)    │    │  (Image)     │    │  (Extract)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Categorize  │ →  │  Policy      │ →  │  Create      │      │
│  │  (AI)        │    │  Check       │    │  (Expense)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Approve     │ →  │  Reimburse   │ →  │  File        │      │
│  │  (Manager)   │    │  (Payment)   │    │  (Archive)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// Full Receipt Processing Pipeline
const receiptPipeline = {
  async process(file: File) {
    // Stage 1-2: Enhance image
    const enhanced = await imageProcessor.enhance(file);

    // Stage 3: OCR extraction
    const ocrResult = await ocrExtractor.extract(enhanced);

    // Stage 4: AI categorization
    const category = await aiCategorizer.categorize({
      vendor: ocrResult.vendor,
      items: ocrResult.items,
      entityId: currentEntity.id,
    });

    // Stage 5: Policy check
    const policyCheck = await policyChecker.check({
      amount: ocrResult.amount,
      category: category.id,
      entityId: currentEntity.id,
    });

    // Stage 6: Create expense claim
    const expense = await expenseClaims.create({
      items: [
        {
          description: ocrResult.vendor,
          amount: ocrResult.amount,
          category: category.id,
          date: ocrResult.date,
          receiptImage: file.id,
          ocrData: ocrResult,
        },
      ],
      submittedBy: currentUserId,
      policyViolations: policyCheck.violations,
    });

    // Stage 7: Approval workflow
    if (
      ocrResult.amount > approvalThreshold ||
      policyCheck.violations.length > 0
    ) {
      await approvalWorkflow.submit({
        recordId: expense.id,
        type: "expense_claim",
        amount: ocrResult.amount,
        violations: policyCheck.violations,
        requestedBy: currentUserId,
      });
    }

    // Stage 8: Reimbursement (if approved)
    if (
      policyCheck.violations.length === 0 &&
      ocrResult.amount < approvalThreshold
    ) {
      await reimbursement.process({
        expenseId: expense.id,
        amount: ocrResult.amount,
        method: await getPreferredReimbursementMethod(currentUserId),
      });
    }

    return expense;
  },
};
```

### Pipeline 4: Cash Transaction Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    CASH TRANSACTION PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Record     │ →  │   Categorize │ →  │   Journal    │      │
│  │  (Voice/Text)│    │  (AI)        │    │  (Entry)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Receipt     │ →  │  Reconcile   │ →  │  Report      │      │
│  │  (Optional)  │    │  (Cash Box)  │    │  (Summary)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// Cash Transaction Pipeline
const cashPipeline = {
  // Record via voice
  async recordVoice(audioFile: File) {
    // Transcribe audio
    const transcription = await speechToText.transcribe(audioFile);

    // Parse transaction details
    const parsed = await aiParser.parse({
      text: transcription,
      context: "cash_transaction",
    });

    // Create transaction
    return await this.createTransaction({
      type: parsed.type, // 'sale' or 'expense'
      amount: parsed.amount,
      description: parsed.description,
      vendor: parsed.vendor,
      category: parsed.category,
    });
  },

  // Record via text
  async recordText(text: string) {
    const parsed = await aiParser.parse({
      text,
      context: "cash_transaction",
    });

    return await this.createTransaction({
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      vendor: parsed.vendor,
      category: parsed.category,
    });
  },

  // Record via photo
  async recordPhoto(file: File) {
    const ocrResult = await ocrExtractor.extract(file);

    return await this.createTransaction({
      type: ocrResult.type,
      amount: ocrResult.amount,
      description: ocrResult.description,
      vendor: ocrResult.vendor,
      category: ocrResult.category,
      receiptImage: file.id,
    });
  },

  // Create journal entry
  async createTransaction(data: TransactionData) {
    const category = await aiCategorizer.categorize({
      description: data.description,
      amount: data.amount,
      entityId: currentEntity.id,
    });

    if (data.type === "sale") {
      return await journal.create({
        entries: [
          { account: "cash_on_hand", debit: data.amount },
          { account: category.accountId, credit: data.amount },
        ],
        metadata: {
          type: "cash_sale",
          ...data,
          category: category.id,
        },
      });
    } else {
      return await journal.create({
        entries: [
          { account: category.accountId, debit: data.amount },
          { account: "cash_on_hand", credit: data.amount },
        ],
        metadata: {
          type: "cash_expense",
          ...data,
          category: category.id,
        },
      });
    }
  },

  // Reconcile cash box
  async reconcileCashBox(day: Date) {
    const openingBalance = await getCashBalance(day);
    const transactions = await getDayTransactions(day);

    const totalIn = transactions
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalOut = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const closingBalance = openingBalance + totalIn - totalOut;

    // Update cash balance
    await updateCashBalance(day, closingBalance);

    return {
      date: day,
      openingBalance,
      totalIn,
      totalOut,
      closingBalance,
      transactions: transactions.length,
    };
  },
};
```

---

## Part 4: Mobile-First Design

### Offline-First Architecture

```typescript
// Offline sync for areas with poor connectivity
const offlineSync = {
  // Store transactions locally
  async storeLocally(transaction: Transaction) {
    await localDB.transactions.add({
      ...transaction,
      synced: false,
      createdAt: new Date(),
    });

    // Queue for sync
    await syncQueue.add({
      type: "transaction",
      data: transaction,
    });
  },

  // Sync when online
  async syncWhenOnline() {
    if (!navigator.onLine) return;

    const pending = await syncQueue.getAll();

    for (const item of pending) {
      try {
        await api.sync(item);
        await syncQueue.remove(item.id);
        await localDB.transactions.update(item.data.id, { synced: true });
      } catch (error) {
        // Keep in queue for next sync
        console.error("Sync failed:", error);
      }
    }
  },

  // Register for background sync
  async registerBackgroundSync() {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-transactions");
    }
  },
};
```

### Voice Interface

```typescript
// Voice-first interface for low-literacy users
const voiceInterface = {
  // Process voice command
  async processVoiceCommand(audioFile: File) {
    // Transcribe
    const transcription = await speechToText.transcribe({
      file: audioFile,
      language: await detectLanguage(audioFile),
    });

    // Parse intent
    const intent = await aiParser.parseIntent(transcription);

    // Execute action
    switch (intent.action) {
      case "record_sale":
        return await cashPipeline.recordVoice(audioFile);
      case "record_expense":
        return await cashPipeline.recordVoice(audioFile);
      case "check_balance":
        return await getAccountBalance(intent.account);
      case "send_invoice":
        return await invoicePipeline.createFromVoice(intent);
      default:
        return await aiAgent.respond(transcription);
    }
  },

  // Respond with voice
  async respondWithVoice(text: string, language: string) {
    const audio = await textToSpeech.synthesize({
      text,
      language,
    });

    return audio;
  },
};
```

---

## Summary: What We're Building

### For SMEs

| Feature              | AI-Native Approach           | Impact            |
| -------------------- | ---------------------------- | ----------------- |
| Quick invoicing      | Voice/chat → invoice         | 10x faster        |
| Cash flow visibility | AI explains in plain English | Better decisions  |
| Receipt scanning     | Photo → expense claim        | 5x faster         |
| Inventory tracking   | AI predicts stockouts        | Reduce lost sales |
| Tax compliance       | AI calculates and files      | Zero penalties    |

### For Developing Countries

| Feature        | AI-Native Approach              | Impact                   |
| -------------- | ------------------------------- | ------------------------ |
| Mobile money   | M-Pesa, MTN, Airtel integration | Digital payments         |
| PDF statements | Upload → AI processing          | Works without bank feeds |
| Photo invoices | Camera → OCR → AI               | Paper to digital         |
| Cash tracking  | Voice/text/photo → journal      | Informal economy         |
| Multi-language | Local language support          | Accessibility            |
| Offline-first  | Sync when connected             | Works anywhere           |

### Full Pipelines

| Pipeline         | Stages                                                                                  | Output                           |
| ---------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| Bank Statement   | Upload → Extract → Process → Validate → Reconcile → Post → Learn → Report → Notify      | Posted & reconciled transactions |
| Invoice          | Upload → OCR → Parse → Validate → Create → Schedule → Approve → Pay → Reconcile         | Processed & paid invoice         |
| Receipt          | Photo → Enhance → OCR → Categorize → Policy Check → Create → Approve → Reimburse → File | Approved & reimbursed expense    |
| Cash Transaction | Record → Categorize → Journal → Receipt → Reconcile → Report                            | Cash box reconciled              |

---

_AI-native SME and developing country features compiled August 2026. Every feature designed for the real world, not just Silicon Valley._
