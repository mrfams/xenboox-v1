/**
 * Document Classification via Claude Haiku
 *
 * Uses Claude Haiku for cost-effective document classification.
 * Returns category, confidence, reasoning, and extracted metadata.
 */

import { z } from "zod";

// ─── Schema ────────────────────────────────────────────────────────────────

export const ClassificationResultSchema = z.object({
  category: z.enum([
    "invoice",
    "receipt",
    "bank_statement",
    "contract",
    "payroll_report",
    "tax_document",
    "journal_entry",
    "purchase_order",
    "supporting",
    "other",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  metadata: z
    .object({
      vendorName: z.string().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      totalAmount: z.number().optional(),
      currency: z.string().optional(),
      taxAmount: z.number().optional(),
      dueDate: z.string().optional(),
      poNumber: z.string().optional(),
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
      employeeName: z.string().optional(),
      documentTitle: z.string().optional(),
    })
    .optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ─── Classification Function ───────────────────────────────────────────────

export async function classifyDocument(
  text: string,
  mimeType: string,
): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackClassify(text);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20250414",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Classify this document and extract key metadata. Return a JSON object.

Document type hint: ${mimeType}
Document text (first 8000 chars):
${text.slice(0, 8000)}`,
          },
        ],
        tools: [
          {
            name: "classify_document",
            description: "Classify a financial document and extract metadata",
            input_schema: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "invoice",
                    "receipt",
                    "bank_statement",
                    "contract",
                    "payroll_report",
                    "tax_document",
                    "journal_entry",
                    "purchase_order",
                    "supporting",
                    "other",
                  ],
                  description: "The document category",
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Classification confidence (0-1)",
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of classification decision",
                },
                metadata: {
                  type: "object",
                  properties: {
                    vendorName: {
                      type: "string",
                      description: "Vendor/supplier name",
                    },
                    invoiceNumber: {
                      type: "string",
                      description: "Invoice number",
                    },
                    invoiceDate: {
                      type: "string",
                      description: "Invoice date (YYYY-MM-DD)",
                    },
                    totalAmount: {
                      type: "number",
                      description: "Total amount",
                    },
                    currency: {
                      type: "string",
                      description: "Currency code (e.g., GMD, USD)",
                    },
                    taxAmount: { type: "number", description: "Tax amount" },
                    dueDate: {
                      type: "string",
                      description: "Due date (YYYY-MM-DD)",
                    },
                    poNumber: {
                      type: "string",
                      description: "Purchase order number",
                    },
                    bankName: { type: "string", description: "Bank name" },
                    accountNumber: {
                      type: "string",
                      description: "Account number",
                    },
                    periodStart: {
                      type: "string",
                      description: "Statement period start",
                    },
                    periodEnd: {
                      type: "string",
                      description: "Statement period end",
                    },
                    employeeName: {
                      type: "string",
                      description: "Employee name",
                    },
                    documentTitle: {
                      type: "string",
                      description: "Document title",
                    },
                  },
                },
              },
              required: ["category", "confidence", "reasoning"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "classify_document" },
      }),
    });

    if (!response.ok) {
      return fallbackClassify(text);
    }

    const result = (await response.json()) as {
      content?: { type: string; input?: Record<string, unknown> }[];
    };
    const toolCall = result.content?.find(
      (c: { type: string }) => c.type === "tool_use",
    );

    if (!toolCall?.input) {
      return fallbackClassify(text);
    }

    return ClassificationResultSchema.parse(toolCall.input);
  } catch {
    return fallbackClassify(text);
  }
}

// ─── Keyword Fallback ──────────────────────────────────────────────────────

function fallbackClassify(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  const rules: Array<{
    keywords: string[];
    category: ClassificationResult["category"];
    confidence: number;
  }> = [
    {
      keywords: ["invoice", "bill to", "amount due", "payment terms"],
      category: "invoice",
      confidence: 0.7,
    },
    {
      keywords: ["receipt", "purchase", "paid", "transaction id"],
      category: "receipt",
      confidence: 0.65,
    },
    {
      keywords: [
        "bank statement",
        "account statement",
        "opening balance",
        "closing balance",
      ],
      category: "bank_statement",
      confidence: 0.75,
    },
    {
      keywords: ["contract", "agreement", "terms and conditions", "signatory"],
      category: "contract",
      confidence: 0.6,
    },
    {
      keywords: ["payslip", "payroll", "gross pay", "net pay", "deductions"],
      category: "payroll_report",
      confidence: 0.7,
    },
    {
      keywords: ["tax return", "vat return", "tax assessment", "revenue"],
      category: "tax_document",
      confidence: 0.6,
    },
    {
      keywords: ["journal entry", "debit", "credit", "general ledger"],
      category: "journal_entry",
      confidence: 0.65,
    },
    {
      keywords: ["purchase order", "po number", "delivery date"],
      category: "purchase_order",
      confidence: 0.7,
    },
  ];

  for (const rule of rules) {
    const matchCount = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount >= 2) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        reasoning: `Keyword match: ${rule.keywords.filter((kw) => lower.includes(kw)).join(", ")}`,
        metadata: {},
      };
    }
  }

  return {
    category: "supporting",
    confidence: 0.3,
    reasoning: "No strong keyword matches found",
    metadata: {},
  };
}
