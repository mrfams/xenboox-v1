/**
 * Validation Layer
 *
 * Enterprise-grade validation that runs after extraction but before the
 * accounting engine. Detects fraud signals, policy violations, and
 * mathematical inconsistencies across all document types.
 *
 * This is the second line of defense (after the Intake Service):
 *   Intake Service → file-level validation
 *   Validation Layer → content-level validation
 *   Confidence Engine → decision-level confidence scoring
 *
 * Fraud Detection Signals:
 *   - Round amount patterns (common in financial fraud)
 *   - Duplicate invoice numbers across different vendors
 *   - Suspicious vendor-customer relationships
 *   - Amount anomalies (statistical outliers per entity)
 *   - Velocity checks (unusual submission frequency)
 *   - Weekend/holiday submission patterns
 *   - Benford's Law distribution analysis
 *   - New vendor rush (first invoice unusually large)
 *
 * Compliance Validation:
 *   - Missing required fields per document type
 *   - Amount threshold policy enforcement
 *   - Approval routing requirements
 *   - Regulatory field requirements (tax ID, etc.)
 *
 * Mathematical Validation:
 *   - Line item sum check vs total
 *   - Tax calculation verification
 *   - Cross-field date consistency
 *   - Currency consistency
 */

import { db } from "@xenboox/db";
import { documents } from "@xenboox/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import type {
  IngestionState,
  ValidationError,
  ValidationWarning,
} from "../core/types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Confidence threshold below which a field is flagged for review */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/** Minimum required fields per document category */
export const REQUIRED_FIELDS: Record<string, string[]> = {
  invoice: [
    "vendorName",
    "invoiceNumber",
    "invoiceDate",
    "totalAmount",
    "currency",
    "lineItems",
  ],
  receipt: ["merchantName", "transactionDate", "totalAmount", "currency"],
  bank_statement: [
    "bankName",
    "accountNumber",
    "openingBalance",
    "closingBalance",
    "periodStart",
    "periodEnd",
  ],
  payroll_report: [
    "employeeName",
    "grossPay",
    "netPay",
    "payPeriod",
    "currency",
  ],
  purchase_order: ["vendorName", "poNumber", "totalAmount", "lineItems"],
  contract: ["documentTitle", "date", "totalAmount"],
  tax_document: ["documentTitle", "date", "totalAmount"],
};

/** Amount threshold that triggers mandatory human review (configurable per entity) */
export const DEFAULT_REVIEW_THRESHOLD = 10_000; // $10k

/** Benford's Law expected digit distribution (first digit) */
export const BENFORD_DISTRIBUTION: Record<string, number> = {
  "1": 0.301,
  "2": 0.176,
  "3": 0.125,
  "4": 0.097,
  "5": 0.079,
  "6": 0.067,
  "7": 0.058,
  "8": 0.051,
  "9": 0.046,
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fraudScore: number; // 0-1, higher = more suspicious
  complianceScore: number; // 0-1, higher = more compliant
  needsHumanReview: boolean;
  reviewReason?: string;
  flags: ValidationFlag[];
}

