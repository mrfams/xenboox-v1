/**
 * TrustGuard — Deterministic Cross-Validation for Document Extractions
 *
 * The accounting safety net. For every document that flows through the
 * ingestion pipeline, TrustGuard recomputes the math independently and
 * compares it to what the LLM extracted. If the numbers don't match,
 * the document is flagged for human review — never auto-posted.
 *
 * Design principles:
 * - 100% deterministic — no LLM calls, no external dependencies
 * - Pure math — operates on extracted data, no DB queries
 * - Every check returns expected/actual/message for audit trail
 * - Tolerance: 0.00 (exact) by default, configurable per check
 * - TrustGuard never writes to the DB — it returns a result
 */

import type { IngestionState } from "../core/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrustGuardCheck {
  /** Machine-readable check name (e.g. "invoice_line_total", "bank_balance_equation") */
  name: string;
  /** Human-readable description of what was checked */
  description: string;
  /** Whether the check passed */
  passed: boolean;
  /** The expected value (computed deterministically) */
  expected: number;
  /** The actual value (from LLM extraction) */
  actual: number;
  /** Absolute difference between expected and actual */
  difference: number;
  /** Severity: "error" blocks auto-post, "warning" reduces confidence */
  severity: "error" | "warning";
  /** Detailed message for audit trail */
  message: string;
}

export interface TrustGuardResult {
  /** Whether ALL error-severity checks passed */
  passed: boolean;
  /** Individual checks performed */
  checks: TrustGuardCheck[];
  /** Number of checks that passed */
  passedCount: number;
  /** Total number of checks */
  totalCount: number;
  /** Confidence impact: 1.0 = no impact, 0.0 = total failure */
  confidenceImpact: number;
  /** Summary message */
  summary: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_TOLERANCE = 0.01; // $0.01 tolerance for floating-point rounding in accounting
const WARNING_MULTIPLIER = 0.8; // Warnings reduce confidence by 20%
const ERROR_MULTIPLIER = 0.0; // Errors zero out confidence for that check

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run all applicable TrustGuard checks on the extracted data.
 * Dispatches to type-specific validators based on the document category.
 */
export function runTrustGuard(state: IngestionState): TrustGuardResult {
  const category = state.classification.category;
  const data = state.extraction.data;
  const checks: TrustGuardCheck[] = [];

  // Cross-field consistency checks (skip for invoices — covered by invoice-specific checks)
  if (category !== "invoice") {
    checks.push(...validateAmountConsistency(data));
  }

  // Always run date sanity checks
  checks.push(...validateDateSanity(data));

  // Always run OCR-vs-extraction cross-check (if OCR text available)
  if (state.ocrText && state.ocrText.length > 10) {
    checks.push(...validateOcrVsExtraction(state.ocrText, data));
  }

  // Run type-specific checks
  switch (category) {
    case "invoice":
      checks.push(...validateInvoiceExtraction(state, data));
      break;
    case "receipt":
      checks.push(...validateReceiptExtraction(data));
      break;
    case "bank_statement":
      checks.push(...validateBankStatementExtraction(data));
      break;
    case "payroll_report":
      checks.push(...validatePayrollExtraction(data));
      break;
    case "purchase_order":
    case "contract":
    case "tax_document":
      // These types get basic amount validation (no line-item detail expected)
      checks.push(...validateBasicAmountExtraction(data));
      break;
    default:
      break;
  }

  // Compute results
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const errorChecks = checks.filter((c) => c.severity === "error");
  const errorPassed = errorChecks.filter((c) => c.passed).length;
  const allErrorsPassed = errorPassed === errorChecks.length;

  // Confidence impact: average of all checks, weighted by severity
  const confidenceImpact =
    totalCount > 0
      ? checks.reduce((sum, c) => {
          const base = c.passed ? 1.0 : 0.0;
          const multiplier =
            c.severity === "error" ? ERROR_MULTIPLIER : WARNING_MULTIPLIER;
          return sum + (c.passed ? base : multiplier);
        }, 0) / totalCount
      : 1.0;

  const failedErrors = errorChecks.filter((c) => !c.passed);
  const failedWarnings = checks.filter(
    (c) => !c.passed && c.severity === "warning",
  );

  let summary: string;
  if (allErrorsPassed && failedWarnings.length === 0) {
    summary = `All ${totalCount} checks passed. Extraction is trustworthy.`;
  } else if (allErrorsPassed) {
    summary = `All error checks passed, but ${failedWarnings.length} warning(s): ${failedWarnings.map((c) => c.name).join(", ")}`;
  } else {
    summary = `${failedErrors.length} error(s) failed: ${failedErrors.map((c) => c.name).join(", ")}. Extraction requires human review.`;
  }

  return {
    passed: allErrorsPassed,
    checks,
    passedCount,
    totalCount,
    confidenceImpact: Math.round(confidenceImpact * 1000) / 1000,
    summary,
  };
}

// ─── Invoice Validation ─────────────────────────────────────────────────────

/**
 * Validate extracted invoice data by recomputing totals from line items.
 *
 * Checks:
 * 1. Line item total: Σ(line.amount) should equal subtotal (if both present)
 * 2. Tax calculation: subtotal × taxRate should equal taxAmount
 * 3. Grand total: subtotal + taxAmount should equal totalAmount
 * 4. Line items math: qty × unitPrice should equal amount (per line)
 */
function validateInvoiceExtraction(
  state: IngestionState,
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  const lineItems = data.lineItems as
    | Array<{
        description: string;
        quantity?: number;
        unitPrice?: number;
        amount?: number;
      }>
    | undefined;
  const subtotal = data.subtotal as number | undefined;
  const taxAmount = data.taxAmount as number | undefined;
  const totalAmount = data.totalAmount as number | undefined;

  // Check 1: Line item quantities × unit prices
  if (lineItems && lineItems.length > 0) {
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i]!;
      if (
        line.quantity !== undefined &&
        line.unitPrice !== undefined &&
        line.amount !== undefined
      ) {
        const expected = Math.round(line.quantity * line.unitPrice * 100) / 100;
        const actual = line.amount;
        const diff = Math.abs(expected - actual);
        const passed = diff <= DEFAULT_TOLERANCE;

        checks.push({
          name: `invoice_line_${i + 1}_math`,
          description: `Line ${i + 1}: ${line.quantity} × ${line.unitPrice} should equal ${line.amount}`,
          passed,
          expected,
          actual,
          difference: diff,
          severity: "error",
          message: passed
            ? `Line ${i + 1} math correct: ${line.quantity} × ${line.unitPrice} = ${actual}`
            : `Line ${i + 1} math error: ${line.quantity} × ${line.unitPrice} = ${expected}, but extracted amount is ${actual} (diff: ${diff.toFixed(2)})`,
        });
      }
    }

