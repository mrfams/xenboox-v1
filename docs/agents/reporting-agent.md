# Reporting Agent — Financial Reporting

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Reporting Agent |
| Tier | Platform-wide |
| Reports to | CFO Agent |
| Model | Claude Sonnet 4.6 (narrative generation + complex report assembly) |
| LangGraph file | `packages/agents/platform/reporting-agent.ts` |
| Observability | LangFuse (traces per report generation) |

---

## Domain Ownership

The Reporting Agent owns **all financial reporting** — standard statements, custom reports, donor reports, and plain-English narrative summaries. It produces the human-readable output of the entire accounting system.

**Exclusively controls:**
- P&L statement generation (monthly, quarterly, annual)
- Balance sheet generation
- Cash flow statement generation
- Trial balance report
- General ledger report
- Custom reports built on request via chat
- Donor and grant reports (USAID, EU, World Bank, AfDB formats)
- Audit preparation packages
- Year-end close packages
- Plain-English narrative summaries for non-accountant owners
- Board and management reporting packs
- Consolidated group reports for multi-entity organizations
- Report formatting and delivery (web, PDF, email)

**Does NOT control:**
- Underlying data (GL, sub-ledgers belong to other agents)
- Accounting decisions (Controller Agent)
- Data accuracy (Ledger Agent enforces)
- Budget comparison (Budget Agent — Phase 2)

---

## Responsibilities

1. Generate standard financial statements: P&L, balance sheet, cash flow
2. Generate trial balance and general ledger detail reports
3. Build custom reports based on natural-language requests
4. Produce donor-specific reports in required formats (USAID, EU, World Bank, AfDB)
5. Generate audit preparation packages with supporting schedules
6. Produce year-end close packages
7. Write plain-English narrative summaries explaining financial performance
8. Generate board and management reporting packs
9. Produce consolidated group reports for multi-entity organizations
10. Format reports for different delivery channels (web display, PDF, email)
11. Handle ad-hoc reporting requests via chat
12. Maintain report templates and formatting standards
13. Ensure all reports are entity-scoped and period-locked
14. Include trend comparisons (month-over-month, year-over-year) where relevant

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| CFO Agent | Report generation requests, format specifications, audience |
| Controller Agent | Trial balance, GL data, sub-ledger data |
| Ledger Agent | Account balances, journal entry detail |
| Budget Agent | Budget data for variance reports (Phase 2) |
| Analytics Agent | Trend data, anomaly highlights |
| User (chat) | Natural-language report requests |

### Outputs

| Target | Data |
|--------|------|
| CFO Agent | Generated reports, narrative summaries |
| Human | Reports via web, PDF, email |
| External auditors | Audit packages (via Compliance Agent) |
| Donors | Donor-specific reports (via portal) |
| Board | Board reporting packs |

---

## Tools