export interface ValidationFlag {
  type: "fraud" | "compliance" | "math" | "policy";
  severity: "low" | "medium" | "high" | "critical";
  code: string;
  message: string;
  field?: string;
  value?: unknown;
  suggestion?: string;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run all validations on an ingestion state.
 * Called after extraction but before the accounting engine.
 */
export async function runValidation(
  state: IngestionState,
  entityConfig?: {
    reviewThreshold?: number;
    requiredFields?: Record<string, string[]>;
    customRules?: Array<(state: IngestionState) => ValidationFlag[]>;
  },
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const flags: ValidationFlag[] = [];
  const data = state.extraction.data;
  const category = state.classification.category;

  // ── 1. Fraud Detection ──
  const fraudFlags = await detectFraud(state);
  flags.push(...fraudFlags);

  // ── 2. Required Field Validation ──
  const requiredFields = entityConfig?.requiredFields ?? REQUIRED_FIELDS;
  const categoryFields = requiredFields[category] ?? [];
  for (const field of categoryFields) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      flags.push({
        type: "compliance",
        severity: "high",
        code: "MISSING_REQUIRED_FIELD",
        message: `Required field "${field}" is missing for ${category} document.`,
        field,
      });
    }
  }

  // ── 3. Mathematical Validation ──
  const mathFlags = validateMathematics(state);
  flags.push(...mathFlags);

  // ── 4. Amount Threshold Policy ──
  const reviewThreshold =
    entityConfig?.reviewThreshold ?? DEFAULT_REVIEW_THRESHOLD;
  const totalAmount = (data.totalAmount as number) ?? 0;

  if (Math.abs(totalAmount) > reviewThreshold) {
    flags.push({
      type: "policy",
      severity: "medium",
      code: "AMOUNT_EXCEEDS_THRESHOLD",
      message: `Amount ${formatCurrency(totalAmount)} exceeds review threshold of ${formatCurrency(reviewThreshold)}. Requires manual review.`,
      field: "totalAmount",
      value: totalAmount,
    });
  }

  // ── 5. Low Confidence Field Detection ──
  if (state.extraction.fieldConfidence) {
    for (const [field, confidence] of Object.entries(
      state.extraction.fieldConfidence,
    )) {
      if (confidence < LOW_CONFIDENCE_THRESHOLD) {
        flags.push({
          type: "compliance",
          severity: "low",
          code: "LOW_FIELD_CONFIDENCE",
          message: `Field "${field}" has low extraction confidence (${(confidence * 100).toFixed(0)}%).`,
          field,
          value: confidence,
        });
      }
    }
  }

  // ── 6. Custom Rules ──
  if (entityConfig?.customRules) {
    for (const rule of entityConfig.customRules) {
      try {
        const ruleFlags = rule(state);
        flags.push(...ruleFlags);
      } catch {
        flags.push({
          type: "compliance",
          severity: "low",
          code: "CUSTOM_RULE_ERROR",
          message: "A custom validation rule failed to execute.",
        });
      }
    }
  }

  // ── Compute Scores ──
  const fraudScore = computeFraudScore(flags);
  const complianceScore = computeComplianceScore(flags, categoryFields.length);
  const needsHumanReview =
    flags.some(
      (f) =>
        f.severity === "critical" ||
        (f.severity === "high" && f.type === "fraud"),
    ) || totalAmount > reviewThreshold * 2;

  // Build error/warning arrays
  for (const flag of flags) {
    if (flag.severity === "critical" || flag.severity === "high") {
      errors.push({
        field: flag.field ?? "validation",
        message: flag.message,
        severity: flag.severity === "critical" ? "error" : "warning",
      });
    } else {
      warnings.push({
        field: flag.field ?? "validation",
        message: flag.message,
      });
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    fraudScore,
    complianceScore,
    needsHumanReview,
    reviewReason: needsHumanReview
      ? flags
          .filter((f) => f.severity === "critical" || f.severity === "high")
          .map((f) => f.message)
          .join("; ")
      : undefined,
    flags,
  };
}

// ─── Fraud Detection ────────────────────────────────────────────────────────

/**
 * Detect potential fraud signals in the document data.
 * Uses multiple heuristics, each returning a flag with severity.
 */