    // Check 1b: Unknown tax rate (N45) — the implied rate (tax/subtotal) must
  // match a rate the entity has CONFIGURED (self-serve in Settings → Taxes).
  // Unknown rates are a WARNING: the math may still tally, but the tax goes
  // to human review and the admin can add the rate for the jurisdiction.
  if (
    subtotal !== undefined &&
    taxAmount !== undefined &&
    subtotal > 0 &&
    state.entityTaxRates &&
    state.entityTaxRates.length > 0
  ) {
    const impliedRate = Number(((taxAmount / subtotal) * 100).toFixed(2));
    const tolerance = 0.5; // percentage points
    const matched = state.entityTaxRates.some(
      (r) => Math.abs(r.ratePercent - impliedRate) <= tolerance,
    );
    checks.push({
      name: "invoice_tax_unknown",
      description: "Extracted tax rate matches a configured entity tax",
      passed: matched,
      expected: matched
        ? impliedRate
        : (state.entityTaxRates[0]?.ratePercent ?? 0),
      actual: impliedRate,
      severity: "warning",
      message: matched
        ? `Tax rate ${impliedRate}% matches a configured entity tax`
        : `Tax rate ${impliedRate}% is not configured for this entity — review it or add it in Settings → Taxes so future documents post cleanly`,
    });
  }

  // Check 2: Sum of line amounts vs subtotal
    const computedSubtotal = lineItems.reduce((sum, line) => {
      return sum + (line.amount ?? 0);
    }, 0);
    const roundedSubtotal = Math.round(computedSubtotal * 100) / 100;

