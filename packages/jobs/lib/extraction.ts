/**
 * Structured Data Extraction via the model control plane
 *
 * Extracts structured fields from classified documents through the
 * @xenboox/models callModel gateway, so the model/provider is decided by
 * the Model Ops admin panel (model_assignments), not hard-coded.
 * Each document type has a specific extraction schema.
 */

import { z } from "zod";
import { callModel } from "@xenboox/models";

// ─── Schemas ───────────────────────────────────────────────────────────────

export const InvoiceDataSchema = z.object({
  invoiceNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorAddress: z.string().optional(),
  vendorTaxId: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  taxRate: z.number().optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
  poNumber: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        amount: z.number().optional(),
        taxRate: z.number().optional(),
      }),
    )
    .optional(),
  paymentTerms: z.string().optional(),
  bankDetails: z.string().optional(),
  notes: z.string().optional(),
  shippingAmount: z.number().optional(),
  discountAmount: z.number().optional(),
});

export const ReceiptDataSchema = z.object({
  merchantName: z.string().optional(),
  merchantAddress: z.string().optional(),
  merchantTaxId: z.string().optional(),
  transactionDate: z.string().optional(),
  totalAmount: z.number().optional(),
  taxAmount: z.number().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  cardLast4: z.string().optional(),
  tipAmount: z.number().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().optional(),
        unitPrice: z.number().optional(),
        amount: z.number().optional(),
      }),
    )
    .optional(),
  receiptNumber: z.string().optional(),
  cashierName: z.string().optional(),
  storeNumber: z.string().optional(),
});

export const BankStatementDataSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  routingNumber: z.string().optional(),
  statementPeriod: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  totalCredits: z.number().optional(),
  totalDebits: z.number().optional(),
  transactionCount: z.number().optional(),
  currency: z.string().optional(),
  transactions: z
    .array(
      z.object({
        date: z.string(),
        description: z.string(),
        amount: z.number(),
        type: z.enum(["credit", "debit"]),
        balance: z.number().optional(),
        reference: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .optional(),
});

export const PayrollDataSchema = z.object({
  employeeName: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  payPeriod: z.string().optional(),
  payDate: z.string().optional(),
  hoursWorked: z.number().optional(),
  hourlyRate: z.number().optional(),
  grossPay: z.number().optional(),
  netPay: z.number().optional(),
  taxAmount: z.number().optional(),
  taxRate: z.number().optional(),
  deductions: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
        rate: z.number().optional(),
      }),
    )
    .optional(),
  allowances: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),
  currency: z.string().optional(),
  yearToDate: z
    .object({
      gross: z.number().optional(),
      net: z.number().optional(),
      tax: z.number().optional(),
    })
    .optional(),
});

export type InvoiceData = z.infer<typeof InvoiceDataSchema>;
export type ReceiptData = z.infer<typeof ReceiptDataSchema>;
export type BankStatementData = z.infer<typeof BankStatementDataSchema>;
export type PayrollData = z.infer<typeof PayrollDataSchema>;

/**
 * Field-level confidence score: maps each extracted field name to a 0-1 confidence value.
 * Examples:
 *   { "vendorName": 0.95, "invoiceNumber": 0.88, "totalAmount": 0.72, "lineItems": 0.65 }
 */
export type FieldConfidence = Record<string, number>;

export type ExtractedData = {
  type: "invoice" | "receipt" | "bank_statement" | "payroll_report" | "other";
  confidence: number;
  fieldConfidence: FieldConfidence;
  data:
    | InvoiceData
    | ReceiptData
    | BankStatementData
    | PayrollData
    | Record<string, unknown>;
};

// ─── Main Extraction Function ──────────────────────────────────────────────

