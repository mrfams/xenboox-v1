// ─── Creation Tools ─────────────────────────────────────────────────────────
//
// Shared logic for parsing natural language into structured creation inputs.
// Used by agent tools across tiers. The AI parses user messages into typed
// objects, then the confirmation card shows the result before mutation.

import { callModel } from "@xenboox/models";

// ─── Types ─────────────────────────────────────────────────────────────────

export type CreationType =
  | "create_invoice"
  | "create_vendor"
  | "create_customer"
  | "create_expense"
  | "create_journal_entry";

export interface ParsedInvoice {
  type: "create_invoice";
  customerName: string;
  customerEmail?: string;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
  currency: string;
  dueInDays: number;
  notes?: string;
}

export interface ParsedVendor {
  type: "create_vendor";
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
}

export interface ParsedCustomer {
  type: "create_customer";
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
}

export interface ParsedExpense {
  type: "create_expense";
  description: string;
  amount: number;
  currency: string;
  vendorName?: string;
  category?: string;
  date?: string;
}

export interface ParsedJournalEntry {
  type: "create_journal_entry";
  description: string;
  lines: Array<{
    accountCode: string;
    accountName?: string;
    debit: number;
    credit: number;
  }>;
  date?: string;
  reference?: string;
}

export type ParsedCreation =
  | ParsedInvoice
  | ParsedVendor
  | ParsedCustomer
  | ParsedExpense
  | ParsedJournalEntry;

export interface CreationParseResult {
  parsed: ParsedCreation | null;
  confidence: number;
  missingFields: string[];
  clarificationQuestion?: string;
}

// ─── Schema Descriptions ───────────────────────────────────────────────────

const SCHEMA_MAP: Record<CreationType, string> = {
  create_invoice: `{ "type": "create_invoice", "customerName": string, "customerEmail"?: string, "lines": [{ "description": string, "quantity": number, "unitPrice": number }], "currency": string, "dueInDays": number, "notes"?: string }`,
  create_vendor: `{ "type": "create_vendor", "name": string, "email"?: string, "phone"?: string, "address"?: string, "taxId"?: string, "notes"?: string }`,
  create_customer: `{ "type": "create_customer", "name": string, "email"?: string, "phone"?: string, "address"?: string, "taxId"?: string, "notes"?: string }`,
  create_expense: `{ "type": "create_expense", "description": string, "amount": number, "currency": string, "vendorName"?: string, "category"?: string, "date"?: string }`,
  create_journal_entry: `{ "type": "create_journal_entry", "description": string, "lines": [{ "accountCode": string, "accountName"?: string, "debit": number, "credit": number }], "date"?: string, "reference"?: string }`,
};

const REQUIRED_FIELDS: Record<CreationType, string[]> = {
  create_invoice: ["customerName", "lines"],
  create_vendor: ["name"],
  create_customer: ["name"],
  create_expense: ["description", "amount"],
  create_journal_entry: ["description", "lines"],
};

// ─── Parsing ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an accounting data extractor. Parse the user's natural language request into structured JSON.

For invoices: extract customer name, email (if mentioned), line items (description, quantity, unit price), currency (default: GMD), payment terms in days (default: 30), notes.

For vendors: extract vendor/company name, email, phone, address, tax ID, notes.

For customers: extract customer/person name, email, phone, address, tax ID, notes.

For expenses: extract description, amount, currency (default: GMD), vendor name, category, date.

For journal entries: extract description, line items with account codes/names and debit/credit amounts, date, reference number.