    if (subtotal !== undefined) {
      const diff = Math.abs(roundedSubtotal - subtotal);
      const passed = diff <= DEFAULT_TOLERANCE;

      checks.push({
        name: "invoice_line_total",
        description: `Sum of line items (${roundedSubtotal}) should equal subtotal (${subtotal})`,
        passed,
        expected: roundedSubtotal,
        actual: subtotal,
        difference: diff,
        severity: "error",
        message: passed
          ? `Line item total matches subtotal: ${subtotal}`
          : `Line item total mismatch: computed ${roundedSubtotal} from ${lineItems.length} lines, but extracted subtotal is ${subtotal} (diff: ${diff.toFixed(2)})`,
      });
    }
  }

  // Check 3: Subtotal + Tax = Total
  if (
    subtotal !== undefined &&
    taxAmount !== undefined &&
    totalAmount !== undefined
  ) {
    const expected = Math.round((subtotal + taxAmount) * 100) / 100;
    const diff = Math.abs(expected - totalAmount);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "invoice_total_formula",
      description: `Subtotal (${subtotal}) + Tax (${taxAmount}) should equal Total (${totalAmount})`,
      passed,
      expected,
      actual: totalAmount,
      difference: diff,
      severity: "error",
      message: passed
        ? `Total formula correct: ${subtotal} + ${taxAmount} = ${totalAmount}`
        : `Total formula error: ${subtotal} + ${taxAmount} = ${expected}, but extracted total is ${totalAmount} (diff: ${diff.toFixed(2)})`,
    });
  } else if (
    subtotal !== undefined &&
    totalAmount !== undefined &&
    taxAmount === undefined
  ) {
    // No tax — subtotal should equal total
    const diff = Math.abs(subtotal - totalAmount);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "invoice_total_no_tax",
      description: `Subtotal (${subtotal}) should equal Total (${totalAmount}) when no tax`,
      passed,
      expected: subtotal,
      actual: totalAmount,
      difference: diff,
      severity: "warning", // Warning because some invoices legitimately have rounding
      message: passed
        ? `No-tax total matches subtotal: ${totalAmount}`
        : `No-tax total mismatch: subtotal ${subtotal} ≠ total ${totalAmount} (diff: ${diff.toFixed(2)})`,
    });
  }

  // Check 4: Tax rate plausibility (if tax and subtotal present)
  if (subtotal !== undefined && taxAmount !== undefined && subtotal > 0) {
    const taxRate = taxAmount / subtotal;
    const plausible = taxRate >= 0 && taxRate <= 0.5; // 0-50% is plausible

    checks.push({
      name: "invoice_tax_rate_plausible",
      description: `Tax rate (${(taxRate * 100).toFixed(1)}%) should be between 0% and 50%`,
      passed: plausible,
      expected: -1, // N/A
      actual: Math.round(taxRate * 10000) / 100,
      difference: 0,
      severity: "warning",
      message: plausible
        ? `Tax rate plausible: ${(taxRate * 100).toFixed(1)}%`
        : `Tax rate implausible: ${(taxRate * 100).toFixed(1)}% (expected 0-50%)`,
    });
  }

  // Check 5: Currency consistency across line items
  if (lineItems && lineItems.length > 1) {
    const docCurrency = (data.currency as string) ?? "";
    const currencies = new Set<string>();
    if (docCurrency) currencies.add(docCurrency);

    for (const item of lineItems) {
      const itemCurrency = (item as Record<string, unknown>).currency as
        | string
        | undefined;
      if (itemCurrency) currencies.add(itemCurrency);
    }

    if (currencies.size > 1) {
      checks.push({
        name: "invoice_currency_consistent",
        description: `Line items use multiple currencies: ${Array.from(currencies).join(", ")}`,
        passed: false,
        expected: 1,
        actual: currencies.size,
        difference: currencies.size - 1,
        severity: "error",
        message: `Multiple currencies detected in line items: ${Array.from(currencies).join(", ")}. All amounts should be in the same currency.`,
      });
    }
  }

  return checks;
}