export async function extractStructuredData(
  text: string,
  category: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<ExtractedData> {
  try {
    // If multi_type, use the primaryType for extraction schema
    const effectiveCategory =
      category === "multi_type" && metadata?.primaryType
        ? (metadata.primaryType as string)
        : category;

    // First pass: extract all fields
    const result = await extractWithSchema(text, effectiveCategory, entityId);

    // Check if we need a retry or multi-pass
    const lowConfidenceFields = Object.entries(result.fieldConfidence)
      .filter(([_, score]) => score < 0.5)
      .map(([field]) => field);

    // If very few low-confidence fields (≤2), retry with focused prompt
    if (lowConfidenceFields.length > 0 && lowConfidenceFields.length <= 2) {
      const retryResult = await extractWithRetry(
        text,
        category,
        entityId,
        lowConfidenceFields,
      );
      // Merge: use retry values only for low-confidence fields
      return mergeExtractionResults(result, retryResult, lowConfidenceFields);
    }

    // If many low-confidence fields (>2), do a second pass
    if (lowConfidenceFields.length > 2) {
      const secondPass = await extractWithSchema(
        text,
        category,
        entityId,
        `Focus on extracting these fields accurately: ${lowConfidenceFields.join(", ")}. Previous attempts had low confidence on these fields.`,
      );
      return mergeExtractionResults(result, secondPass, lowConfidenceFields);
    }

    return result;
  } catch {
    return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
  }
}

/**
 * Get document-type-specific extraction instructions for the system prompt.
 */
function getCategoryInstructions(category: string): string {
  const instructions: Record<string, string> = {
    invoice: `For INVOICES, pay special attention to:
- Invoice number (usually near the top, labeled "Invoice #" or "Invoice No.")
- Vendor/supplier name and address
- Line items: extract EACH line with description, quantity, unit price, and line amount
- Subtotal (sum of all line amounts before tax)
- Tax amount and rate
- Total amount (subtotal + tax)
- Due date and payment terms
- PO number if referenced
IMPORTANT: The line items' amounts should sum to the subtotal. The subtotal + tax should equal the total. If these don't match, flag low confidence.`,
    receipt: `For RECEIPTS, pay special attention to:
- Merchant/store name (usually at the top)
- Transaction date and time
- Individual items with prices
- Subtotal, tax, and total
- Payment method (cash, card, mobile money)
- Card last 4 digits if visible
- Receipt/transaction number
IMPORTANT: The item prices should sum close to the subtotal. Tax + subtotal should equal total.`,
    bank_statement: `For BANK STATEMENTS, pay special attention to:
- Bank name and account number
- Statement period (start and end dates)
- Opening and closing balances
- Each transaction: date, description, amount, type (credit/debit)
- Running balance for each transaction
- Total credits and debits
IMPORTANT: opening_balance + total_credits - total_debits should equal closing_balance. Extract ALL transactions — do not skip any.`,
    payroll_report: `For PAYROLL REPORTS, pay special attention to:
- Employee name and ID
- Pay period and pay date
- Gross pay (before deductions)
- Each deduction: name, amount, and rate if shown
- Net pay (after deductions)
- Tax amounts and rates
- Year-to-date totals if present
IMPORTANT: gross_pay - sum(deductions) - tax should approximately equal net_pay.`,
  };

  return (
    instructions[category] ??
    `Extract all visible fields from this ${category} document. Pay attention to amounts, dates, names, and reference numbers.`
  );
}

/**
 * Core extraction with schema. Optionally takes extra context for retries.
 */
async function extractWithSchema(
  text: string,
  category: string,
  entityId: string,
  extraContext?: string,
): Promise<ExtractedData> {
  const schema = getSchemaForCategory(category);
  const fieldConfidenceSchema = {
    type: "object",
    description:
      "Per-field confidence scores (0.0-1.0) indicating how confident the model is in each extracted value. Keys match the field names in the main data extraction.",
    additionalProperties: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  };

  const categoryInstructions = getCategoryInstructions(category);

  const response = await callModel({
    agentName: "document",
    taskType: "structured_extraction",
    entityId,
    systemPrompt: `You are Xenboox's structured data extractor. Extract structured fields from financial documents with per-field confidence scores.\n\n${categoryInstructions}\n\nAlways use the extract_data tool. Be precise with numbers — extract them exactly as they appear in the document.`,
    messages: [
      {
        role: "user",
        content: `Extract structured data from this ${category} document. Return the extracted data AND per-field confidence scores.\n\nFor each field you extract, provide a confidence score (0.0-1.0) indicating how certain you are about that specific value:\n- 0.95+: Field is clearly printed and unambiguous\n- 0.80-0.94: Field is readable but may have minor ambiguity\n- 0.60-0.79: Field requires inference or is partially legible\n- Below 0.60: Field is guessed or inferred from context\n\nFor numerical fields (amounts, quantities, rates), always verify they are reasonable (positive, within expected range).\n${extraContext ? `\n${extraContext}` : ""}\n\nDocument text:\n${text.slice(0, 12000)}`,
      },
    ],
    tools: [
      {
        name: "extract_data",
        description: `Extract structured fields from a ${category} with per-field confidence. Return ALL fields you can find, setting confidence based on clarity.`,
        inputSchema: {
          ...schema,
          properties: {
            ...((schema.properties as Record<string, unknown>) ?? {}),
            fieldConfidence: fieldConfidenceSchema,
          },
          required: [
            ...((schema.required as string[]) ?? []),
            "fieldConfidence",
          ],
        },
      },
    ],
    toolChoice: { type: "tool", name: "extract_data" },
    maxTokens: 4096,
  });

  const toolCall = response.toolCalls.find((tc) => tc.name === "extract_data");
  if (!toolCall?.arguments) {
    return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
  }

  return parseExtractedData(toolCall.arguments, category);
}

/**
 * Retry extraction for specific low-confidence fields with a focused prompt.
 */
async function extractWithRetry(
  text: string,
  category: string,
  entityId: string,
  lowConfidenceFields: string[],
): Promise<ExtractedData> {
  const fieldList = lowConfidenceFields.join(", ");
  return extractWithSchema(
    text,
    category,
    entityId,
    `RETRY MODE: Focus specifically on these fields that previously had low confidence: ${fieldList}.\nLook very carefully at the document text for these specific values. If you cannot find them, set confidence to 0.`,
  );
}

/**
 * Merge two extraction results, preferring retry values for low-confidence fields.
 */
function mergeExtractionResults(
  original: ExtractedData,
  retry: ExtractedData,
  lowConfidenceFields: string[],
): ExtractedData {
  const mergedData = { ...(original.data as Record<string, unknown>) };
  const mergedConfidence = { ...original.fieldConfidence };

  for (const field of lowConfidenceFields) {
    const retryConfidence = retry.fieldConfidence[field];
    const originalConfidence = original.fieldConfidence[field] ?? 0;

    // Use retry value if it has higher confidence
    if (retryConfidence !== undefined && retryConfidence > originalConfidence) {
      const retryData = retry.data as Record<string, unknown>;
      if (retryData[field] !== undefined) {
        mergedData[field] = retryData[field];
        mergedConfidence[field] = retryConfidence;
      }
    }
  }

  return {
    type: original.type,
    confidence: averageConfidence(mergedConfidence),
    fieldConfidence: mergedConfidence,
    data: mergedData,
  };
}

// ─── Schema Helpers ────────────────────────────────────────────────────────

function getSchemaForCategory(category: string): Record<string, unknown> {
  const schemas: Record<string, Record<string, unknown>> = {
    invoice: {
      type: "object",
      properties: {
        invoiceNumber: { type: "string" },
        vendorName: { type: "string" },
        vendorAddress: { type: "string" },
        vendorTaxId: { type: "string" },
        invoiceDate: { type: "string" },
        dueDate: { type: "string" },
        subtotal: { type: "number" },
        taxAmount: { type: "number" },
        taxRate: { type: "number" },
        totalAmount: { type: "number" },
        currency: { type: "string" },
        poNumber: { type: "string" },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              amount: { type: "number" },
              taxRate: { type: "number" },
            },
          },
        },
        paymentTerms: { type: "string" },
        bankDetails: { type: "string" },
        notes: { type: "string" },
        shippingAmount: { type: "number" },
        discountAmount: { type: "number" },
      },
    },
    receipt: {
      type: "object",
      properties: {
        merchantName: { type: "string" },
        merchantAddress: { type: "string" },
        merchantTaxId: { type: "string" },
        transactionDate: { type: "string" },
        totalAmount: { type: "number" },
        taxAmount: { type: "number" },
        currency: { type: "string" },
        paymentMethod: { type: "string" },
        cardLast4: { type: "string" },
        tipAmount: { type: "number" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              amount: { type: "number" },
            },
          },
        },
        receiptNumber: { type: "string" },
        cashierName: { type: "string" },
        storeNumber: { type: "string" },
      },
    },
    bank_statement: {
      type: "object",
      properties: {
        bankName: { type: "string" },
        accountNumber: { type: "string" },
        accountHolder: { type: "string" },
        routingNumber: { type: "string" },
        statementPeriod: { type: "string" },
        periodStart: { type: "string" },
        periodEnd: { type: "string" },
        openingBalance: { type: "number" },
        closingBalance: { type: "number" },
        totalCredits: { type: "number" },
        totalDebits: { type: "number" },
        transactionCount: { type: "number" },
        currency: { type: "string" },
        transactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              type: { type: "string", enum: ["credit", "debit"] },
              balance: { type: "number" },
              reference: { type: "string" },
              category: { type: "string" },
            },
          },
        },
      },
    },
    payroll_report: {
      type: "object",
      properties: {
        employeeName: { type: "string" },
        employeeId: { type: "string" },
        department: { type: "string" },
        payPeriod: { type: "string" },
        payDate: { type: "string" },
        hoursWorked: { type: "number" },
        hourlyRate: { type: "number" },
        grossPay: { type: "number" },
        netPay: { type: "number" },
        taxAmount: { type: "number" },
        taxRate: { type: "number" },
        deductions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
              rate: { type: "number" },
            },
          },
        },
        allowances: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
            },
          },
        },
        currency: { type: "string" },
        yearToDate: {
          type: "object",
          properties: {
            gross: { type: "number" },
            net: { type: "number" },
            tax: { type: "number" },
          },
        },
      },
    },
  };

  return (
    schemas[category] ?? {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string" },
        amount: { type: "number" },
        description: { type: "string" },
      },
    }
  );
}