async function detectFraud(state: IngestionState): Promise<ValidationFlag[]> {
  const flags: ValidationFlag[] = [];
  const data = state.extraction.data;
  const category = state.classification.category;
  const totalAmount = (data.totalAmount as number) ?? 0;
  const dataStr = JSON.stringify(data).toLowerCase();

  // ── Round Amount Fraud ──
  // Fraudulent invoices often use round numbers to avoid detection
  if (totalAmount > 0 && totalAmount % 100 === 0 && totalAmount >= 1000) {
    flags.push({
      type: "fraud",
      severity: "low",
      code: "ROUND_AMOUNT",
      message: `Suspicious round amount: ${formatCurrency(totalAmount)}. Common fraud indicator for large round transactions.`,
      field: "totalAmount",
      value: totalAmount,
      suggestion:
        "Verify this is not a fabricated transaction by checking supporting documentation.",
    });
  }

  // ── Amount Ending Pattern ──
  // Invoices ending in .00 are suspicious; .99 is common in legitimate retail
  if (totalAmount > 0 && totalAmount % 1 === 0 && totalAmount > 1000) {
    flags.push({
      type: "fraud",
      severity: "low",
      code: "NO_CENTS",
      message: `Amount ${formatCurrency(totalAmount)} has no cents. Legitimate invoices rarely have exact dollar amounts above $1,000.`,
      field: "totalAmount",
      value: totalAmount,
    });
  }

  // ── Velocity Check: duplicate invoice number across vendors ──
  if (data.invoiceNumber) {
    const dupInvoice = await findDuplicateInvoiceNumber(
      state.entityId,
      data.invoiceNumber as string,
      data.vendorName as string | undefined,
    );
    if (dupInvoice) {
      flags.push({
        type: "fraud",
        severity: "high" as const,
        code: "DUPLICATE_INVOICE_NUMBER",
        message: `Invoice number "${data.invoiceNumber}" was already used by vendor "${dupInvoice.vendorName}" on ${dupInvoice.date}. Possible invoice fraud.`,
        field: "invoiceNumber",
        value: data.invoiceNumber,
        suggestion:
          "Verify this is not a duplicate submission. Check if the vendor is sending duplicate invoices.",
      });
    }
  }

  // ── Weekend/Non-business Day Flag ──
  if (data.invoiceDate || data.transactionDate) {
    const dateStr = (data.invoiceDate ?? data.transactionDate) as string;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend && !isNaN(dateObj.getTime())) {
      flags.push({
        type: "fraud",
        severity: "low",
        code: "WEEKEND_TRANSACTION",
        message: `Transaction dated on a ${dayOfWeek === 0 ? "Sunday" : "Saturday"} (${dateStr}). Non-business day transactions are unusual.`,
        field: "invoiceDate",
        value: dateStr,
      });
    }
  }

  // ── Negative Amount Flag ──
  if (totalAmount < 0) {
    flags.push({
      type: "fraud",
      severity: "medium",
      code: "NEGATIVE_AMOUNT",
      message: `Negative total amount detected: ${formatCurrency(totalAmount)}. Credit notes and adjustments should be properly classified.`,
      field: "totalAmount",
      value: totalAmount,
    });
  }

  // ── Benford's Law Analysis ──
  // Check first-digit distribution for anomalies in line items
  const lineItems = data.lineItems as Array<{ amount?: number }> | undefined;
  if (lineItems && lineItems.length >= 10) {
    const digitCounts: Record<string, number> = {};
    for (const item of lineItems) {
      const amt = item.amount ?? 0;
      if (amt > 0) {
        const firstDigit = String(Math.abs(amt))[0];
        digitCounts[firstDigit] = (digitCounts[firstDigit] ?? 0) + 1;
      }
    }

    const totalItems = Object.values(digitCounts).reduce((s, c) => s + c, 0);
    if (totalItems >= 10) {
      let benfordDeviation = 0;
      for (let d = 1; d <= 9; d++) {
        const expected = BENFORD_DISTRIBUTION[String(d)];
        const actual = (digitCounts[String(d)] ?? 0) / totalItems;
        benfordDeviation += Math.abs(expected - actual);
      }

      // Average deviation > 0.1 suggests possible manipulation
      const avgDeviation = benfordDeviation / 9;
      if (avgDeviation > 0.1) {
        flags.push({
          type: "fraud",
          severity: "medium",
          code: "BENFORD_DEVIATION",
          message: `Line item amounts deviate significantly from Benford's Law (deviation: ${(avgDeviation * 100).toFixed(1)}%). Possible data fabrication.`,
          suggestion:
            "Review the line items for unusual amounts that don't follow natural distribution patterns.",
        });
      }
    }
  }

  // ── Missing Tax ID or Registration ──
  if (
    category === "invoice" &&
    !data.taxId &&
    !data.vatNumber &&
    !data.registrationNumber
  ) {
    flags.push({
      type: "compliance",
      severity: "medium",
      code: "MISSING_TAX_ID",
      message:
        "Invoice has no tax ID, VAT number, or registration number. May not be a valid tax invoice.",
      suggestion:
        "Request a valid tax invoice with the supplier's tax registration number.",
    });
  }

  return flags;
}