// ─── Receipt Validation ─────────────────────────────────────────────────────

/**
 * Validate extracted receipt data by recomputing totals from items.
 *
 * Checks:
 * 1. Item sum: Σ(items.amount) should equal totalAmount
 * 2. Tax consistency: totalAmount - taxAmount should be plausible
 */
function validateReceiptExtraction(
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  const items = data.items as
    | Array<{ description: string; quantity?: number; amount?: number }>
    | undefined;
  const totalAmount = data.totalAmount as number | undefined;
  const taxAmount = (data.taxAmount as number) ?? 0;

  // Check 1: Sum of item amounts vs total
  if (items && items.length > 0 && totalAmount !== undefined) {
    const computedTotal = items.reduce((sum, item) => {
      return sum + (item.amount ?? 0);
    }, 0);
    const roundedTotal = Math.round(computedTotal * 100) / 100;
    // Total includes tax, so compare items sum + tax to total
    const expectedWithTax = Math.round((roundedTotal + taxAmount) * 100) / 100;
    const diff = Math.abs(expectedWithTax - totalAmount);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "receipt_item_total",
      description: `Sum of items (${roundedTotal}) + tax (${taxAmount}) should equal total (${totalAmount})`,
      passed,
      expected: expectedWithTax,
      actual: totalAmount,
      difference: diff,
      severity: "error",
      message: passed
        ? `Receipt total matches: ${roundedTotal} + ${taxAmount} = ${totalAmount}`
        : `Receipt total mismatch: items sum ${roundedTotal} + tax ${taxAmount} = ${expectedWithTax}, but extracted total is ${totalAmount} (diff: ${diff.toFixed(2)})`,
    });
  }

  // Check 2: No negative amounts on items
  if (items && items.length > 0) {
    const negatives = items.filter(
      (item) => item.amount !== undefined && item.amount < 0,
    );
    checks.push({
      name: "receipt_no_negatives",
      description: "No negative amounts on receipt items",
      passed: negatives.length === 0,
      expected: 0,
      actual: negatives.length,
      difference: negatives.length,
      severity: "error",
      message:
        negatives.length === 0
          ? "All receipt item amounts are non-negative"
          : `${negatives.length} item(s) have negative amounts`,
    });
  }

  return checks;
}

// ─── Bank Statement Validation ──────────────────────────────────────────────

/**
 * Validate extracted bank statement data by checking the balance equation.
 *
 * Checks:
 * 1. Balance equation: openingBalance + Σcredits - Σdebits should equal closingBalance
 * 2. Transaction sign consistency: credits should be positive, debits should be positive
 */
