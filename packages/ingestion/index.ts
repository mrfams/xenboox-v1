/**
 * Xenboox Autonomous Accounting Ingestion System
 *
 * Orchestrates the complete end-to-end ingestion pipeline from document
 * submission through to automated posting and downstream propagation.
 *
 * Pipeline stages:
 *   1-3. Document processing (OCR, classification, extraction) — done by jobs
 *   4.   Entity resolution − match vendors, customers, employees, etc.
 *   5.   Transaction classification − determine accounting workflow
 *   6.   Accounting treatment − determine correct accounting treatment
 *   7.   COA mapping − map to chart of accounts
 *   8.   Tax calculation − compute taxes
 *   9.   Journal entry generation − create balanced double-entry entries
 *   10.  Validation − validate journal integrity + TrustGuard deterministic checks
 *   11.  Composite confidence − combine all confidence signals
 *   12.  Posting decision − auto-post (≥95%) or request review
 *   13.  Posting execution − commit to database
 *   14.  Propagation − update all downstream modules
 */

import { db } from "@xenboox/db";
import { documents, auditLog, agentActivity } from "@xenboox/db/schema";
import { eq, and, gte } from "drizzle-orm";
import type {
  AccountingWorkflow,
  IngestionState,
  IngestionPipelineResult,
} from "./core/types";
import { AccountingWorkflowSchema } from "./core/types";
import { computeIngestionConfidence } from "./core/confidence";
import { determineAccountingTreatment } from "./engine/accounting-treatment";
import { mapToChartOfAccounts } from "./engine/coa-mapper";
import { generateJournalEntry } from "./engine/journal-generator";
import {
  decidePosting,
  executePosting,
  checkDuplicate,
} from "./engine/posting-engine";
import { resolveEntities } from "./engine/entity-resolution";
import { calculateTax } from "./engine/tax-calculator";
import { runTrustGuard } from "./engine/trust-guard";
import { runValidation } from "./intake/validation-layer";
import { updateIngestionStatus } from "./engine/status-tracker";

// ─── Main Pipeline Orchestrator ─────────────────────────────────────────────

/**
 * Run the full autonomous ingestion pipeline for a processed document.
 *
 * @param documentId - The ID of the document to process
 * @param entityId - The entity ID for scoping
 * @returns Full pipeline result including posting decision and result
 */