```typescript
const reportingTools = {
  // Database — read-only queries
  queryAccounts: db.query.accounts,
  queryJournalEntries: db.query.journalEntries,
  queryTrialBalance: db.query.trialBalance,
  queryPeriodBalances: db.query.periodBalances,
  queryAPInvoices: db.query.apInvoices,
  queryARInvoices: db.query.arInvoices,
  queryCashPositions: db.query.cashPositions,

  // Report generation
  pdfGenerator: pdfReportGenerator,              // PDF report rendering
  excelGenerator: excelReportGenerator,          // Excel export
  templateEngine: reportTemplateEngine,          // Report templates

  // Inter-agent
  sendToCFO: cfoAgent.invoke,

  // Delivery
  emailSender: resendClient,                     // Email delivery

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const reportingAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Current report request
  currentRequest: z.object({
    type: z.enum([
      "profit_loss",
      "balance_sheet",
      "cash_flow",
      "trial_balance",
      "general_ledger",
      "custom",
      "donor_report",
      "audit_package",
      "year_end_package",
      "board_pack",
      "consolidated",
      "narrative_summary",
    ]),
    period: z.string(),
    format: z.enum(["web", "pdf", "excel", "email"]),
    audience: z.enum(["owner", "finance_director", "board", "auditor", "donor", "public"]),
    customQuery: z.string().nullable(),           // Natural language for custom reports
    requestedBy: z.string(),                      // "cfo_agent" or "human"
    requestedAt: z.date(),
  }).nullable(),

  // Report data cache
  reportData: z.object({
    // P&L
    profitAndLoss: z.object({
      period: z.string(),
      revenue: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string(),
        amount: z.number(),
        priorPeriod: z.number().nullable(),
        variance: z.number().nullable(),
      })),
      costOfGoodsSold: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string(),
        amount: z.number(),
      })),
      grossProfit: z.number(),
      expenses: z.array(z.object({
        category: z.string(),
        items: z.array(z.object({
          accountCode: z.string(),
          accountName: z.string(),
          amount: z.number(),
          priorPeriod: z.number().nullable(),
        })),
        total: z.number(),
      })),
      operatingProfit: z.number(),
      otherIncome: z.number(),
      otherExpenses: z.number(),
      netProfit: z.number(),
      margin: z.number(),
    }).nullable(),

    // Balance Sheet
    balanceSheet: z.object({
      asOfDate: z.string(),
      assets: z.object({
        current: z.array(z.object({
          accountCode: z.string(),
          accountName: z.string(),
          amount: z.number(),
        })),
        nonCurrent: z.array(z.object({
          accountCode: z.string(),
          accountName: z.string(),
          amount: z.number(),
        })),
        total: z.number(),
      }),
      liabilities: z.object({
        current: z.array(z.object({
          accountCode: z.string(),
          accountName: z.string(),
          amount: z.number(),
        })),
        nonCurrent: z.array(z.object({
          accountCode: z.string(),
          accountName: z.string(),
          amount: z.number(),
        })),
        total: z.number(),
      }),
      equity: z.array(z.object({
        accountCode: z.string(),
        accountName: z.string(),
        amount: z.number(),
      })),
      totalEquity: z.number(),
      totalLiabilitiesAndEquity: z.number(),
    }).nullable(),

    // Cash Flow
    cashFlow: z.object({
      period: z.string(),
      operatingActivities: z.array(z.object({
        description: z.string(),
        amount: z.number(),
      })),
      investingActivities: z.array(z.object({
        description: z.string(),
        amount: z.number(),
      })),
      financingActivities: z.array(z.object({
        description: z.string(),
        amount: z.number(),
      })),
      netCashFlow: z.number(),
      openingCash: z.number(),
      closingCash: z.number(),
    }).nullable(),

    // Narrative
    narrative: z.object({
      summary: z.string(),                       // Plain-English 2-3 paragraph summary
      highlights: z.array(z.string()),           // Key points
      concerns: z.array(z.string()),             // Issues to watch
      recommendations: z.array(z.string()),      // Suggested actions
      comparisonNote: z.string().nullable(),     // vs prior period
    }).nullable(),
  }).nullable(),

  // Donor report data
  donorReport: z.object({
    grantReference: z.string(),
    donorName: z.string(),
    reportPeriod: z.string(),
    budgetVsActual: z.array(z.object({
      budgetLine: z.string(),
      budgetAmount: z.number(),
      actualAmount: z.number(),
      variance: z.number(),
      variancePercent: z.number(),
    })),
    narrativeReport: z.string(),
    complianceNotes: z.array(z.string()),
  }).nullable(),

  // Report generation status
  generationStatus: z.object({
    startedAt: z.date(),
    steps: z.array(z.object({
      step: z.string(),
      status: z.enum(["pending", "in_progress", "complete", "failed"]),
      completedAt: z.date().nullable(),
    })),
    completedAt: z.date().nullable(),
    outputUrl: z.string().nullable(),            // PDF/Excel URL
  }).nullable(),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Reporting Agent for [entity_name]. You produce all financial
reports and plain-English narrative summaries.

ROLE:
- You generate standard financial statements from ledger data.
- You build custom reports from natural-language requests.
- You write plain-English summaries for non-accountant stakeholders.
- You produce donor-specific reports in required formats.

CONSTRAINTS:
- All reports must be entity-scoped to [entity_id].
- Never fabricate data — only report what exists in the ledger.
- Always include the reporting period clearly.
- Narrative summaries must accurately reflect the numbers.
- Donor reports must follow the specific donor's required format.
- Multi-entity reports must eliminate inter-company transactions.

STANDARD REPORTS:

1. PROFIT & LOSS:
   - Revenue by account
   - Cost of goods sold
   - Gross profit
   - Operating expenses by category
   - Operating profit
   - Other income/expenses
   - Net profit
   - Include month-over-month and year-over-year comparison

2. BALANCE SHEET:
   - Assets: current + non-current
   - Liabilities: current + non-current
   - Equity
   - Must balance: Assets = Liabilities + Equity

3. CASH FLOW:
   - Operating activities
   - Investing activities
   - Financing activities
   - Net change in cash

4. TRIAL BALANCE:
   - All accounts with debit/credit balances
   - Total debits must equal total credits

NARRATIVE SUMMARIES:
Write for a non-accountant business owner:
- What happened this period in plain English
- Key financial highlights (good news first)
- Concerns or areas needing attention
- Suggested actions
- No jargon — "profit" not "net income", "money owed to you" not "receivables"
```