// ─── Parse Extracted Data ──────────────────────────────────────────────────

function parseExtractedData(
  input: Record<string, unknown>,
  category: string,
): ExtractedData {
  // Extract fieldConfidence from the raw input before passing to schema validation
  const rawFieldConfidence =
    (input.fieldConfidence as Record<string, number> | undefined) ?? {};

  // Remove fieldConfidence from data so it doesn't pollute the validated output
  const { fieldConfidence: _ignored, ...dataOnly } = input;

  switch (category) {
    case "invoice": {
      const validated = InvoiceDataSchema.parse(dataOnly);
      const fieldConfidence = computeFieldConfidence(
        validated,
        rawFieldConfidence,
      );
      return {
        type: "invoice",
        confidence: averageConfidence(fieldConfidence),
        fieldConfidence,
        data: validated,
      };
    }
    case "receipt": {
      const validated = ReceiptDataSchema.parse(dataOnly);
      const fieldConfidence = computeFieldConfidence(
        validated,
        rawFieldConfidence,
      );
      return {
        type: "receipt",
        confidence: averageConfidence(fieldConfidence),
        fieldConfidence,
        data: validated,
      };
    }
    case "bank_statement": {
      const validated = BankStatementDataSchema.parse(dataOnly);
      const fieldConfidence = computeFieldConfidence(
        validated,
        rawFieldConfidence,
      );
      return {
        type: "bank_statement",
        confidence: averageConfidence(fieldConfidence),
        fieldConfidence,
        data: validated,
      };
    }
    case "payroll_report": {
      const validated = PayrollDataSchema.parse(dataOnly);
      const fieldConfidence = computeFieldConfidence(
        validated,
        rawFieldConfidence,
      );
      return {
        type: "payroll_report",
        confidence: averageConfidence(fieldConfidence),
        fieldConfidence,
        data: validated,
      };
    }
    default: {
      const fieldConfidence = computeFieldConfidence(input, rawFieldConfidence);
      return {
        type: "other",
        confidence: averageConfidence(fieldConfidence),
        fieldConfidence,
        data: input,
      };
    }
  }
}

