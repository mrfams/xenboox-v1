import type {
  AccountingTreatment,
  AccountingWorkflow,
  SuggestedAccount,
  IngestionState,
} from "../core/types";

// ─── Treatment Definitions ──────────────────────────────────────────────────

interface TreatmentRule {
  workflow: AccountingWorkflow;
  /** Match this rule when the document category matches */
  categoryMatch: string[];
  /** Match this rule when extracted data contains these field patterns */
  fieldPatterns?: Record<string, RegExp>;
  /** The accounting treatment to apply */
  getTreatment: (state: IngestionState) => AccountingTreatment;
}

/**
 * Default tax account code suffix. Entities can override this.
 * These are mapped to actual COA accounts in the coa-mapper.
 */
const DEFAULT_TAX_CODES = {
  inputVat: "2100",
  outputVat: "2200",
  withholdingTax: "2300",
  payrollTax: "2400",
};

// ─── Treatment Rules ────────────────────────────────────────────────────────

const TREATMENT_RULES: TreatmentRule[] = [
  // ── AP Invoice ──────────────────────────────────────────────────────────
  {
    workflow: "ap_invoice",
    categoryMatch: ["invoice"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;
      const taxAmount = (data.taxAmount as number) ?? 0;
      const subtotal = (data.subtotal as number) ?? totalAmount - taxAmount;
      const hasTax = taxAmount > 0.01;

      const debitAccounts: SuggestedAccount[] = [
        {
          label: "Expense or asset from supplier invoice",
          suggestedCode: getExpenseCodeFromLineItems(data),
          accountType: "expense",
          amount: subtotal,
        },
      ];

      const creditAccounts: SuggestedAccount[] = [
        {
          label: "Accounts Payable",
          suggestedCode: "2000",
          accountType: "liability",
          amount: totalAmount,
        },
      ];

      if (hasTax) {
        debitAccounts.push({
          label: "Input VAT (recoverable)",
          suggestedCode: DEFAULT_TAX_CODES.inputVat,
          accountType: "asset",
          amount: taxAmount,
        });
      }

      return {
        workflow: "ap_invoice",
        description: `AP Invoice${data.vendorName ? ` from ${data.vendorName}` : ""}${data.invoiceNumber ? ` (#${data.invoiceNumber})` : ""}`,
        debitAccounts,
        creditAccounts,
        taxTreatment: hasTax ? "input_vat" : "no_tax",
        taxRate:
          hasTax && totalAmount !== taxAmount
            ? taxAmount / (totalAmount - taxAmount)
            : undefined,
        reasoning: `Supplier invoice${data.vendorName ? ` from ${data.vendorName}` : ""} for ${formatCurrency(totalAmount)}. ${hasTax ? `Tax of ${formatCurrency(taxAmount)} (${((taxAmount / subtotal) * 100).toFixed(1)}%) treated as recoverable input VAT. ` : ""}Expense debited, AP credited.`,
      };
    },
  },

  // ── AR Invoice ──────────────────────────────────────────────────────────
  {
    workflow: "ar_invoice",
    categoryMatch: ["invoice"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;
      const taxAmount = (data.taxAmount as number) ?? 0;
      const subtotal = (data.subtotal as number) ?? totalAmount - taxAmount;
      const hasTax = taxAmount > 0.01;

      const debitAccounts: SuggestedAccount[] = [
        {
          label: "Accounts Receivable",
          suggestedCode: "1100",
          accountType: "asset",
          amount: totalAmount,
        },
      ];

      const creditAccounts: SuggestedAccount[] = [
        {
          label: "Sales Revenue",
          suggestedCode: "4000",
          accountType: "revenue",
          amount: subtotal,
        },
      ];

      if (hasTax) {
        creditAccounts.push({
          label: "Output VAT (collected)",
          suggestedCode: DEFAULT_TAX_CODES.outputVat,
          accountType: "liability",
          amount: taxAmount,
        });
      }

      return {
        workflow: "ar_invoice",
        description: `Sales Invoice${data.customerName ? ` to ${data.customerName}` : ""}${data.invoiceNumber ? ` (#${data.invoiceNumber})` : ""}`,
        debitAccounts,
        creditAccounts,
        taxTreatment: hasTax ? "output_vat" : "no_tax",
        taxRate: hasTax && subtotal > 0 ? taxAmount / subtotal : undefined,
        reasoning: `Sales invoice${data.customerName ? ` to ${data.customerName}` : ""} for ${formatCurrency(totalAmount)}. AR debited, Revenue credited${hasTax ? ` with ${formatCurrency(taxAmount)} output VAT` : ""}.`,
      };
    },
  },

  // ── AR Payment (receipt from customer) ──────────────────────────────────
  // Ordered before AP Payment so an ambiguous plain receipt defaults to
  // money-in (the common SME case) rather than money-out.
  {
    workflow: "ar_payment",
    categoryMatch: ["receipt"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "ar_payment",
        description: `Payment received${data.merchantName ? ` from ${data.merchantName}` : ""}`,
        debitAccounts: [
          {
            label: "Cash / Bank",
            suggestedCode: "1000",
            accountType: "asset",
            amount: totalAmount,
          },
        ],
        creditAccounts: [
          {
            label: "Accounts Receivable",
            suggestedCode: "1100",
            accountType: "asset",
            amount: totalAmount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Customer payment received: ${formatCurrency(totalAmount)}. Cash debited, AR credited.`,
      };
    },
  },

  // ── AP Payment ──────────────────────────────────────────────────────────
  {
    workflow: "ap_payment",
    categoryMatch: ["receipt"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "ap_payment",
        description: `Payment${data.merchantName ? ` to ${data.merchantName}` : ""}`,
        debitAccounts: [
          {
            label: "Accounts Payable",
            suggestedCode: "2000",
            accountType: "liability",
            amount: totalAmount,
          },
        ],
        creditAccounts: [
          {
            label: "Cash / Bank",
            suggestedCode: "1000",
            accountType: "asset",
            amount: totalAmount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Payment of ${formatCurrency(totalAmount)}${data.merchantName ? ` to ${data.merchantName}` : ""}. AP debited (reducing liability), Cash credited.`,
      };
    },
  },

  // ── Bank Transfer ───────────────────────────────────────────────────────
  {
    workflow: "bank_transfer",
    categoryMatch: ["bank_statement"],
    fieldPatterns: { transferBetweenAccounts: /.*/ },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "bank_transfer",
        description: "Bank transfer",
        debitAccounts: [
          {
            label: "Destination bank account",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Source bank account",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Bank transfer of ${formatCurrency(amount)}. Both sides are bank accounts — no P&L impact.`,
      };
    },
  },

  // ── Cash Expense (petty cash / imprest) ─────────────────────────────────
  {
    workflow: "cash_expense",
    categoryMatch: ["receipt"],
    fieldPatterns: { expenseNature: /(cash|petty|imprest)/i },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;
      const expenseCategory = inferExpenseCategory(data);

      return {
        workflow: "cash_expense",
        description: `Cash expense${data.merchantName ? ` at ${data.merchantName}` : ""}`,
        debitAccounts: [
          {
            label: expenseCategory.label,
            suggestedCode: expenseCategory.code,
            accountType: "expense",
            amount: totalAmount,
          },
        ],
        creditAccounts: [
          {
            label: "Petty Cash / Cash in Hand",
            suggestedCode: "1010",
            accountType: "asset",
            amount: totalAmount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Cash expense of ${formatCurrency(totalAmount)} for ${expenseCategory.label}. Expense debited, Cash credited.`,
      };
    },
  },

  // ── Payroll Run ─────────────────────────────────────────────────────────
  {
    workflow: "payroll_run",
    categoryMatch: ["payroll_report"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const grossPay = (data.grossPay as number) ?? 0;
      const netPay = (data.netPay as number) ?? 0;
      const taxAmount = (data.taxAmount as number) ?? 0;
      const deductions =
        (data.deductions as Array<{ name: string; amount: number }>) ?? [];
      const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);

      const debitAccounts: SuggestedAccount[] = [
        {
          label: "Payroll Expense (Gross)",
          suggestedCode: "6000",
          accountType: "expense",
          amount: grossPay,
        },
      ];

      const creditAccounts: SuggestedAccount[] = [
        {
          label: "Net Pay (Bank Transfer)",
          suggestedCode: "1000",
          accountType: "asset",
          amount: netPay,
        },
        {
          label: "Payroll Tax Payable",
          suggestedCode: DEFAULT_TAX_CODES.payrollTax,
          accountType: "liability",
          amount: taxAmount,
        },
      ];

      // Add deduction liabilities
      for (const deduction of deductions) {
        creditAccounts.push({
          label: `Deduction: ${deduction.name}`,
          suggestedCode: "2400",
          accountType: "liability",
          amount: deduction.amount,
        });
      }

      return {
        workflow: "payroll_run",
        description: `Payroll run${data.employeeName ? ` for ${data.employeeName}` : ""}${data.payPeriod ? ` - ${data.payPeriod}` : ""}`,
        debitAccounts,
        creditAccounts,
        taxTreatment: "withholding_tax",
        taxRate: grossPay > 0 ? taxAmount / grossPay : undefined,
        reasoning: `Payroll: Gross ${formatCurrency(grossPay)}, Net ${formatCurrency(netPay)}, Tax ${formatCurrency(taxAmount)}, Deductions ${formatCurrency(totalDeductions)}. Payroll expense debited, cash and liabilities credited.`,
      };
    },
  },

  // ── Asset Acquisition ───────────────────────────────────────────────────
  {
    workflow: "asset_acquisition",
    categoryMatch: ["invoice", "receipt"],
    fieldPatterns: {
      assetRelated:
        /(asset|equipment|machine|vehicle|furniture|computer|software)/i,
    },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;
      const taxAmount = data.taxAmount as number | undefined;
      const hasTax = (taxAmount ?? 0) > 0.01;

      const debitAccounts: SuggestedAccount[] = [
        {
          label: "Fixed Asset",
          suggestedCode: "1500",
          accountType: "asset",
          amount: totalAmount,
        },
      ];

      const creditAccounts: SuggestedAccount[] = [
        {
          label: "Accounts Payable / Cash",
          suggestedCode: "1000",
          accountType: "asset",
          amount: totalAmount,
        },
      ];

      if (hasTax && taxAmount) {
        debitAccounts.push({
          label: "Input VAT (recoverable)",
          suggestedCode: DEFAULT_TAX_CODES.inputVat,
          accountType: "asset",
          amount: taxAmount,
        });
      }

      return {
        workflow: "asset_acquisition",
        description: `Asset acquisition${data.vendorName ? ` from ${data.vendorName}` : ""}`,
        debitAccounts,
        creditAccounts,
        taxTreatment: hasTax ? "input_vat" : "no_tax",
        reasoning: `Asset purchase of ${formatCurrency(totalAmount)}. Asset account debited, payable/cash credited. This asset should be depreciated over its useful life.`,
      };
    },
  },

  // ── Inventory Purchase ──────────────────────────────────────────────────
  {
    workflow: "inventory_purchase",
    categoryMatch: ["invoice", "receipt"],
    fieldPatterns: {
      inventoryRelated: /(inventory|stock|raw material|supplies)/i,
    },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const totalAmount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "inventory_purchase",
        description: `Inventory purchase${data.vendorName ? ` from ${data.vendorName}` : ""}`,
        debitAccounts: [
          {
            label: "Inventory / Stock",
            suggestedCode: "1300",
            accountType: "asset",
            amount: totalAmount,
          },
        ],
        creditAccounts: [
          {
            label: "Accounts Payable",
            suggestedCode: "2000",
            accountType: "liability",
            amount: totalAmount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Inventory purchase of ${formatCurrency(totalAmount)}. Inventory debited, AP credited. Cost will be recognized when inventory is sold.`,
      };
    },
  },

  // ── Loan Disbursement ───────────────────────────────────────────────────
  {
    workflow: "loan_disbursement",
    categoryMatch: ["bank_statement", "contract"],
    fieldPatterns: { loanRelated: /(loan|borrow|finance)/i },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "loan_disbursement",
        description: "Loan received",
        debitAccounts: [
          {
            label: "Cash / Bank",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Loan Payable (Long-term)",
            suggestedCode: "2500",
            accountType: "liability",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Loan received: ${formatCurrency(amount)}. Cash debited, Loan payable credited.`,
      };
    },
  },

  // ── Equity Injection ────────────────────────────────────────────────────
  {
    workflow: "equity_injection",
    categoryMatch: ["bank_statement", "supporting"],
    fieldPatterns: {
      equityRelated: /(capital|equity|contribution|investment)/i,
    },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "equity_injection",
        description: "Owner/Investor capital contribution",
        debitAccounts: [
          {
            label: "Cash / Bank",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Owner's Equity / Capital",
            suggestedCode: "3000",
            accountType: "equity",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Capital contribution: ${formatCurrency(amount)}. Cash debited, Equity credited.`,
      };
    },
  },

  // ── Deposit ─────────────────────────────────────────────────────────────
  {
    workflow: "deposit",
    categoryMatch: ["bank_statement"],
    fieldPatterns: { depositRelated: /(deposit|credit)/i },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "deposit",
        description: "Bank deposit",
        debitAccounts: [
          {
            label: "Bank Account",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Undeposited Funds / Income",
            suggestedCode: "1200",
            accountType: "asset",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Bank deposit of ${formatCurrency(amount)}. Bank debited, undeposited funds credited.`,
      };
    },
  },

  // ── Withdrawal ──────────────────────────────────────────────────────────
  {
    workflow: "withdrawal",
    categoryMatch: ["bank_statement"],
    fieldPatterns: { withdrawalRelated: /(withdrawal|debit|atm)/i },
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "withdrawal",
        description: "Bank withdrawal",
        debitAccounts: [
          {
            label: "Cash in Hand / Expense",
            suggestedCode: "1010",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Bank Account",
            suggestedCode: "1000",
            accountType: "asset",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `Bank withdrawal of ${formatCurrency(amount)}. Cash debited, Bank credited.`,
      };
    },
  },

  // ── General Journal Adjustment (catch-all) ──────────────────────────────
  {
    workflow: "journal_adjustment",
    categoryMatch: ["journal_entry", "other", "supporting"],
    getTreatment: (state) => {
      const data = state.extraction.data;
      const amount = (data.totalAmount as number) ?? 0;

      return {
        workflow: "journal_adjustment",
        description: `Journal adjustment${data.description ? `: ${data.description}` : ""}`,
        debitAccounts: [
          {
            label: "Suspense / To be determined",
            suggestedCode: "9999",
            accountType: "asset",
            amount,
          },
        ],
        creditAccounts: [
          {
            label: "Suspense / To be determined",
            suggestedCode: "9999",
            accountType: "liability",
            amount,
          },
        ],
        taxTreatment: "no_tax",
        reasoning: `General journal entry of ${formatCurrency(amount)}. Classification requires user input — defaulting to suspense accounts.`,
      };
    },
  },
];

// ─── Rule Matching Engine ───────────────────────────────────────────────────

/**
 * Find the best matching treatment rule for the given ingestion state.
 * Uses category, field patterns, and keyword analysis.
 */
export function determineAccountingTreatment(
  state: IngestionState,
): AccountingTreatment {
  const category = state.classification.category;
  const data = state.extraction.data;
  const dataStr = JSON.stringify(data).toLowerCase();
  // Field patterns must only scan descriptive text — scanning the full JSON
  // lets entity names leak into matches (e.g. a vendor named "Acme Supplies"
  // would trigger the inventory rule and book purchases as stock). Keyword
  // scoring below still uses the full blob for AR/AP direction signals.
  const patternStr = [
    data.description,
    data.merchantName,
    data.category,
    data.expenseNature,
    ...((data.lineItems as Array<{ description?: string }> | undefined)?.map(
      (item) => item.description,
    ) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Score each rule
  const scored = TREATMENT_RULES.map((rule) => {
    let score = 0;

    // Category match (highest weight)
    if (rule.categoryMatch.includes(category)) {
      score += 3;
    }

    // Field pattern matches (descriptive text only)
    if (rule.fieldPatterns) {
      for (const [, regex] of Object.entries(rule.fieldPatterns)) {
        if (regex.test(patternStr)) {
          score += 2;
        }
      }
    }

    // Keyword matches in extracted data
    const keywords = getKeywordsForWorkflow(rule.workflow);
    const keywordMatches = keywords.filter((kw) =>
      dataStr.includes(kw.toLowerCase()),
    );
    score += keywordMatches.length * 0.5;

    return { rule, score };
  });

  // Sort by score descending, pick the best
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score > 0) {
    return scored[0].rule.getTreatment(state);
  }

  // Fallback to journal_adjustment
  const fallback = TREATMENT_RULES.find(
    (r) => r.workflow === "journal_adjustment",
  );
  return fallback!.getTreatment(state);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

interface ExpenseCategory {
  label: string;
  code: string;
}

function inferExpenseCategory(data: Record<string, unknown>): ExpenseCategory {
  const description = [
    data.description,
    data.merchantName,
    ...((data.lineItems as Array<{ description: string }> | undefined)?.map(
      (i: { description: string }) => i.description,
    ) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /(travel|hotel|flight|airline|taxi|uber|lyft|rental car|per diem)/i.test(
      description,
    )
  ) {
    return { label: "Travel Expense", code: "6100" };
  }
  if (
    /(meal|food|lunch|dinner|restaurant|catering|coffee)/i.test(description)
  ) {
    return { label: "Meals & Entertainment", code: "6200" };
  }
  if (/(office|supplies|stationery|printer|paper)/i.test(description)) {
    return { label: "Office Supplies", code: "6300" };
  }
  if (/(software|subscription|saas|license|cloud)/i.test(description)) {
    return { label: "Software & Subscriptions", code: "6400" };
  }
  if (/(utility|electric|water|internet|phone|gas)/i.test(description)) {
    return { label: "Utilities", code: "6500" };
  }
  if (/(rent|lease|property|office space)/i.test(description)) {
    return { label: "Rent & Lease", code: "6600" };
  }
  if (
    /(professional|consultant|legal|accounting|audit|fee)/i.test(description)
  ) {
    return { label: "Professional Services", code: "6700" };
  }
  if (/(insurance|premium|coverage)/i.test(description)) {
    return { label: "Insurance", code: "6800" };
  }
  if (/(market|advert|promo|sponsor|seo|social media)/i.test(description)) {
    return { label: "Marketing & Advertising", code: "6900" };
  }

  return { label: "Other Operating Expense", code: "7000" };
}

function getExpenseCodeFromLineItems(data: Record<string, unknown>): string {
  const lineItems = data.lineItems as
    | Array<{ description: string }>
    | undefined;
  if (!lineItems || lineItems.length === 0) {
    return "7000"; // Default to other expense
  }

  // Use the first line item to infer the expense category
  const firstItem = lineItems[0];
  return inferExpenseCategory({ description: firstItem.description }).code;
}

function getKeywordsForWorkflow(workflow: AccountingWorkflow): string[] {
  const keywordMap: Partial<Record<AccountingWorkflow, string[]>> = {
    ap_invoice: ["invoice", "bill", "vendor", "supplier", "payable"],
    ap_payment: ["payment", "paid", "check", "wire", "ach"],
    ar_invoice: ["invoice", "customer", "client", "receivable", "sale"],
    ar_payment: ["payment", "received", "deposit", "customer"],
    cash_expense: ["cash", "petty", "imprest", "expense"],
    payroll_run: ["payroll", "salary", "wage", "employee"],
    asset_acquisition: ["asset", "equipment", "purchase"],
    inventory_purchase: ["inventory", "stock", "goods"],
    loan_disbursement: ["loan", "borrowing"],
    equity_injection: ["capital", "equity", "investment"],
    bank_transfer: ["transfer", "move"],
    deposit: ["deposit", "credit"],
    withdrawal: ["withdrawal", "atm"],
    tax_payment: ["tax", "vat", "gst", "irs"],
  };

  return keywordMap[workflow] ?? [];
}