### Narrative Generation Prompt

```
NARRATIVE STYLE:
- Write at a grade 8 reading level
- Use short sentences
- Lead with the most important number
- Explain what the number means for the business
- Compare to the prior period when relevant
- Flag anything unusual or concerning
- Suggest one or two concrete actions

EXAMPLE:
"Your business made $12,400 profit this month, up 15% from last month.
Revenue was $45,000 — your best month this quarter. Your biggest expense
was staff costs at $18,000, which is in line with last month.

One thing to watch: you have $8,200 in invoices that are more than 60 days
overdue. I'd recommend following up with those customers this week.

Overall, your business is in good shape. You have $23,000 in the bank
and no major bills due in the next 30 days."
```

### Donor Report Formats

```typescript
type DonorReportFormat = {
  donor: "usaid" | "eu" | "world_bank" | "afdb" | "custom";
  requiredSections: string[];
  budgetFormat: "direct_cost" | "indirect_cost" | "combined";
  narrativeRequired: boolean;
  frequency: "monthly" | "quarterly" | "annual";
};

const donorFormats: Record<string, DonorReportFormat> = {
  usaid: {
    donor: "usaid",
    requiredSections: ["budget_vs_actual", "narrative", "financial_statement", "expenditure_detail"],
    budgetFormat: "direct_cost",
    narrativeRequired: true,
    frequency: "quarterly",
  },
  eu: {
    donor: "eu",
    requiredSections: ["financial_statement", "narrative", "procurement_report", "beneficiary_report"],
    budgetFormat: "combined",
    narrativeRequired: true,
    frequency: "quarterly",
  },
  // ... other donors
};
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| All data sourced from verified ledger | ≥ 0.9 | Generate and deliver report |
| Custom report with clear data path | 0.7–0.9 | Generate, note any approximations |
| Narrative matches data accurately | ≥ 0.9 | Deliver with narrative |
| Data incomplete or has known gaps | 0.5–0.7 | Generate with caveats, note gaps |
| Donor report format uncertain | 0.5–0.7 | Generate with best format, flag for review |
| Cannot determine correct account mapping | < 0.5 | Flag to Controller, do not guess |
| Consolidated report with unresolved inter-company | < 0.5 | Escalate to Controller |

---

## Error Handling

| Error | Response |
|-------|----------|
| GL data incomplete for period | Generate with available data, note gaps |
| Report generation timeout | Retry, then report partial results |
| Custom report request unclear | Ask clarifying question with 2-3 options |
| Donor format template not found | Use closest template, flag for review |
| Multi-entity data inconsistent | Flag to Controller, do not consolidate until resolved |
| Exchange rate missing for multi-currency | Use last known rate, note in report |
| Narrative contradicts data | **Critical** — regenerate narrative, never ship contradictory output |
| Report exceeds PDF page limit | Split into sections, maintain readability |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| CFO Agent | `report_ready` | Generated report with data and narrative |
| CFO Agent | `report_failed` | Report generation failure with reason |
| Human | `report_delivered` | Report via web/PDF/email |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| CFO Agent | `report_request` | Report type, period, format, audience |
| Controller Agent | `data_response` | GL data, trial balance, sub-ledger data |
| Human | `chat_request` | Natural-language report request |
| Budget Agent | `budget_data` | Budget data for variance reports (Phase 2) |
| Analytics Agent | `trend_data` | Trends for narrative context |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Financial statement accuracy | 100% | Numbers match ledger exactly |
| Balance sheet balances | 100% | Assets = Liabilities + Equity |
| Trial balance balances | 100% | Debits = Credits |
| Narrative accuracy | 100% | Narrative reflects actual data |
| Narrative readability | Grade 8 level | Flesch-Kincaid score |
| Report generation time | < 60s | Standard reports |
| Custom report fulfillment | ≥ 90% | Successfully generates from NL request |
| Donor format compliance | 100% | Follows donor's required format |
| Entity scoping | 100% | No cross-entity data leakage |

**Golden dataset scenarios:**
1. Monthly P&L → generated accurately with MoM comparison
2. Balance sheet → balances correctly
3. Narrative summary → plain-English, accurate, actionable
4. Custom report: "show me travel expenses this quarter" → generated correctly
5. USAID donor report → correct format, budget vs actual
6. Multi-entity consolidation → inter-company eliminated correctly
7. Board pack → P&L + balance sheet + narrative + highlights
