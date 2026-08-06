import { z } from "zod";

// ─── Document Classifiers ───────────────────────────────────────────────────

/**
 * The accounting workflow a document should be routed to.
 * Each workflow determines the accounting treatment, journal entry pattern,
 * and downstream propagation logic.
 */
export const AccountingWorkflowSchema = z.enum([
  "ap_invoice", // Supplier invoice → AP sub-ledger
  "ap_payment", // Payment to supplier
  "ar_invoice", // Customer invoice → AR sub-ledger
  "ar_payment", // Payment from customer
  "ar_receipt", // Sales receipt (POS, cash sale)
  "bank_transfer", // Bank transfer between accounts
  "cash_expense", // Petty cash / imprest expense
  "credit_card", // Credit card transaction
  "deposit", // Bank deposit
  "withdrawal", // Bank withdrawal
  "payroll_run", // Payroll processing
  "payroll_tax", // Payroll tax remittance
  "tax_payment", // Tax payment (VAT, income tax, etc.)
  "asset_acquisition", // Fixed asset purchase
  "asset_disposal", // Fixed asset sale/disposal
  "depreciation", // Depreciation journal
  "inventory_purchase", // Inventory stock purchase
  "inventory_adjustment", // Inventory count adjustment
  "loan_disbursement", // Loan received
  "loan_repayment", // Loan payment
  "equity_injection", // Owner/ investor capital contribution
  "owner_draw", // Owner withdrawal
  "journal_adjustment", // Manual journal adjustment (catch-all)
  "interentity_transfer", // Transfer between entities
  "deferred_revenue", // Deferred revenue recognition
  "accrual", // Accrual journal
  "prepayment", // Prepaid expense
  "currency_conversion", // FX conversion
  "reconciliation_adjustment", // Bank reconciliation adjustment
  "month_end_close", // Month-end close entries
]);
export type AccountingWorkflow = z.infer<typeof AccountingWorkflowSchema>;

/**
 * Source of a transaction — how it entered the system.
 */
export const TransactionSourceSchema = z.enum([
  "document_upload",
  "bank_import",
  "mobile_money_import",
  "email_ingestion",
  "manual_entry",
  "api_import",
  "agent_generated",
  "recurring_template",
]);
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;

/**
 * Tax treatment types supported by the ingestion engine.
 */
export const TaxTreatmentSchema = z.enum([
  "no_tax",
  "input_vat",
  "output_vat",
  "vat_exempt",
  "vat_zero_rated",
  "withholding_tax",
  "sales_tax",
  "import_duty",
]);
export type TaxTreatment = z.infer<typeof TaxTreatmentSchema>;

// ─── Ingestion Pipeline State ───────────────────────────────────────────────

/**
 * Full lifecycle state of a document through the ingestion pipeline.
 * Tracks every stage from receipt through posting and propagation.
 */
export interface IngestionState {
  /** Reference to the source document */
  documentId: string;
  entityId: string;

  // ── Stage 1-3: Provided by existing document processing pipeline ──
  mimeType: string;
  ocrText: string;
  ocrConfidence: number;
  classification: {
    category: string;
    confidence: number;
    reasoning: string;
    metadata?: Record<string, unknown>;
  };
  extraction: {
    type: string;
    confidence: number;
    fieldConfidence: Record<string, number>;
    data: Record<string, unknown>;
  };

  // ── Stage 4: Entity Resolution ──
  resolvedEntities?: ResolvedEntities;

  // ── Stage 5: Transaction Classification ──
  workflow?: AccountingWorkflow;
  workflowConfidence?: number;

  // ── Stage 6: Accounting Treatment ──
  accountingTreatment?: AccountingTreatment;

  // ── Stage 7: COA Mapping ──
  coaMapping?: CoaMapping;

  // ── Stage 8: Tax Calculation ──
  taxCalculation?: TaxCalculation;

  // ── Stage 9: Journal Entry Generation ──
  proposedJournal?: ProposedJournalEntry;

  // ── Stage 10: Validation ──
  validation?: IngestionValidation;

  // ── Stage 11: Composite Confidence ──
  compositeConfidence?: IngestionConfidence;

  // ── Stage 12: Posting Decision ──
  postingDecision?: PostingDecision;

  // ── Stage 13: Posting Result ──
  postingResult?: PostingResult;
}

// ─── Entity Resolution ──────────────────────────────────────────────────────

/**
 * Records that were matched/resolved from the extracted data.
 */
export interface ResolvedEntities {
  vendor?: { id: string; name: string; confidence: number };
  customer?: { id: string; name: string; confidence: number };
  employee?: { id: string; name: string; confidence: number };
  bankAccount?: { id: string; name: string; confidence: number };
  asset?: { id: string; name: string; confidence: number };
  project?: { id: string; name: string; confidence: number };
  po?: { id: string; number: string; confidence: number };
  // Any unmatched entities that may need creation
  unmatched?: {
    type:
      | "vendor"
      | "customer"
      | "employee"
      | "bank_account"
      | "asset"
      | "other";
    name: string;
    suggestion?: string;
  }[];
}

// ─── Accounting Treatment ───────────────────────────────────────────────────