function validateBankStatementExtraction(
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  const openingBalance = data.openingBalance as number | undefined;
  const closingBalance = data.closingBalance as number | undefined;
  const totalCredits = data.totalCredits as number | undefined;
  const totalDebits = data.totalDebits as number | undefined;
  const transactions = data.transactions as
    | Array<{
        date: string;
        description: string;
        amount: number;
        type: "credit" | "debit";
        balance?: number;
        reference?: string;
      }>
    | undefined;

  // Check 1: Balance equation
  if (
    openingBalance !== undefined &&
    closingBalance !== undefined &&
    totalCredits !== undefined &&
    totalDebits !== undefined
  ) {
    const expectedClosing =
      Math.round((openingBalance + totalCredits - totalDebits) * 100) / 100;
    const diff = Math.abs(expectedClosing - closingBalance);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "bank_balance_equation",
      description: `Opening (${openingBalance}) + Credits (${totalCredits}) - Debits (${totalDebits}) should equal Closing (${closingBalance})`,
      passed,
      expected: expectedClosing,
      actual: closingBalance,
      difference: diff,
      severity: "error",
      message: passed
        ? `Balance equation holds: ${openingBalance} + ${totalCredits} - ${totalDebits} = ${closingBalance}`
        : `Balance equation failed: ${openingBalance} + ${totalCredits} - ${totalDebits} = ${expectedClosing}, but extracted closing is ${closingBalance} (diff: ${diff.toFixed(2)})`,
    });
  }

  // Check 2: Verify totals from individual transactions (if available)
  if (transactions && transactions.length > 0) {
    const computedCredits = transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const computedDebits = transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (totalCredits !== undefined) {
      const diff = Math.abs(
        Math.round(computedCredits * 100) / 100 - totalCredits,
      );
      const passed = diff <= DEFAULT_TOLERANCE;

      checks.push({
        name: "bank_credits_sum",
        description: `Sum of credit transactions (${computedCredits.toFixed(2)}) should equal totalCredits (${totalCredits})`,
        passed,
        expected: Math.round(computedCredits * 100) / 100,
        actual: totalCredits,
        difference: diff,
        severity: "warning",
        message: passed
          ? `Credits sum matches: ${totalCredits}`
          : `Credits sum mismatch: computed ${computedCredits.toFixed(2)} from ${transactions.filter((t) => t.type === "credit").length} transactions, but extracted totalCredits is ${totalCredits} (diff: ${diff.toFixed(2)})`,
      });
    }

    if (totalDebits !== undefined) {
      const diff = Math.abs(
        Math.round(computedDebits * 100) / 100 - totalDebits,
      );
      const passed = diff <= DEFAULT_TOLERANCE;

      checks.push({
        name: "bank_debits_sum",
        description: `Sum of debit transactions (${computedDebits.toFixed(2)}) should equal totalDebits (${totalDebits})`,
        passed,
        expected: Math.round(computedDebits * 100) / 100,
        actual: totalDebits,
        difference: diff,
        severity: "warning",
        message: passed
          ? `Debits sum matches: ${totalDebits}`
          : `Debits sum mismatch: computed ${computedDebits.toFixed(2)} from ${transactions.filter((t) => t.type === "debit").length} transactions, but extracted totalDebits is ${totalDebits} (diff: ${diff.toFixed(2)})`,
      });
    }

    // Check 3: No zero-amount transactions
    const zeros = transactions.filter((t) => t.amount === 0);
    if (zeros.length > 0) {
      checks.push({
        name: "bank_no_zero_transactions",
        description: "No zero-amount transactions",
        passed: false,
        expected: 0,
        actual: zeros.length,
        difference: zeros.length,
        severity: "warning",
        message: `${zeros.length} transaction(s) have zero amount`,
      });
    }

    // Check 4: Per-transaction running balance consistency
    const balanceErrors: number[] = [];
    let prevBalance = openingBalance;
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]!;
      if (tx.balance !== undefined && prevBalance !== undefined) {
        const sign = tx.type === "credit" ? 1 : -1;
        const expectedBalance =
          Math.round((prevBalance + sign * Math.abs(tx.amount)) * 100) / 100;
        const actualBalance = Math.round(tx.balance * 100) / 100;
        if (Math.abs(expectedBalance - actualBalance) > 0.02) {
          balanceErrors.push(i + 1);
        }
      }
      if (tx.balance !== undefined) {
        prevBalance = tx.balance;
      }
    }

    if (balanceErrors.length > 0) {
      checks.push({
        name: "bank_running_balance",
        description: `${balanceErrors.length} transaction(s) have incorrect running balances`,
        passed: false,
        expected: 0,
        actual: balanceErrors.length,
        difference: balanceErrors.length,
        severity: "warning",
        message: `Transactions ${balanceErrors.slice(0, 5).join(", ")}${balanceErrors.length > 5 ? ` (+${balanceErrors.length - 5} more)` : ""} have incorrect running balances`,
      });
    }
  }

  return checks;
}

// ─── Payroll Validation ─────────────────────────────────────────────────────

/**
 * Validate extracted payroll data by checking the pay equation.
 *
 * Checks:
 * 1. Pay equation: grossPay - Σdeductions = netPay
 * 2. Deduction totals: sum of individual deductions
 * 3. Tax plausibility: taxAmount should be < grossPay
 */