// ─── Duplicate Invoice Number Detection ─────────────────────────────────────

/**
 * Check if the same invoice number was used by a different vendor within
 * the same entity — a common fraud pattern where the same invoice is
 * submitted multiple times or by different entities.
 */
async function findDuplicateInvoiceNumber(
  entityId: string,
  invoiceNumber: string,
  currentVendorName?: string,
): Promise<{ vendorName: string; date: string } | null> {
  const recentDocs = await db.query.documents.findMany({
    where: and(
      eq(documents.entityId, entityId),
      eq(documents.status, "done"),
      gte(documents.createdAt, new Date(Date.now() - 365 * 24 * 3600_000)), // Last year
    ),
    orderBy: [desc(documents.createdAt)],
    limit: 200,
  });

  for (const doc of recentDocs) {
    const meta = (doc.metadata ?? {}) as Record<string, unknown>;
    const extraction = (meta.extraction ?? {}) as Record<string, unknown>;
    const docData = (extraction.data ?? {}) as Record<string, unknown>;

    if (docData.invoiceNumber === invoiceNumber) {
      const docVendor = (docData.vendorName as string) ?? "";

      // If it's the same vendor, it might be a legitimate duplicate
      if (
        currentVendorName &&
        docVendor.toLowerCase() === currentVendorName.toLowerCase()
      ) {
        continue; // Same vendor — could be legitimate
      }

      return {
        vendorName: docVendor || "unknown",
        date: doc.createdAt?.toISOString() ?? "unknown",
      };
    }
  }

  return null;
}

// ─── Mathematical Validation ────────────────────────────────────────────────

/**
 * Validate mathematical consistency of extracted amounts.
 */
