/**
 * Document Classification via the model control plane
 *
 * Routes through @xenboox/models callModel gateway, so the model/provider
 * is decided by the Model Ops admin panel (model_assignments), not hard-coded.
 * Returns category, confidence, reasoning, and extracted metadata.
 */

import { z } from "zod";
import { callModel } from "@xenboox/models";

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
    "ambiguous",
    "multi_type",
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
      // Multi-type: list all detected document types
      detectedTypes: z.array(z.string()).optional(),
      primaryType: z.string().optional(),
    })
    .optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

const TOOL_NAME = "classify_document";

// JSON Schema form of the classification schema (matches previous direct-call shape)
const CLASSIFY_INPUT_SCHEMA: Record<string, unknown> = {
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
        "ambiguous",
        "multi_type",
        "other",
      ],
      description:
        "The document category. Use 'ambiguous' if the document is unclear or corrupted. Use 'multi_type' if the document contains multiple distinct document types (e.g., an invoice attached to a receipt).",
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
        vendorName: { type: "string", description: "Vendor/supplier name" },
        invoiceNumber: { type: "string", description: "Invoice number" },
        invoiceDate: {
          type: "string",
          description: "Invoice date (YYYY-MM-DD)",
        },
        totalAmount: { type: "number", description: "Total amount" },
        currency: {
          type: "string",
          description: "Currency code (e.g., GMD, USD)",
        },
        taxAmount: { type: "number", description: "Tax amount" },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
        poNumber: { type: "string", description: "Purchase order number" },
        bankName: { type: "string", description: "Bank name" },
        accountNumber: { type: "string", description: "Account number" },
        periodStart: {
          type: "string",
          description: "Statement period start",
        },
        periodEnd: { type: "string", description: "Statement period end" },
        employeeName: { type: "string", description: "Employee name" },
        documentTitle: { type: "string", description: "Document title" },
        detectedTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "All document types detected in the file (for multi_type category)",
        },
        primaryType: {
          type: "string",
          description:
            "The primary/financial document type (for multi_type category)",
        },
      },
    },
  },
  required: ["category", "confidence", "reasoning"],
};

// ─── Classification Function ───────────────────────────────────────────────

export async function classifyDocument(
  text: string,
  mimeType: string,
  entityId: string,
): Promise<ClassificationResult> {
  try {
    const response = await callModel({
      agentName: "document",
      taskType: "document_classification",
      entityId,
      systemPrompt:
        "You are Xenboox's document classifier. Classify the financial document and extract key metadata. Always use the classify_document tool.",
      messages: [
        {
          role: "user",
          content: `Classify this document and extract key metadata.

Document type hint: ${mimeType}
Document text (first 8000 chars):
${text.slice(0, 8000)}`,
        },
      ],
      tools: [
        {
          name: TOOL_NAME,
          description: "Classify a financial document and extract metadata",
          inputSchema: CLASSIFY_INPUT_SCHEMA,
        },
      ],
      toolChoice: { type: "tool", name: TOOL_NAME },
      maxTokens: 1024,
    });

    const toolCall = response.toolCalls.find((tc) => tc.name === TOOL_NAME);
    if (!toolCall) {
      return fallbackClassify(text);
    }

    return ClassificationResultSchema.parse(toolCall.arguments);
  } catch {
    return fallbackClassify(text);
  }
}

// ─── Keyword Fallback ──────────────────────────────────────────────────────

function fallbackClassify(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  // Weighted keyword scoring — each rule gets a score based on match count
  const rules: Array<{
    keywords: string[];
    category: ClassificationResult["category"];
    baseConfidence: number;
  }> = [
    {
      keywords: [
        "invoice",
        "bill to",
        "amount due",
        "payment terms",
        "tax invoice",
      ],
      category: "invoice",
      baseConfidence: 0.7,
    },
    {
      keywords: ["receipt", "purchase", "paid", "transaction id", "change"],
      category: "receipt",
      baseConfidence: 0.65,
    },
    {
      keywords: [
        "bank statement",
        "account statement",
        "opening balance",
        "closing balance",
        "account summary",
      ],
      category: "bank_statement",
      baseConfidence: 0.75,
    },
    {
      keywords: [
        "contract",
        "agreement",
        "terms and conditions",
        "signatory",
        "parties",
      ],
      category: "contract",
      baseConfidence: 0.6,
    },
    {
      keywords: [
        "payslip",
        "payroll",
        "gross pay",
        "net pay",
        "deductions",
        "pay period",
      ],
      category: "payroll_report",
      baseConfidence: 0.7,
    },
    {
      keywords: [
        "tax return",
        "vat return",
        "tax assessment",
        "revenue",
        "tax authority",
      ],
      category: "tax_document",
      baseConfidence: 0.6,
    },
    {
      keywords: [
        "journal entry",
        "debit",
        "credit",
        "general ledger",
        "trial balance",
      ],
      category: "journal_entry",
      baseConfidence: 0.65,
    },
    {
      keywords: ["purchase order", "po number", "delivery date", "supplier"],
      category: "purchase_order",
      baseConfidence: 0.7,
    },
  ];

  // Score each category — count weighted matches
  const scoredRules = rules
    .map((rule) => {
      const matches = rule.keywords.filter((kw) => lower.includes(kw));
      const matchRatio = matches.length / rule.keywords.length;
      // Boost confidence with more keyword matches
      const boostedConfidence = Math.min(
        1.0,
        rule.baseConfidence + matchRatio * 0.2,
      );
      return {
        ...rule,
        matches,
        matchRatio,
        score: matches.length >= 2 ? boostedConfidence : 0,
      };
    })
    .filter((r) => r.matches.length >= 2)
    .sort((a, b) => b.score - a.score);

  // Check for multi-type documents (multiple categories with strong matches)
  const strongMatches = scoredRules.filter((r) => r.score >= 0.6);
  if (strongMatches.length >= 2) {
    return {
      category: "multi_type",
      confidence: 0.5,
      reasoning: `Multiple document types detected: ${strongMatches.map((r) => r.category).join(", ")}`,
      metadata: {
        detectedTypes: strongMatches.map((r) => r.category),
        primaryType: strongMatches[0]!.category,
      },
    };
  }

  // Return the best single match
  if (scoredRules.length > 0) {
    const best = scoredRules[0]!;
    return {
      category: best.category,
      confidence: best.score,
      reasoning: `Keyword match: ${best.matches.join(", ")}`,
      metadata: {},
    };
  }

  // Check if document is too short or garbled — mark as ambiguous
  if (lower.length < 50) {
    return {
      category: "ambiguous",
      confidence: 0.2,
      reasoning: "Document text too short for classification",
      metadata: {},
    };
  }

  return {
    category: "supporting",
    confidence: 0.3,
    reasoning: "No strong keyword matches found",
    metadata: {},
  };
}