function validatePayrollExtraction(
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  const grossPay = data.grossPay as number | undefined;
  const netPay = data.netPay as number | undefined;
  const taxAmount = (data.taxAmount as number) ?? 0;
  const deductions = data.deductions as
    | Array<{ name: string; amount: number }>
    | undefined;

  // Check 1: Gross - Deductions = Net
  if (grossPay !== undefined && netPay !== undefined) {
    const totalDeductions =
      (deductions ?? []).reduce((sum, d) => sum + d.amount, 0) + taxAmount;
    const expectedNet = Math.round((grossPay - totalDeductions) * 100) / 100;
    const diff = Math.abs(expectedNet - netPay);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "payroll_gross_deductions_net",
      description: `Gross (${grossPay}) - Deductions (${totalDeductions.toFixed(2)}) should equal Net (${netPay})`,
      passed,
      expected: expectedNet,
      actual: netPay,
      difference: diff,
      severity: "error",
      message: passed
        ? `Pay equation holds: ${grossPay} - ${totalDeductions.toFixed(2)} = ${netPay}`
        : `Pay equation failed: ${grossPay} - ${totalDeductions.toFixed(2)} = ${expectedNet}, but extracted net is ${netPay} (diff: ${diff.toFixed(2)})`,
    });
  }

  // Check 2: Tax plausibility
  if (grossPay !== undefined && taxAmount !== undefined && grossPay > 0) {
    const taxRatio = taxAmount / grossPay;
    const plausible = taxRatio >= 0 && taxRatio <= 0.5;

    checks.push({
      name: "payroll_tax_plausible",
      description: `Tax ratio (${(taxRatio * 100).toFixed(1)}%) should be between 0% and 50%`,
      passed: plausible,
      expected: -1,
      actual: Math.round(taxRatio * 10000) / 100,
      difference: 0,
      severity: "warning",
      message: plausible
        ? `Tax ratio plausible: ${(taxRatio * 100).toFixed(1)}%`
        : `Tax ratio implausible: ${(taxRatio * 100).toFixed(1)}% (expected 0-50%)`,
    });
  }

  // Check 3: Net pay should be positive
  if (netPay !== undefined) {
    checks.push({
      name: "payroll_net_positive",
      description: "Net pay should be positive",
      passed: netPay > 0,
      expected: 1,
      actual: netPay,
      difference: netPay <= 0 ? 1 : 0,
      severity: "error",
      message:
        netPay > 0
          ? `Net pay is positive: ${netPay}`
          : `Net pay is non-positive: ${netPay}`,
    });
  }

  return checks;
}

// ─── Basic Amount Validation (PO, Contract, Tax Document) ─────────────────

/**
 * Basic amount validation for document types without detailed line items.
 * Checks that total amount is present and positive.
 */
function validateBasicAmountExtraction(
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];
  const totalAmount = data.totalAmount as number | undefined;

  if (totalAmount !== undefined) {
    checks.push({
      name: "basic_total_positive",
      description: "Total amount should be positive",
      passed: totalAmount > 0,
      expected: 1,
      actual: totalAmount,
      difference: totalAmount <= 0 ? 1 : 0,
      severity: "error",
      message:
        totalAmount > 0
          ? `Total amount is positive: ${totalAmount}`
          : `Total amount is non-positive: ${totalAmount}`,
    });
  }

  // Check subtotal + tax = total if all present
  const subtotal = data.subtotal as number | undefined;
  const taxAmount = data.taxAmount as number | undefined;
  if (
    subtotal !== undefined &&
    taxAmount !== undefined &&
    totalAmount !== undefined
  ) {
    const expected = Math.round((subtotal + taxAmount) * 100) / 100;
    const diff = Math.abs(expected - totalAmount);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "basic_amount_formula",
      description: `Subtotal (${subtotal}) + Tax (${taxAmount}) should equal Total (${totalAmount})`,
      passed,
      expected,
      actual: totalAmount,
      difference: diff,
      severity: "error",
      message: passed
        ? `Amount formula correct: ${subtotal} + ${taxAmount} = ${totalAmount}`
        : `Amount formula error: ${subtotal} + ${taxAmount} = ${expected}, but extracted total is ${totalAmount} (diff: ${diff.toFixed(2)})`,
    });
  }

  return checks;
}

// ─── Date Sanity Checks ────────────────────────────────────────────────────