Return ONLY valid JSON. Include "confidence" (0-1) based on how complete the data is, and "missingFields" (string[]) listing any required fields that are missing or ambiguous.`;

/**
 * Parse a natural language creation request into structured data.
 * Uses Haiku for fast, cheap parsing.
 */
export async function parseCreationIntent(
  userInput: string,
  creationType: CreationType,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  const typeName = creationType.replace("create_", "");
  const requiredFields = REQUIRED_FIELDS[creationType];

  const response = await callModel({
    agentName: "cfo",
    taskType: "chat_response",
    entityId: "",
    systemPrompt: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this into a ${typeName}.\n\nUser request: "${userInput}"\n\nEntity: ${entityContext.entityName} (${entityContext.currency})\n\nExpected schema: ${SCHEMA_MAP[creationType]}\n\nRequired fields: ${requiredFields.join(", ")}\n\nRespond with JSON only. Include "confidence" (0-1) and "missingFields" (string[]).`,
      },
    ],
    temperature: 0.1,
  });

  try {
    const raw = JSON.parse(response.content) as Record<string, unknown>;

    const confidence =
      typeof raw.confidence === "number" ? raw.confidence : 0.5;
    const missingFields = Array.isArray(raw.missingFields)
      ? (raw.missingFields as string[])
      : [];

    // Remove metadata fields from the parsed data
    const { confidence: _, missingFields: __, ...parsedData } = raw;
    parsedData.type = creationType;

    // Generate clarification question if low confidence
    let clarificationQuestion: string | undefined;
    if (confidence < 0.8 && missingFields.length > 0) {
      clarificationQuestion = `I need a bit more detail. Could you provide: ${missingFields.join(", ")}?`;
    }

    return {
      parsed: confidence >= 0.4 ? (parsedData as ParsedCreation) : null,
      confidence,
      missingFields,
      clarificationQuestion,
    };
  } catch {
    return {
      parsed: null,
      confidence: 0,
      missingFields: ["unable to parse response"],
      clarificationQuestion:
        "I couldn't understand the details. Could you rephrase? For example: 'Create an invoice for Acme Corp for 2 consulting hours at $100 each'",
    };
  }
}

// ─── Confirmation Text ─────────────────────────────────────────────────────

/**
 * Format a parsed creation into human-readable confirmation text
 * for the confirmation card.
 */
export function formatConfirmationText(parsed: ParsedCreation): string {
  switch (parsed.type) {
    case "create_invoice": {
      const total = parsed.lines.reduce(
        (sum, l) => sum + l.quantity * l.unitPrice,
        0,
      );
      const lineText = parsed.lines
        .map(
          (l) =>
            `  • ${l.description}: ${l.quantity} × ${parsed.currency} ${l.unitPrice.toFixed(2)}`,
        )
        .join("\n");
      return `**New Invoice**\nCustomer: ${parsed.customerName}${parsed.customerEmail ? ` (${parsed.customerEmail})` : ""}\n\n${lineText}\n\n**Total: ${parsed.currency} ${total.toFixed(2)}**\nTerms: Net ${parsed.dueInDays}${parsed.notes ? `\nNotes: ${parsed.notes}` : ""}`;
    }
    case "create_vendor":
      return `**New Vendor**\nName: ${parsed.name}${parsed.email ? `\nEmail: ${parsed.email}` : ""}${parsed.phone ? `\nPhone: ${parsed.phone}` : ""}${parsed.address ? `\nAddress: ${parsed.address}` : ""}${parsed.taxId ? `\nTax ID: ${parsed.taxId}` : ""}`;
    case "create_customer":
      return `**New Customer**\nName: ${parsed.name}${parsed.email ? `\nEmail: ${parsed.email}` : ""}${parsed.phone ? `\nPhone: ${parsed.phone}` : ""}${parsed.address ? `\nAddress: ${parsed.address}` : ""}${parsed.taxId ? `\nTax ID: ${parsed.taxId}` : ""}`;
    case "create_expense": {
      return `**New Expense**\nDescription: ${parsed.description}\nAmount: ${parsed.currency} ${parsed.amount.toFixed(2)}${parsed.vendorName ? `\nVendor: ${parsed.vendorName}` : ""}${parsed.category ? `\nCategory: ${parsed.category}` : ""}${parsed.date ? `\nDate: ${parsed.date}` : ""}`;
    }
    case "create_journal_entry": {
      const lines = parsed.lines
        .map(
          (l) =>
            `  • ${l.accountName ?? l.accountCode}: ${l.debit > 0 ? `Dr ${l.debit.toFixed(2)}` : `Cr ${l.credit.toFixed(2)}`}`,
        )
        .join("\n");
      return `**New Journal Entry**\nDescription: ${parsed.description}\n\n${lines}${parsed.date ? `\nDate: ${parsed.date}` : ""}${parsed.reference ? `\nReference: ${parsed.reference}` : ""}`;
    }
  }
}