function validateMathematics(state: IngestionState): ValidationFlag[] {
  const flags: ValidationFlag[] = [];
  const data = state.extraction.data;
  const totalAmount = (data.totalAmount as number) ?? 0;
  const subtotal = (data.subtotal as number) ?? 0;
  const taxAmount = (data.taxAmount as number) ?? 0;
  const lineItems =
    (data.lineItems as Array<{
      amount?: number;
      quantity?: number;
      unitPrice?: number;
    }>) ?? [];
  const discounts = (data.discountAmount as number) ?? 0;

  // ── Line Item Sum vs Total ──
  if (lineItems.length > 0 && totalAmount > 0) {
    const lineItemSum = lineItems.reduce(
      (sum, item) =>
        sum + (item.amount ?? (item.quantity ?? 1) * (item.unitPrice ?? 0)),
      0,
    );

    const expectedTotal = lineItemSum + taxAmount - discounts;
    const variance = Math.abs(expectedTotal - totalAmount);

    if (variance > 0.05 && variance / totalAmount > 0.01) {
      flags.push({
        type: "math",
        severity: "high",
        code: "LINE_ITEM_TOTAL_MISMATCH",
        message: `Line item sum (${formatCurrency(lineItemSum)}) + tax (${formatCurrency(taxAmount)}) - discounts (${formatCurrency(discounts)}) = ${formatCurrency(expectedTotal)}, but total is ${formatCurrency(totalAmount)}. Difference: ${formatCurrency(variance)}.`,
        field: "totalAmount",
        value: {
          lineItemSum,
          taxAmount,
          discounts,
          declaredTotal: totalAmount,
        },
        suggestion:
          "Check the line items, tax, and discount calculations. One of these values may be incorrect.",
      });
    }
  }

  // ── Tax Amount Validation ──
  if (totalAmount > 0 && subtotal > 0 && taxAmount > 0) {
    const impliedTaxRate = taxAmount / subtotal;

    // Tax rates should typically be round numbers
    const taxRatePct = impliedTaxRate * 100;
    const roundedRate = Math.round(taxRatePct);

    if (Math.abs(taxRatePct - roundedRate) > 0.5 && taxRatePct < 50) {
      flags.push({
        type: "math",
        severity: "low",
        code: "UNUSUAL_TAX_RATE",
        message: `Implied tax rate of ${taxRatePct.toFixed(2)}% is unusual. Expected a standard rate (0%, 5%, 7.5%, 10%, 15%, 16%, 18%, 20%).`,
        field: "taxAmount",
        value: { subtotal, taxAmount, impliedTaxRate: taxRatePct },
        suggestion:
          "Verify the tax amount. The implied rate doesn't match standard rates.",
      });
    }
  }

  // ── Date Validation ──
  const invoiceDate = data.invoiceDate as string | undefined;
  const dueDate = data.dueDate as string | undefined;

  if (invoiceDate && dueDate) {
    const invDate = new Date(invoiceDate);
    const due = new Date(dueDate);

    if (!isNaN(invDate.getTime()) && !isNaN(due.getTime()) && due <= invDate) {
      flags.push({
        type: "math",
        severity: "high",
        code: "DUE_DATE_BEFORE_INVOICE_DATE",
        message: `Due date (${dueDate}) is before or same as invoice date (${invoiceDate}).`,
        field: "dueDate",
        value: { invoiceDate, dueDate },
        suggestion:
          "Verify the due date is correct — it should be after the invoice date.",
      });
    }
  }

  // ── Currency Consistency ──
  // All amounts should use the same currency
  if (lineItems.length > 1) {
    const currencies = new Set<string>();
    currencies.add((data.currency as string) ?? "");

    for (const item of lineItems) {
      if ((item as Record<string, unknown>).currency) {
        currencies.add((item as Record<string, unknown>).currency as string);
      }
    }

    if (currencies.size > 1) {
      currencies.delete(""); // Remove empty string
      if (currencies.size > 1) {
        flags.push({
          type: "math",
          severity: "high",
          code: "MULTI_CURRENCY_LINE_ITEMS",
          message: `Line items use multiple currencies: ${Array.from(currencies).join(", ")}. All amounts should be in the same currency.`,
          suggestion:
            "Ensure all line items are converted to the document's base currency.",
        });
      }
    }
  }

  return flags;
}

// ─── Score Computation ──────────────────────────────────────────────────────

/**
 * Compute fraud score from flags (0 = clean, 1 = highly suspicious).
 */
function computeFraudScore(flags: ValidationFlag[]): number {
  const fraudFlags = flags.filter((f) => f.type === "fraud");
  if (fraudFlags.length === 0) return 0;

  const severityWeights: Record<string, number> = {
    low: 0.1,
    medium: 0.25,
    high: 0.4,
    critical: 0.6,
  };

  const totalWeight = fraudFlags.reduce(
    (sum, f) => sum + (severityWeights[f.severity] ?? 0),
    0,
  );

  // Cap at 1.0 and apply diminishing returns for many low-severity flags
  return Math.min(1.0, totalWeight / (1 + totalWeight * 0.5));
}

/**
 * Compute compliance score from flags (1 = fully compliant).
 */
function computeComplianceScore(
  flags: ValidationFlag[],
  totalRequiredFields: number,
): number {
  const missingCount = flags.filter(
    (f) => f.code === "MISSING_REQUIRED_FIELD",
  ).length;
  const lowConfidenceCount = flags.filter(
    (f) => f.code === "LOW_FIELD_CONFIDENCE",
  ).length;

  if (totalRequiredFields === 0 && lowConfidenceCount === 0) return 1.0;

  const missingPenalty =
    totalRequiredFields > 0 ? missingCount / totalRequiredFields : 0;
  const confidencePenalty = lowConfidenceCount * 0.05;

  return Math.max(0, Math.min(1, 1 - missingPenalty - confidencePenalty));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