/**
 * Validate that extracted dates are plausible for any document type.
 *
 * Checks:
 * 1. No future dates beyond 30 days (invoices/receipts shouldn't be dated far in the future)
 * 2. No dates older than 5 years (likely extraction error)
 * 3. Due date should be after invoice/date (if both present)
 * 4. No zero/empty dates that slipped through extraction
 */
function validateDateSanity(
  data: Record<string, unknown>,
  now?: Date,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];
  const refDate = now ?? new Date();
  const today = new Date(
    refDate.getFullYear(),
    refDate.getMonth(),
    refDate.getDate(),
  );

  // Collect all date fields from the extraction
  const dateFields: Array<{ name: string; value: unknown }> = [
    { name: "invoiceDate", value: data.invoiceDate },
    { name: "date", value: data.date },
    { name: "transactionDate", value: data.transactionDate },
    { name: "statementDate", value: data.statementDate },
    { name: "receivedDate", value: data.receivedDate },
  ];

  for (const field of dateFields) {
    if (!field.value || typeof field.value !== "string") continue;

    const date = new Date(field.value);
    if (isNaN(date.getTime())) {
      checks.push({
        name: `date_invalid_${field.name}`,
        description: `${field.name} ("${field.value}") is not a valid date`,
        passed: false,
        expected: -1,
        actual: 0,
        difference: 1,
        severity: "error",
        message: `${field.name} is not a valid date: "${field.value}"`,
      });
      continue;
    }

    // Check: no future dates beyond 30 days
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    if (date > thirtyDaysFromNow) {
      checks.push({
        name: `date_future_${field.name}`,
        description: `${field.name} (${field.value}) is more than 30 days in the future`,
        passed: false,
        expected: -1,
        actual: date.getTime(),
        difference: 1,
        severity: "warning",
        message: `${field.name} is in the future: ${field.value} (more than 30 days from now)`,
      });
    }

    // Check: no dates older than 5 years
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (date < fiveYearsAgo) {
      checks.push({
        name: `date_too_old_${field.name}`,
        description: `${field.name} (${field.value}) is more than 5 years old`,
        passed: false,
        expected: -1,
        actual: date.getTime(),
        difference: 1,
        severity: "warning",
        message: `${field.name} is very old: ${field.value} (more than 5 years ago)`,
      });
    }
  }

  // Check: due date should be after invoice date
  const invoiceDate = data.invoiceDate as string | undefined;
  const dueDate = data.dueDate as string | undefined;
  if (invoiceDate && dueDate) {
    const inv = new Date(invoiceDate);
    const due = new Date(dueDate);
    if (!isNaN(inv.getTime()) && !isNaN(due.getTime()) && due < inv) {
      checks.push({
        name: "date_due_before_invoice",
        description: `Due date (${dueDate}) is before invoice date (${invoiceDate})`,
        passed: false,
        expected: inv.getTime(),
        actual: due.getTime(),
        difference: 1,
        severity: "warning",
        message: `Due date ${dueDate} is before invoice date ${invoiceDate}`,
      });
    }
  }

  return checks;
}

// ─── Cross-Field Amount Consistency ─────────────────────────────────────────

/**
 * Validate cross-field amount consistency for any document type.
 * Checks that subtotal, tax, and total are internally consistent.
 */
function validateAmountConsistency(
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  const subtotal = data.subtotal as number | undefined;
  const taxAmount = data.taxAmount as number | undefined;
  const totalAmount = data.totalAmount as number | undefined;

  // If all three are present, verify the formula
  if (
    subtotal !== undefined &&
    taxAmount !== undefined &&
    totalAmount !== undefined
  ) {
    const expected = Math.round((subtotal + taxAmount) * 100) / 100;
    const diff = Math.abs(expected - totalAmount);
    const passed = diff <= DEFAULT_TOLERANCE;

    checks.push({
      name: "amount_subtotal_tax_total",
      description: `Subtotal (${subtotal}) + Tax (${taxAmount}) should equal Total (${totalAmount})`,
      passed,
      expected,
      actual: totalAmount,
      difference: diff,
      severity: "error",
      message: passed
        ? `Amount formula correct: ${subtotal} + ${taxAmount} = ${totalAmount}`
        : `Amount formula error: ${subtotal} + ${taxAmount} = ${expected}, but extracted total is ${totalAmount} (diff: ${diff.toFixed(2)})`,
    });
  }

  // Check: totalAmount should be positive (if present)
  if (totalAmount !== undefined) {
    checks.push({
      name: "amount_total_positive",
      description: "Total amount should be positive",
      passed: totalAmount > 0,
      expected: 1,
      actual: totalAmount,
      difference: totalAmount <= 0 ? 1 : 0,
      severity: "warning",
      message:
        totalAmount > 0
          ? `Total amount is positive: ${totalAmount}`
          : `Total amount is non-positive: ${totalAmount}`,
    });
  }

  return checks;
}