export async function runIngestionPipeline(
  documentId: string,
  entityId: string,
): Promise<IngestionPipelineResult> {
  const startTime = Date.now();

  try {
    // 1. Load the processed document
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) {
      return {
        documentId,
        entityId,
        success: false,
        workflow: "journal_adjustment",
        confidence: { overall: 0, signals: [], autoPostReady: false },
        postingDecision: {
          action: "rejected",
          confidence: 0,
          reason: "Document not found",
        },
        error: "Document not found",
        pipelineDurationMs: Date.now() - startTime,
      };
    }

    // Ensure the document has been processed through OCR/classification/extraction
    // or is in early ingestion stages (for pipeline recovery/retry)
    const READY_STATUSES = new Set([
      "synced",
      "agent_processing",
      "resolving",
      "classifying_workflow",
      "mapping_accounts",
      "calculating_tax",
      "generating_journal",
      "validating_entry",
      "deciding_post",
    ]);
    if (!READY_STATUSES.has(doc.status)) {
      return {
        documentId,
        entityId,
        success: false,
        workflow: "journal_adjustment",
        confidence: { overall: 0, signals: [], autoPostReady: false },
        postingDecision: {
          action: "rejected",
          confidence: 0,
          reason: `Document not ready for ingestion: status is "${doc.status}"`,
        },
        error: `Document not ready: ${doc.status}`,
        pipelineDurationMs: Date.now() - startTime,
      };
    }

    const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
    const ingestionMeta = (metadata.ingestion ?? {}) as Record<string, unknown>;

    // ── Idempotency check: skip if already posted ──
    if (ingestionMeta.postedAt && ingestionMeta.journalEntryId) {
      return {
        documentId,
        entityId,
        success: true,
        workflow:
          (ingestionMeta.workflow as AccountingWorkflow) ??
          "journal_adjustment",
        confidence: {
          overall: (ingestionMeta.confidence as number) ?? 1,
          signals: [],
          autoPostReady: true,
        },
        postingDecision: {
          action: "auto_post",
          confidence: (ingestionMeta.confidence as number) ?? 1,
          reason: `Already posted at ${ingestionMeta.postedAt} — idempotent skip.`,
        },
        postingResult: {
          posted: true,
          journalEntryId: ingestionMeta.journalEntryId as string,
          entryNumber: (ingestionMeta.entryNumber as number) ?? 0,
          postedAt: ingestionMeta.postedAt as string,
          auditEntries: [],
          linksCreated: [],
        },
        pipelineDurationMs: Date.now() - startTime,
      };
    }

    const extractionMeta = (metadata.extraction ?? {}) as Record<
      string,
      unknown
    >;
    const classificationMeta = (metadata.classification ?? {}) as Record<
      string,
      unknown
    >;

    // Build the ingestion state
    const state: IngestionState = {
      documentId: doc.id,
      entityId,
      mimeType: doc.mimeType ?? "",
      ocrText: doc.ocrText ?? "",
      ocrConfidence: parseFloat(doc.ocrConfidence ?? "0"),
      classification: {
        category:
          (classificationMeta.category as string) ?? doc.type ?? "other",
        confidence: (classificationMeta.confidence as number) ?? 0.5,
        reasoning: (classificationMeta.reasoning as string) ?? "",
        metadata:
          (classificationMeta.metadata as Record<string, unknown>) ?? {},
      },
      extraction: {
        type: (extractionMeta.type as string) ?? "other",
        confidence: (extractionMeta.confidence as number) ?? 0.5,
        fieldConfidence:
          (extractionMeta.fieldConfidence as Record<string, number>) ?? {},
        data: (extractionMeta.data as Record<string, unknown>) ?? {},
      },
    };

    // Log pipeline start
    await logAgentActivity(entityId, "ingestion.start", {
      documentId,
      category: state.classification.category,
    });

    // ── Stage 4: Entity Resolution ──
    await updateIngestionStatus(documentId, entityId, "resolving", {
      category: state.classification.category,
    });
    state.resolvedEntities = await resolveEntities(
      entityId,
      state.extraction.data,
    );

    // ── Stage 5: Transaction Classification ──
    await updateIngestionStatus(documentId, entityId, "classifying_workflow", {
      category: state.classification.category,
    });
    state.workflow = classifyWorkflow(state);
    state.workflowConfidence = state.classification.confidence;

    // ── Stage 6: Accounting Treatment ──
    state.accountingTreatment = determineAccountingTreatment(state);

    // ── Stage 7: COA Mapping ──
    await updateIngestionStatus(documentId, entityId, "mapping_accounts", {
      workflow: state.workflow,
    });
    state.coaMapping = await mapToChartOfAccounts(
      entityId,
      state.accountingTreatment,
    );

    // ── Stage 8: Tax Calculation ──
    await updateIngestionStatus(documentId, entityId, "calculating_tax", {
      workflow: state.workflow,
    });
    state.taxCalculation = calculateTax(
      state,
      state.accountingTreatment,
      // Entity jurisdiction could come from entity settings
    );

    // Extract date from document data if available
    const extractedDate =
      (state.extraction.data.invoiceDate as string) ??
      (state.extraction.data.transactionDate as string) ??
      (state.extraction.data.date as string) ??
      undefined;

    // ── Stage 9: Journal Entry Generation ──
    await updateIngestionStatus(documentId, entityId, "generating_journal", {
      workflow: state.workflow,
      coaLines: state.coaMapping
        ? [...state.coaMapping.debitLines, ...state.coaMapping.creditLines]
            .length
        : 0,
    });
    const { entry, validation } = await generateJournalEntry(
      entityId,
      state.accountingTreatment,
      state.coaMapping,
      "document_upload",
      extractedDate,
    );
    state.proposedJournal = entry;
    state.validation = validation;

    // ── Stage 10: Validation ──
    await updateIngestionStatus(documentId, entityId, "validating_entry", {
      workflow: state.workflow,
      balanced: entry.balanced,
      lineCount: entry.lines.length,
    });
    // Duplicate check — journal entry reference
    const duplicateCount = await checkDuplicate(entityId, entry.reference);
    state.validation.noDuplicates = duplicateCount === 0;
    if (duplicateCount > 0) {
      state.validation.warnings.push({
        field: "reference",
        message: `Found ${duplicateCount} existing entries with reference "${entry.reference}"`,
      });
    }

    // Duplicate check — document-level (same file hash or same vendor+amount+date)
    const docDuplicates = await checkDocumentDuplicate(entityId, doc, state);
    if (docDuplicates.isDuplicate) {
      state.validation.noDuplicates = false;
      state.validation.warnings.push({
        field: "document_duplicate",
        message: docDuplicates.reason,
      });
    }

    // ── Stage 10b: TrustGuard — deterministic cross-validation ──
    // Reuse TrustGuard result from Trigger.dev pipeline if available
    // (avoids double-running the same deterministic checks).
    const existingTrustGuard =
      (metadata.trustGuard as Record<string, unknown>) ?? undefined;
    if (existingTrustGuard && typeof existingTrustGuard.passed === "boolean") {
      // TrustGuard already ran in document-processing.ts Stage 5 — reuse it
      state.trustGuard = {
        passed: existingTrustGuard.passed as boolean,
        checks: [], // Individual checks not stored in metadata
        passedCount: (existingTrustGuard.passedCount as number) ?? 0,
        totalCount: (existingTrustGuard.checks as number) ?? 0,
        confidenceImpact:
          (existingTrustGuard.confidenceImpact as number) ?? 1.0,
        summary:
          (existingTrustGuard.summary as string) ?? "Reused from pipeline",
      };
    } else {
      // First run (e.g. pipeline recovery/retry) — run TrustGuard now
      state.trustGuard = runTrustGuard(state);
    }
    if (!state.trustGuard.passed) {
      state.validation.warnings.push({
        field: "trust_guard",
        message: `TrustGuard failed: ${state.trustGuard.summary}`,
      });
    }

    // ── Stage 10c: Content-level validation (fraud, compliance, math) ──
    // This was previously dead code — now wired in.
    // Detects: round amounts, Benford's Law deviation, duplicate invoice numbers,
    // missing tax IDs, amount threshold violations, weekend transactions.
    const contentValidation = await runValidation(state);
    if (contentValidation.flags.length > 0) {
      for (const flag of contentValidation.flags) {
        if (flag.severity === "critical" || flag.severity === "high") {
          state.validation.errors.push({
            field: flag.field ?? flag.code,
            message: flag.message,
            severity: flag.severity === "critical" ? "error" : "warning",
          });
        } else {
          state.validation.warnings.push({
            field: flag.field ?? flag.code,
            message: flag.message,
          });
        }
      }
    }

    // ── Stage 11: Composite Confidence ──
    state.compositeConfidence = computeIngestionConfidence(
      state,
      duplicateCount,
    );

    // ── Stage 12: Posting Decision ──
    await updateIngestionStatus(documentId, entityId, "deciding_post", {
      workflow: state.workflow,
      confidence: state.compositeConfidence.overall,
    });
    const decision = decidePosting(state, state.compositeConfidence);

    // ── Stage 13-14: Posting Execution + Propagation ──
    await updateIngestionStatus(documentId, entityId, "posting", {
      workflow: state.workflow,
      action: decision.action,
      confidence: decision.confidence,
    });
    const result = await executePosting(state, decision);

    // Log pipeline completion
    await logAgentActivity(entityId, "ingestion.complete", {
      documentId,
      workflow: state.workflow,
      confidence: state.compositeConfidence.overall,
      action: decision.action,
      posted: result.postingResult?.posted ?? false,
      journalEntryId: result.postingResult?.journalEntryId,
      durationMs: result.pipelineDurationMs,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await logAgentActivity(entityId, "ingestion.failed", {
      documentId,
      error: errorMessage,
    });

    return {
      documentId,
      entityId,
      success: false,
      workflow: "journal_adjustment",
      confidence: { overall: 0, signals: [], autoPostReady: false },
      postingDecision: {
        action: "rejected",
        confidence: 0,
        reason: "Pipeline error",
      },
      error: errorMessage,
      pipelineDurationMs: Date.now() - startTime,
    };
  }
}

// ─── Workflow Classification ────────────────────────────────────────────────

/**
 * Classify the transaction into a specific accounting workflow based on
 * document type, extracted content, and keyword analysis.
 */
function classifyWorkflow(state: IngestionState): AccountingWorkflow {
  const category = state.classification.category;
  const data = state.extraction.data;
  const dataStr = JSON.stringify(data).toLowerCase();

  // Check resolved entities first — if we matched a customer, it's AR
  if (state.resolvedEntities?.customer) {
    if (category === "invoice") return "ar_invoice";
    if (category === "receipt") return "ar_payment";
  }

  // Check resolved vendor
  if (state.resolvedEntities?.vendor) {
    if (category === "invoice") return "ap_invoice";
    if (category === "receipt") return "ap_payment";
  }

  // Check resolved employee
  if (state.resolvedEntities?.employee) {
    return "payroll_run";
  }

  // Check resolved asset
  if (state.resolvedEntities?.asset) {
    return "asset_acquisition";
  }

  // Keyword-based workflow detection
  if (category === "invoice") {
    if (
      data.customerName ||
      dataStr.includes("customer") ||
      dataStr.includes("client")
    ) {
      return "ar_invoice";
    }
    if (
      dataStr.includes("asset") ||
      dataStr.includes("equipment") ||
      dataStr.includes("machine")
    ) {
      return "asset_acquisition";
    }
    if (
      dataStr.includes("inventory") ||
      dataStr.includes("stock") ||
      dataStr.includes("raw material")
    ) {
      return "inventory_purchase";
    }
    return "ap_invoice";
  }

  if (category === "receipt") {
    if (dataStr.includes("payroll") || dataStr.includes("salary")) {
      return "payroll_run";
    }
    if (
      dataStr.includes("petty") ||
      dataStr.includes("cash") ||
      dataStr.includes("imprest")
    ) {
      return "cash_expense";
    }
    if (
      dataStr.includes("payment") ||
      dataStr.includes("received") ||
      dataStr.includes("customer")
    ) {
      return "ar_payment";
    }
    return "cash_expense";
  }

  if (category === "bank_statement") {
    if (dataStr.includes("transfer")) return "bank_transfer";
    if (dataStr.includes("loan") || dataStr.includes("borrow"))
      return "loan_disbursement";
    if (dataStr.includes("capital") || dataStr.includes("equity"))
      return "equity_injection";
    if (dataStr.includes("deposit") || dataStr.includes("credit"))
      return "deposit";
    if (
      dataStr.includes("withdrawal") ||
      dataStr.includes("debit") ||
      dataStr.includes("atm")
    )
      return "withdrawal";
    return "bank_transfer";
  }

  if (category === "payroll_report") return "payroll_run";
  if (category === "po" || category === "purchase_order")
    return "inventory_purchase";
  if (category === "tax_return") return "tax_payment";
  if (category === "journal_entry") return "journal_adjustment";

  if (category === "contract") {
    if (dataStr.includes("loan") || dataStr.includes("finance"))
      return "loan_disbursement";
    if (dataStr.includes("lease") || dataStr.includes("rent")) return "accrual";
    return "journal_adjustment";
  }

  // Default fallback
  return "journal_adjustment";
}

// ─── Simplified Pipeline (for Trigger.dev jobs) ─────────────────────────────

/**
 * Simplified entry point for the Trigger.dev job pipeline.
 */
export async function processIngestion(
  documentId: string,
  entityId: string,
): Promise<IngestionPipelineResult> {
  return runIngestionPipeline(documentId, entityId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logAgentActivity(
  entityId: string,
  action: string,
  data: Record<string, unknown>,
) {
  try {
    await db.insert(agentActivity).values({
      entityId,
      agentName: "ingestion-engine",
      action,
      input: data,
      output: {},
      status: "success",
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        module: "ingestion",
        message: "Failed to log agent activity",
        action,
      }),
    );
  }
}

// ─── Document Duplicate Detection ──────────────────────────────────────────

/**
 * Check if a document is a duplicate based on:
 * 1. Same file hash (SHA-256) — exact same file uploaded twice
 * 2. Same vendor + amount + date — same invoice from same vendor
 */
async function checkDocumentDuplicate(
  entityId: string,
  doc: typeof documents.$inferSelect,
  state: IngestionState,
): Promise<{ isDuplicate: boolean; reason: string }> {
  const data = state.extraction.data;

  // Check 1: Same file hash
  const docMetadata = (doc.metadata ?? {}) as Record<string, unknown>;
  const checksum = docMetadata.checksum as string | undefined;
  if (checksum) {
    // Scope to last 30 days to avoid full table scan on large entities
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const existingDocs = await db.query.documents.findMany({
      where: and(
        eq(documents.entityId, entityId),
        gte(documents.createdAt, thirtyDaysAgo),
      ),
      columns: { id: true, metadata: true, name: true },
      limit: 500,
    });

    for (const existing of existingDocs) {
      if (existing.id === doc.id) continue;
      const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>;
      if (existingMeta.checksum === checksum) {
        return {
          isDuplicate: true,
          reason: `Exact duplicate: same file hash as document "${existing.name}"`,
        };
      }
    }
  }

  // Check 2: Same vendor + amount + date (invoice/receipt only)
  const category = state.classification.category;
  if (category === "invoice" || category === "receipt") {
    const vendorName = (data.vendorName ?? data.customerName) as
      | string
      | undefined;
    const totalAmount = data.totalAmount as number | undefined;
    const invoiceDate = (data.invoiceDate ?? data.date) as string | undefined;

    if (vendorName && totalAmount && invoiceDate) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
      const existingDocs = await db.query.documents.findMany({
        where: and(
          eq(documents.entityId, entityId),
          gte(documents.createdAt, thirtyDaysAgo),
        ),
        columns: { id: true, name: true, metadata: true, type: true },
        limit: 500,
      });

      for (const existing of existingDocs) {
        if (existing.id === doc.id) continue;
        if (existing.type !== category) continue;

        const existingMeta = (existing.metadata ?? {}) as Record<
          string,
          unknown
        >;
        const existingExtraction = (existingMeta.extraction ?? {}) as Record<
          string,
          unknown
        >;
        const existingData = (existingExtraction.data ?? {}) as Record<
          string,
          unknown
        >;

        const existingVendor = (existingData.vendorName ??
          existingData.customerName) as string | undefined;
        const existingAmount = existingData.totalAmount as number | undefined;
        const existingDate = (existingData.invoiceDate ?? existingData.date) as
          | string
          | undefined;

        if (
          existingVendor &&
          existingAmount &&
          existingDate &&
          existingVendor.toLowerCase() === vendorName.toLowerCase() &&
          Math.abs(existingAmount - totalAmount) < 0.01 &&
          existingDate === invoiceDate
        ) {
          return {
            isDuplicate: true,
            reason: `Possible duplicate: same vendor (${vendorName}), amount (${totalAmount}), and date (${invoiceDate}) as document "${existing.name}"`,
          };
        }
      }
    }
  }

  return { isDuplicate: false, reason: "" };
}

// ─── Barrel Exports ─────────────────────────────────────────────────────────

export type {
  IngestionState,
  IngestionPipelineResult,
  AccountingTreatment,
  CoaMapping,
  CoaLine,
  ProposedJournalEntry,
  JournalLine,
  IngestionValidation,
  IngestionConfidence,
  IngestionConfidenceSignal,
  PostingDecision,
  ReviewItem,
  PostingResult,
  PropagationResult,
  ResolvedEntities,
  TaxCalculation,
  AccountingWorkflow,
} from "./core/types";

export {
  AccountingWorkflowSchema,
  TransactionSourceSchema,
  TaxTreatmentSchema,
} from "./core/types";

export { computeIngestionConfidence, getReviewItems } from "./core/confidence";
export { determineAccountingTreatment } from "./engine/accounting-treatment";
export {
  mapToChartOfAccounts,
  registerUnmappedAccounts,
} from "./engine/coa-mapper";
export {
  generateJournalEntry,
  postJournalEntry,
} from "./engine/journal-generator";
export {
  decidePosting,
  executePosting,
  checkDuplicate,
} from "./engine/posting-engine";
export { propagatePosting } from "./engine/propagation";
export { resolveEntities } from "./engine/entity-resolution";
export { calculateTax } from "./engine/tax-calculator";
export { runTrustGuard } from "./engine/trust-guard";
export type { TrustGuardCheck, TrustGuardResult } from "./engine/trust-guard";
export { sendIngestionNotifications } from "./engine/notifications";
export {
  updateIngestionStatus,
  updateTerminalStatus,
  transitionToFailed,
  getStageLabel,
  getOrderedStages,
  isTerminalStage,
  getStageNumber,
  isValidTransition,
  PIPELINE_STAGES,
} from "./engine/status-tracker";
export type { PipelineStage } from "./engine/status-tracker";
export { runMonitoringCycle } from "./engine/monitoring-engine";
export type {
  MonitoringReport,
  ReconciliationCheck,
  AnomalyCheck,
  AnomalyItem,
  FraudCheck,
  FraudFlagItem,
  MissingDocumentCheck,
  TrendCheck,
  CashFlowCheck,
} from "./engine/monitoring-engine";

// ─── Intake & Validation ────────────────────────────────────────────────────

export { validateIntake } from "./intake/intake-service";
export { runValidation } from "./intake/validation-layer";
export type {
  IntakeValidationResult,
  IntakeError,
  IntakeWarning,
  IntakeMetadata,
} from "./intake/intake-service";
export type { ValidationFlag } from "./intake/validation-layer";
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZES } from "./intake/intake-service";
export {
  REQUIRED_FIELDS,
  DEFAULT_REVIEW_THRESHOLD,
} from "./intake/validation-layer";

// ─── Period Management ──────────────────────────────────────────────────────

export { executePeriodAction, getPeriodSummary } from "./engine/period-manager";
export type {
  PeriodSummary,
  PeriodActionResult,
  PeriodValidation,
} from "./engine/period-manager";

// ─── General Ledger ─────────────────────────────────────────────────────────

export {
  getAccountBalance,
  getAccountHistory,
  getTrialBalance,
  getJournalEntryDetail,
  getTopMovingAccounts,
  listJournalEntries,
} from "./engine/general-ledger";
export type {
  AccountBalance,
  AccountHistory,
  TopMovingAccount,
  JournalEntryDetail,
} from "./engine/general-ledger";

// ─── AI Financial Assistant ─────────────────────────────────────────────────

export { askFinancialQuestion } from "./engine/financial-assistant";
export type {
  FinancialAssistantResponse,
  FinancialQuestion,
} from "./engine/financial-assistant";