/**
 * The accounting treatment describes how a document/transaction
 * should be recorded in the general ledger.
 */
export interface AccountingTreatment {
  workflow: AccountingWorkflow;
  description: string;
  debitAccounts: SuggestedAccount[];
  creditAccounts: SuggestedAccount[];
  taxTreatment: TaxTreatment;
  taxRate?: number;
  /** If true, the entry should be split over time (e.g., prepayment, deferred revenue) */
  isDeferred?: {
    type: "prepaid" | "deferred_revenue" | "accrual";
    periodMonths: number;
    totalAmount: number;
  };
  /** Foreign currency handling */
  fxInfo?: {
    originalCurrency: string;
    originalAmount: number;
    exchangeRate: number;
    baseCurrency: string;
    baseAmount: number;
  };
  reasoning: string;
}

export interface SuggestedAccount {
  /** Natural language description of what this account is for */
  label: string;
  /** Suggested COA code if available */
  suggestedCode?: string;
  /** Suggested account type */
  accountType: string;
  /** The amount to post */
  amount: number;
}

// ─── COA Mapping ────────────────────────────────────────────────────────────

/**
 * Result of mapping suggested accounts to actual chart of accounts entries.
 */
export interface CoaMapping {
  debitLines: CoaLine[];
  creditLines: CoaLine[];
  /** Mapping confidence per line */
  lineConfidence: Record<string, number>;
  /** Any accounts that couldn't be mapped */
  unmapped: SuggestedAccount[];
}

export interface CoaLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  description: string;
  /** How confident we are this account is correct */
  confidence: number;
}

// ─── Tax Calculation ────────────────────────────────────────────────────────

export interface TaxCalculation {
  treatment: TaxTreatment;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  taxAccountId?: string;
  taxAccountCode?: string;
  confidence: number;
}

// ─── Journal Entry ──────────────────────────────────────────────────────────

export interface ProposedJournalEntry {
  description: string;
  date: string;
  reference: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  periodId?: string;
  /** The source of this entry for audit trail */
  source: TransactionSource;
  /** AI reasoning for this entry */
  reasoning: string;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  lineConfidence: number;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface IngestionValidation {
  doubleEntryValid: boolean;
  accountsExist: boolean;
  periodOpen: boolean;
  noDuplicates: boolean;
  amountsValid: boolean;
  taxValid: boolean;
  /** TrustGuard cross-validation result (deterministic math checks) */
  trustGuard?: {
    passed: boolean;
    checks: Array<{
      name: string;
      description: string;
      passed: boolean;
      expected: number;
      actual: number;
      difference: number;
      severity: "error" | "warning";
      message: string;
    }>;
    passedCount: number;
    totalCount: number;
    confidenceImpact: number;
    summary: string;
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ─── Confidence Scoring ─────────────────────────────────────────────────────

export interface IngestionConfidence {
  /** Overall composite score 0-1 */
  overall: number;
  /** Individual confidence signals */
  signals: IngestionConfidenceSignal[];
  /** Primary factor driving the score down (if any) */
  dominantSignal?: string;
  /** Whether auto-posting is safe */
  autoPostReady: boolean;
}

export interface IngestionConfidenceSignal {
  name: string;
  value: number;
  weight: number;
  description: string;
}

// ─── Posting Decision ───────────────────────────────────────────────────────

export interface PostingDecision {
  /**
   * - "auto_post": Confidence ≥ 95% — post automatically
   * - "pending_review": Confidence < 95% — present to user for verification
   * - "rejected": Validation failed — cannot post
   * - "escalated": Requires human intervention
   */
  action: "auto_post" | "pending_review" | "rejected" | "escalated";
  confidence: number;
  reason: string;
  /** If pending review, what the user needs to verify */
  reviewItems?: ReviewItem[];
}

export interface ReviewItem {
  field: string;
  label: string;
  extractedValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  /** If the user can edit this field */
  editable: boolean;
}

// ─── Posting Result ─────────────────────────────────────────────────────────

export interface PostingResult {
  posted: boolean;
  journalEntryId?: string;
  entryNumber?: number;
  postedAt?: string;
  /** If not posted, why */
  rejectionReason?: string;
  /** Links created between document and posted entry */
  linksCreated?: string[];
  /** Audit log entries created */
  auditEntries?: string[];
}

// ─── Propagation Result ─────────────────────────────────────────────────────

export interface PropagationResult {
  success: boolean;
  updated: {
    generalLedger: boolean;
    trialBalance: boolean;
    apSubledger?: boolean;
    arSubledger?: boolean;
    fixedAssets?: boolean;
    inventory?: boolean;
    budgets?: boolean;
    cashFlow?: boolean;
    kpis?: boolean;
  };
  errors: string[];
}

// ─── Full Pipeline Result ───────────────────────────────────────────────────

export interface IngestionPipelineResult {
  documentId: string;
  entityId: string;
  success: boolean;
  workflow: AccountingWorkflow;
  proposedEntry?: ProposedJournalEntry;
  confidence: IngestionConfidence;
  postingDecision: PostingDecision;
  postingResult?: PostingResult;
  propagationResult?: PropagationResult;
  error?: string;
  pipelineDurationMs: number;
}
