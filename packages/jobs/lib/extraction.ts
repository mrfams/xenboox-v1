/**
 * Structured Data Extraction via Claude Sonnet
 *
 * Extracts structured fields from classified documents using Claude Sonnet
 * for high accuracy. Each document type has a specific extraction schema.
 */

import { z } from "zod";

// ─── Schemas ───────────────────────────────────────────────────────────────

export const InvoiceDataSchema = z.object({
  invoiceNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorAddress: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
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
      }),
    )
    .optional(),
  paymentTerms: z.string().optional(),
  bankDetails: z.string().optional(),
});

export const ReceiptDataSchema = z.object({
  merchantName: z.string().optional(),
  merchantAddress: z.string().optional(),
  transactionDate: z.string().optional(),
  totalAmount: z.number().optional(),
  taxAmount: z.number().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().optional(),
        amount: z.number().optional(),
      }),
    )
    .optional(),
  receiptNumber: z.string().optional(),
});

export const BankStatementDataSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  statementPeriod: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  openingBalance: z.number().optional(),
  closingBalance: z.number().optional(),
  totalCredits: z.number().optional(),
  totalDebits: z.number().optional(),
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
      }),
    )
    .optional(),
});

export const PayrollDataSchema = z.object({
  employeeName: z.string().optional(),
  employeeId: z.string().optional(),
  payPeriod: z.string().optional(),
  grossPay: z.number().optional(),
  netPay: z.number().optional(),
  taxAmount: z.number().optional(),
  deductions: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number(),
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
): Promise<ExtractedData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
  }

  try {
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Extract structured data from this ${category} document. Return the extracted data AND per-field confidence scores.

For each field you extract, provide a confidence score (0.0-1.0) indicating how certain you are about that specific value. Fields clearly visible in the text should get 0.9+. Fields that require inference, are partially legible, or might be ambiguous should get lower scores.

Document text:
${text.slice(0, 12000)}`,
          },
        ],
        tools: [
          {
            name: "extract_data",
            description: `Extract structured fields from a ${category} with per-field confidence`,
            input_schema: {
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
        tool_choice: { type: "tool", name: "extract_data" },
      }),
    });

    if (!response.ok) {
      return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
    }

    const result = (await response.json()) as {
      content?: { type: string; input?: Record<string, unknown> }[];
    };
    const toolCall = result.content?.find(
      (c: { type: string }) => c.type === "tool_use",
    );

    if (!toolCall?.input) {
      return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
    }

    const data = parseExtractedData(toolCall.input, category);
    return data;
  } catch {
    return { type: "other", confidence: 0, fieldConfidence: {}, data: {} };
  }
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
        invoiceDate: { type: "string" },
        dueDate: { type: "string" },
        subtotal: { type: "number" },
        taxAmount: { type: "number" },
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
            },
          },
        },
        paymentTerms: { type: "string" },
        bankDetails: { type: "string" },
      },
    },
    receipt: {
      type: "object",
      properties: {
        merchantName: { type: "string" },
        merchantAddress: { type: "string" },
        transactionDate: { type: "string" },
        totalAmount: { type: "number" },
        taxAmount: { type: "number" },
        currency: { type: "string" },
        paymentMethod: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              amount: { type: "number" },
            },
          },
        },
        receiptNumber: { type: "string" },
      },
    },
    bank_statement: {
      type: "object",
      properties: {
        bankName: { type: "string" },
        accountNumber: { type: "string" },
        accountHolder: { type: "string" },
        statementPeriod: { type: "string" },
        periodStart: { type: "string" },
        periodEnd: { type: "string" },
        openingBalance: { type: "number" },
        closingBalance: { type: "number" },
        totalCredits: { type: "number" },
        totalDebits: { type: "number" },
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
        payPeriod: { type: "string" },
        grossPay: { type: "number" },
        netPay: { type: "number" },
        taxAmount: { type: "number" },
        deductions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "number" },
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