// ─── Per-Field Confidence Helpers ──────────────────────────────────────────

/**
 * Computes final field confidence by combining AI-provided scores with heuristic defaults.
 * For fields the AI explicitly scored, use that score.
 * For fields the AI didn't score but were populated, use the document-level confidence as a baseline.
 */
function computeFieldConfidence(
  data: Record<string, unknown>,
  aiScores: Record<string, number>,
): FieldConfidence {
  const result: FieldConfidence = {};
  const aiAvg = averageConfidence(aiScores);

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    // Use AI-provided score if available, otherwise use AI average or 0.85 default
    if (key in aiScores) {
      result[key] = aiScores[key]!;
    } else if (aiAvg > 0) {
      result[key] = aiAvg;
    } else {
      // Nested objects like lineItems get a default confidence based on complexity
      result[key] = Array.isArray(value) ? 0.8 : 0.85;
    }
  }

  return result;
}

function averageConfidence(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0.5;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Cross-Field Validation ──────────────────────────────────────────────

/**
 * Validate extracted data for cross-field consistency.
 * Returns validation warnings for any discrepancies found.
 */
export function validateExtractionConsistency(
  data: Record<string, unknown>,
  category: string,
): Array<{ field: string; message: string; severity: "warning" | "error" }> {
  const warnings: Array<{
    field: string;
    message: string;
    severity: "warning" | "error";
  }> = [];

  if (category === "invoice") {
    const lineItems = data.lineItems as
      | Array<{ amount?: number; quantity?: number; unitPrice?: number }>
      | undefined;
    const subtotal = data.subtotal as number | undefined;
    const taxAmount = data.taxAmount as number | undefined;
    const totalAmount = data.totalAmount as number | undefined;

    // Validate line items sum to subtotal
    if (lineItems?.length && subtotal) {
      const lineSum = lineItems.reduce(
        (sum, item) => sum + (item.amount ?? 0),
        0,
      );
      const diff = Math.abs(lineSum - subtotal);
      if (diff > 0.02 * subtotal && diff > 0.01) {
        warnings.push({
          field: "subtotal",
          message: `Line items sum (${lineSum.toFixed(2)}) differs from subtotal (${subtotal.toFixed(2)}) by ${diff.toFixed(2)}`,
          severity: "warning",
        });
      }
    }

    // Validate subtotal + tax = total
    if (subtotal != null && totalAmount != null) {
      const expected = subtotal + (taxAmount ?? 0);
      const diff = Math.abs(expected - totalAmount);
      if (diff > 0.02 * totalAmount && diff > 0.01) {
        warnings.push({
          field: "totalAmount",
          message: `Subtotal (${subtotal}) + tax (${taxAmount ?? 0}) = ${expected.toFixed(2)}, but total is ${totalAmount.toFixed(2)}`,
          severity: "warning",
        });
      }
    }
  }

  if (category === "receipt") {
    const items = data.items as Array<{ amount?: number }> | undefined;
    const totalAmount = data.totalAmount as number | undefined;
    const taxAmount = data.taxAmount as number | undefined;

    if (items?.length && totalAmount) {
      const itemSum = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
      const diff = Math.abs(itemSum + (taxAmount ?? 0) - totalAmount);
      if (diff > 0.05 * totalAmount && diff > 0.01) {
        warnings.push({
          field: "totalAmount",
          message: `Items sum (${itemSum.toFixed(2)}) + tax (${taxAmount ?? 0}) differs from total (${totalAmount.toFixed(2)}) by ${diff.toFixed(2)}`,
          severity: "warning",
        });
      }
    }
  }

  if (category === "payroll_report") {
    const grossPay = data.grossPay as number | undefined;
    const netPay = data.netPay as number | undefined;
    const taxAmount = data.taxAmount as number | undefined;
    const deductions = data.deductions as Array<{ amount: number }> | undefined;

    if (grossPay != null && netPay != null) {
      const deductionSum =
        deductions?.reduce((sum, d) => sum + d.amount, 0) ?? 0;
      const expectedNet = grossPay - deductionSum - (taxAmount ?? 0);
      const diff = Math.abs(expectedNet - netPay);
      if (diff > 0.05 * grossPay && diff > 0.01) {
        warnings.push({
          field: "netPay",
          message: `Gross (${grossPay}) - deductions (${deductionSum}) - tax (${taxAmount ?? 0}) = ${expectedNet.toFixed(2)}, but net pay is ${netPay.toFixed(2)}`,
          severity: "warning",
        });
      }
    }
  }

  return warnings;
}