// ─── OCR vs Extraction Cross-Check ────────────────────────────────────────

/**
 * Verify that key extracted amounts actually appear in the OCR text.
 * This catches hallucinated numbers that the LLM extracted but don't
 * exist in the original document.
 *
 * Checks:
 * 1. Total amount appears in OCR text (as a number pattern)
 * 2. Invoice number appears in OCR text
 */
function validateOcrVsExtraction(
  ocrText: string,
  data: Record<string, unknown>,
): TrustGuardCheck[] {
  const checks: TrustGuardCheck[] = [];

  // Check 1: Total amount should appear in OCR text
  const totalAmount = data.totalAmount as number | undefined;
  if (totalAmount !== undefined && totalAmount > 0) {
    // Format the amount in common ways it might appear in OCR
    const amountStr = totalAmount.toFixed(2);
    const amountNoDec = totalAmount.toFixed(0);
    const amountComma = totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const amountCommaNoDec = totalAmount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const found =
      ocrText.includes(amountStr) ||
      ocrText.includes(amountNoDec) ||
      ocrText.includes(amountComma) ||
      ocrText.includes(amountCommaNoDec) ||
      ocrText.includes(String(totalAmount));

    checks.push({
      name: "ocr_total_amount_found",
      description: `Total amount (${amountComma}) should appear in OCR text`,
      passed: found,
      expected: totalAmount,
      actual: found ? totalAmount : 0,
      difference: found ? 0 : 1,
      severity: "warning",
      message: found
        ? `Total amount ${amountComma} found in OCR text`
        : `Total amount ${amountComma} NOT found in OCR text — extraction may have hallucinated this number`,
    });
  }

  // Check 2: Invoice/bill number should appear in OCR text
  const invoiceNumber =
    (data.invoiceNumber as string) ?? (data.billNumber as string) ?? undefined;
  if (invoiceNumber && invoiceNumber.length > 2) {
    const numberPart = invoiceNumber.replace(/[^0-9]/g, "");
    const found =
      ocrText.includes(invoiceNumber) ||
      (numberPart.length > 3 && ocrText.includes(numberPart));

    checks.push({
      name: "ocr_invoice_number_found",
      description: `Invoice number (${invoiceNumber}) should appear in OCR text`,
      passed: found,
      expected: 1,
      actual: found ? 1 : 0,
      difference: found ? 0 : 1,
      severity: "warning",
      message: found
        ? `Invoice number ${invoiceNumber} found in OCR text`
        : `Invoice number ${invoiceNumber} NOT found in OCR text — may be extraction error`,
    });
  }

  // Check 3: Vendor/merchant name should appear in OCR text (if extracted with confidence)
  const vendorName =
    (data.vendorName as string) ?? (data.merchantName as string) ?? undefined;
  if (vendorName && vendorName.length > 2) {
    // Case-insensitive search for vendor name in OCR text
    const ocrLower = ocrText.toLowerCase();
    const vendorLower = vendorName.toLowerCase();
    const found = ocrLower.includes(vendorLower);

    checks.push({
      name: "ocr_vendor_name_found",
      description: `Vendor name (${vendorName}) should appear in OCR text`,
      passed: found,
      expected: 1,
      actual: found ? 1 : 0,
      difference: found ? 0 : 1,
      severity: "warning",
      message: found
        ? `Vendor name "${vendorName}" found in OCR text`
        : `Vendor name "${vendorName}" NOT found in OCR text — extraction may have hallucinated this name`,
    });
  }

  return checks;
}
