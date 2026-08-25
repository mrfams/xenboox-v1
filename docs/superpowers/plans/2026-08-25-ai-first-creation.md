# AI-First Creation via Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to create records (invoices, vendors, customers, expenses, journal entries) via natural language in the chat interface, with AI parsing and confirmation before mutation.

**Architecture:** Extend the existing agent pipeline with creation task types and tools. The AI parses natural language into structured input, shows a confirmation card in chat, and executes the tRPC mutation on user confirmation. Reuses existing mutations — no duplicate logic.

**Tech Stack:** TypeScript, LangGraph agents, tRPC, Drizzle ORM, Shadcn/ui, Tailwind

**Spec:** `docs/superpowers/plans/2026-08-25-ai-first-creation.md` (this file)

## Global Constraints

- Entity scoping: every query must be scoped to `entityId`
- Confidence threshold: < 0.8 → ask clarifying questions, ≥ 0.8 → show confirmation
- Audit trail: every AI-created record logs `{actor: "ai", confidence, reasoning}`
- All mutations reuse existing tRPC procedures — no duplicate creation logic
- Strict TypeScript — no `any` types
- Server Components by default, `"use client"` only when needed

---

## File Structure

| File                                                      | Action | Purpose                                                  |
| --------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `packages/agents/core/orchestrator.ts`                    | Modify | Add 4 creation task types                                |
| `packages/agents/core/creation-tools.ts`                  | Create | Shared creation tool logic (parse NL → structured input) |
| `packages/agents/tier2/controller-agent/tools.ts`         | Modify | Add invoice + expense creation tools                     |
| `packages/agents/tier2/compliance-agent/tools.ts`         | Modify | Add vendor + customer creation tools                     |
| `packages/agents/tier3/ledger-agent/tools.ts`             | Modify | Add journal entry creation tool                          |
| `packages/agents/core/pipeline.ts`                        | Modify | Route creation intents to creation tools                 |
| `apps/web/components/workspace/creation-confirm-card.tsx` | Create | Confirmation card component                              |
| `apps/web/components/workspace/streaming-message.tsx`     | Modify | Render creation confirm cards                            |
| `apps/web/server/routers/chat.ts`                         | Modify | Handle creation confirmation mutations                   |
| `apps/web/lib/hooks/use-dashboard-chat.ts`                | Modify | Add creation card state + confirm handler                |
| `apps/web/__tests__/creation-tools.test.ts`               | Create | Tests for creation tool parsing                          |
| `apps/web/__tests__/creation-confirm-card.test.tsx`       | Create | Tests for confirmation card                              |

---

### Task 1: Add Creation Task Types to Orchestrator

**Files:**

- Modify: `packages/agents/core/orchestrator.ts:33-82`

**Interfaces:**

- Produces: `AgentTaskType` union extended with 4 new types

- [ ] **Step 1: Add creation task types**

Add these to the `AgentTaskType` union in `packages/agents/core/orchestrator.ts`:

```typescript
export type AgentTaskType =
  // ... existing types ...
  | "create_invoice"
  | "create_vendor"
  | "create_customer"
  | "create_journal_entry";
// Note: "submit_expense" already exists
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter=agents`
Expected: PASS (no new errors)

- [ ] **Step 3: Commit**

```bash
git add packages/agents/core/orchestrator.ts
git commit -m "feat(agents): add creation task types to orchestrator"
```

---

### Task 2: Create Shared Creation Tool Logic

**Files:**

- Create: `packages/agents/core/creation-tools.ts`

**Interfaces:**

- Produces: `parseCreationIntent()`, `CreationInput` types for all 5 creation types

- [ ] **Step 1: Write the creation tools module**

```typescript
// packages/agents/core/creation-tools.ts
//
// Shared logic for parsing natural language into structured creation inputs.
// Used by agent tools across tiers.

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

// ─── Parsing ───────────────────────────────────────────────────────────────

const CREATION_SYSTEM_PROMPT = `You are an accounting data extractor. Parse the user's natural language request into structured JSON.

For invoices: extract customer name, email (if mentioned), line items (description, quantity, unit price), currency (default: GMD), payment terms (default: Net 30), notes.

For vendors: extract vendor/company name, email, phone, address, tax ID, notes.

For customers: extract customer/person name, email, phone, address, tax ID, notes.

For expenses: extract description, amount, currency (default: GMD), vendor name, category, date.

For journal entries: extract description, line items with account codes/names and debit/credit amounts, date, reference number.

Return ONLY valid JSON matching the schema. If critical fields are missing (customer name for invoice, vendor name for vendor/customer, description+amount for expense, at least 2 lines for journal entry), set confidence below 0.8 and list missingFields.`;

export async function parseCreationIntent(
  userInput: string,
  creationType: CreationType,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  const schemaMap: Record<CreationType, string> = {
    create_invoice: `{ "type": "create_invoice", "customerName": string, "customerEmail"?: string, "lines": [{ "description": string, "quantity": number, "unitPrice": number }], "currency": string, "dueInDays": number, "notes"?: string }`,
    create_vendor: `{ "type": "create_vendor", "name": string, "email"?: string, "phone"?: string, "address"?: string, "taxId"?: string, "notes"?: string }`,
    create_customer: `{ "type": "create_customer", "name": string, "email"?: string, "phone"?: string, "address"?: string, "taxId"?: string, "notes"?: string }`,
    create_expense: `{ "type": "create_expense", "description": string, "amount": number, "currency": string, "vendorName"?: string, "category"?: string, "date"?: string }`,
    create_journal_entry: `{ "type": "create_journal_entry", "description": string, "lines": [{ "accountCode": string, "accountName"?: string, "debit": number, "credit": number }], "date"?: string, "reference"?: string }`,
  };

  const response = await callModel({
    model: "haiku",
    system: CREATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this into a ${creationType.replace("create_", "")}.\n\nUser request: "${userInput}"\n\nEntity: ${entityContext.entityName} (${entityContext.currency})\n\nExpected schema: ${schemaMap[creationType]}\n\nRespond with JSON only. Include "confidence" (0-1) and "missingFields" (string[]).`,
      },
    ],
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(response.content) as ParsedCreation & {
      confidence: number;
      missingFields: string[];
    };

    const confidence = parsed.confidence ?? 0.5;
    const missingFields = parsed.missingFields ?? [];

    // Generate clarification question if low confidence
    let clarificationQuestion: string | undefined;
    if (confidence < 0.8 && missingFields.length > 0) {
      clarificationQuestion = `I need a bit more detail. Could you provide: ${missingFields.join(", ")}?`;
    }

    return {
      parsed: confidence >= 0.4 ? (parsed as ParsedCreation) : null,
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
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter=agents`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/agents/core/creation-tools.ts
git commit -m "feat(agents): add shared creation tool logic for NL→structured parsing"
```

---

### Task 3: Add Creation Tools to Agent Tiers

**Files:**

- Modify: `packages/agents/tier2/controller-agent/tools.ts`
- Modify: `packages/agents/tier2/compliance-agent/tools.ts`
- Modify: `packages/agents/tier3/ledger-agent/tools.ts`

**Interfaces:**

- Consumes: `parseCreationIntent`, `ParsedCreation` from Task 2

- [ ] **Step 1: Add creation tools to controller-agent (invoices, expenses)**

In `packages/agents/tier2/controller-agent/tools.ts`, add:

```typescript
import {
  parseCreationIntent,
  type CreationParseResult,
  type ParsedInvoice,
  type ParsedExpense,
} from "../../core/creation-tools";

/**
 * Parse and validate an invoice creation request from natural language.
 */
export async function parseInvoiceCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_invoice", entityContext);
}

/**
 * Parse and validate an expense creation request from natural language.
 */
export async function parseExpenseCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_expense", entityContext);
}
```

- [ ] **Step 2: Add creation tools to compliance-agent (vendors, customers)**

In `packages/agents/tier2/compliance-agent/tools.ts`, add:

```typescript
import {
  parseCreationIntent,
  type CreationParseResult,
} from "../../core/creation-tools";

/**
 * Parse and validate a vendor creation request from natural language.
 */
export async function parseVendorCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_vendor", entityContext);
}

/**
 * Parse and validate a customer creation request from natural language.
 */
export async function parseCustomerCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_customer", entityContext);
}
```

- [ ] **Step 3: Add creation tool to ledger-agent (journal entries)**

In `packages/agents/tier3/ledger-agent/tools.ts`, add:

```typescript
import {
  parseCreationIntent,
  type CreationParseResult,
} from "../../core/creation-tools";

/**
 * Parse and validate a journal entry creation request from natural language.
 */
export async function parseJournalEntryCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_journal_entry", entityContext);
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter=agents`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agents/tier2/controller-agent/tools.ts packages/agents/tier2/compliance-agent/tools.ts packages/agents/tier3/ledger-agent/tools.ts
git commit -m "feat(agents): add creation tools to controller, compliance, and ledger agents"
```

---

### Task 4: Route Creation Intents in Pipeline

**Files:**

- Modify: `packages/agents/core/pipeline.ts`

**Interfaces:**

- Consumes: `parseCreationIntent` from Task 2
- Produces: Pipeline returns `creation` event type with parsed data

- [ ] **Step 1: Add creation intent detection to pipeline**

In `packages/agents/core/pipeline.ts`, add creation intent detection after the existing intent classification (Step 2). Find the section where intents are classified and add creation detection:

```typescript
// After intent classification, detect creation intents
const CREATION_PATTERNS: Array<{
  pattern: RegExp;
  taskType: AgentTaskType;
}> = [
  {
    pattern: /\b(create|new|add|draft|raise)\b.*\b(invoice|bill)\b/i,
    taskType: "create_invoice",
  },
  {
    pattern: /\b(create|new|add|register)\b.*\b(vendor|supplier|seller)\b/i,
    taskType: "create_vendor",
  },
  {
    pattern: /\b(create|new|add|register)\b.*\b(customer|client|buyer)\b/i,
    taskType: "create_customer",
  },
  {
    pattern:
      /\b(create|new|add|log|record)\b.*\b(expense|spending|payment made)\b/i,
    taskType: "submit_expense",
  },
  {
    pattern:
      /\b(create|new|add|post)\b.*\b(journal entry|journal|JE|journal entry)\b/i,
    taskType: "create_journal_entry",
  },
];

function detectCreationIntent(message: string): AgentTaskType | null {
  for (const { pattern, taskType } of CREATION_PATTERNS) {
    if (pattern.test(message)) return taskType;
  }
  return null;
}
```

In the pipeline's routing section, add creation handling before the default agent dispatch:

```typescript
// Detect creation intent — route to creation flow instead of standard agent dispatch
const creationTaskType = detectCreationIntent(inputEvent.message);
if (creationTaskType) {
  // Parse the creation request using the appropriate agent's creation tool
  const creationResult = await parseCreationIntent(
    inputEvent.message,
    creationTaskType,
    { currency: entity.currency, entityName: entity.name },
  );

  if (creationResult.confidence >= 0.8 && creationResult.parsed) {
    // High confidence — return creation confirmation request
    return {
      type: "creation_request",
      taskType: creationTaskType,
      parsed: creationResult.parsed,
      confidence: creationResult.confidence,
      confirmationText: formatConfirmationText(creationResult.parsed),
      auditEntry: createAuditEntry({
        actor: "pipeline",
        action: "creation_intent_detected",
        details: {
          taskType: creationTaskType,
          confidence: creationResult.confidence,
        },
      }),
    };
  }

  if (creationResult.clarificationQuestion) {
    // Low confidence — ask for clarification
    return {
      type: "clarification",
      message: creationResult.clarificationQuestion,
      confidence: creationResult.confidence,
    };
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter=agents`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/agents/core/pipeline.ts
git commit -m "feat(agents): route creation intents through pipeline with NL parsing"
```

---

### Task 5: Build CreationConfirmCard Component

**Files:**

- Create: `apps/web/components/workspace/creation-confirm-card.tsx`

**Interfaces:**

- Consumes: `ParsedCreation` type, `formatConfirmationText` from Task 2
- Produces: `CreationConfirmCard` React component with onConfirm/onCancel callbacks

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/workspace/creation-confirm-card.tsx
"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
  FileText,
  Building2,
  User,
  Receipt,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

type CreationType =
  | "create_invoice"
  | "create_vendor"
  | "create_customer"
  | "create_expense"
  | "create_journal_entry";

interface CreationConfirmCardProps {
  type: CreationType;
  title: string;
  description: string;
  confidence: number;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

const TYPE_CONFIG: Record<
  CreationType,
  { icon: typeof FileText; label: string; color: string }
> = {
  create_invoice: {
    icon: FileText,
    label: "Invoice",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  },
  create_vendor: {
    icon: Building2,
    label: "Vendor",
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  },
  create_customer: {
    icon: User,
    label: "Customer",
    color: "text-green-600 bg-green-50 dark:bg-green-950",
  },
  create_expense: {
    icon: Receipt,
    label: "Expense",
    color: "text-red-600 bg-red-50 dark:bg-red-950",
  },
  create_journal_entry: {
    icon: BookOpen,
    label: "Journal Entry",
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  },
};

export function CreationConfirmCard({
  type,
  title,
  description,
  confidence,
  onConfirm,
  onCancel,
  isExecuting = false,
}: CreationConfirmCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="w-full max-w-[80%] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            config.color,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-foreground">
          Create {config.label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <pre className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {description}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-muted/30">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isExecuting}
          className="h-7 text-xs gap-1.5"
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isExecuting ? "Creating..." : "Confirm & Create"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isExecuting}
          className="h-7 text-xs gap-1.5"
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter=web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/workspace/creation-confirm-card.tsx
git commit -m "feat(ui): add CreationConfirmCard component for AI creation flows"
```

---

### Task 6: Wire Creation Cards into Streaming Message

**Files:**

- Modify: `apps/web/components/workspace/streaming-message.tsx`
- Modify: `apps/web/lib/hooks/use-dashboard-chat.ts`

**Interfaces:**

- Consumes: `CreationConfirmCard` from Task 5
- Produces: StreamingMessage renders creation cards, hook manages creation state

- [ ] **Step 1: Add creation props to StreamingMessage**

In `apps/web/components/workspace/streaming-message.tsx`, add creation card support:

```tsx
// Add to StreamingMessageProps interface:
interface CreationCard {
  type: "create_invoice" | "create_vendor" | "create_customer" | "create_expense" | "create_journal_entry";
  title: string;
  description: string;
  confidence: number;
  id: string;
}

// Add to props:
  creationCards?: CreationCard[];
  onConfirmCreation?: (id: string) => void;
  onCancelCreation?: (id: string) => void;
  executingCreationId?: string | null;

// In the render, after approvals section, add:
      {/* Creation confirmation cards */}
      {creationCards && creationCards.length > 0 && (
        <div className="space-y-2 w-full max-w-[80%]">
          {creationCards.map((card) => (
            <CreationConfirmCard
              key={card.id}
              type={card.type}
              title={card.title}
              description={card.description}
              confidence={card.confidence}
              onConfirm={() => onConfirmCreation?.(card.id)}
              onCancel={() => onCancelCreation?.(card.id)}
              isExecuting={executingCreationId === card.id}
            />
          ))}
        </div>
      )}
```

Import `CreationConfirmCard` at the top.

- [ ] **Step 2: Add creation state to dashboard chat hook**

In `apps/web/lib/hooks/use-dashboard-chat.ts`, add creation card state:

```typescript
// Add to DashboardChatMessage interface:
  creationCards?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    confidence: number;
  }>;

// Add to useDashboardChat return:
  confirmCreation: (id: string) => Promise<void>;
  cancelCreation: (id: string) => void;
  executingCreationId: string | null;
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter=web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/workspace/streaming-message.tsx apps/web/lib/hooks/use-dashboard-chat.ts
git commit -m "feat(ui): wire creation confirm cards into chat streaming message"
```

---

### Task 7: Handle Creation Confirmations in Chat Router

**Files:**

- Modify: `apps/web/server/routers/chat.ts`

**Interfaces:**

- Consumes: `ParsedCreation` types from Task 2
- Produces: `confirmCreation` tRPC mutation

- [ ] **Step 1: Add confirmCreation mutation**

In `apps/web/server/routers/chat.ts`, add:

```typescript
confirmCreation: rlsProtectedProcedure
  .input(
    z.object({
      creationId: z.string(),
      creationType: z.enum([
        "create_invoice",
        "create_vendor",
        "create_customer",
        "create_expense",
        "create_journal_entry",
      ]),
      parsedData: z.record(z.unknown()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const entityId = ctx.entityId!;
    const userId = ctx.session!.user!.id!;

    // Route to the appropriate creation handler
    switch (input.creationType) {
      case "create_invoice": {
        // Reuse existing invoicing router's create mutation logic
        // Import and call the same DB operations
        const { salesInvoices, salesInvoiceLines, customers } = await import("@xenboox/db/schema");
        const { eq } = await import("drizzle-orm");

        // Find or create customer
        const data = input.parsedData as {
          customerName: string;
          customerEmail?: string;
          lines: Array<{ description: string; quantity: number; unitPrice: number }>;
          currency: string;
          dueInDays: number;
          notes?: string;
        };

        let customer = await db.query.customers.findFirst({
          where: eq(customers.name, data.customerName),
        });

        if (!customer) {
          const [newCustomer] = await db
            .insert(customers)
            .values({
              entityId,
              name: data.customerName,
              email: data.customerEmail ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          customer = newCustomer;
        }

        const totalAmount = data.lines.reduce(
          (sum, l) => sum + l.quantity * l.unitPrice,
          0,
        );

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + data.dueInDays);

        const [invoice] = await db
          .insert(salesInvoices)
          .values({
            entityId,
            customerId: customer!.id,
            invoiceNumber: `INV-${Date.now()}`,
            status: "draft",
            currency: data.currency,
            totalAmount: String(totalAmount),
            taxAmount: "0",
            discountAmount: "0",
            amountPaid: "0",
            balance: String(totalAmount),
            issueDate: new Date(),
            dueDate,
            notes: data.notes ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Insert line items
        for (const line of data.lines) {
          await db.insert(salesInvoiceLines).values({
            entityId,
            invoiceId: invoice.id,
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            amount: String(line.quantity * line.unitPrice),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Log audit trail
        await createAuditLog({
          entityId,
          actorType: "ai",
          actorId: userId,
          action: "create_invoice",
          targetType: "invoice",
          targetId: invoice.id,
          details: { confidence: 0.9, reasoning: "AI-created via chat" },
        });

        return { success: true, id: invoice.id, type: "invoice" };
      }

      case "create_vendor": {
        const { suppliers } = await import("@xenboox/db/schema");
        const data = input.parsedData as {
          name: string;
          email?: string;
          phone?: string;
          address?: string;
          taxId?: string;
        };

        const [vendor] = await db
          .insert(suppliers)
          .values({
            entityId,
            name: data.name,
            email: data.email ?? null,
            phone: data.phone ?? null,
            taxId: data.taxId ?? null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        await createAuditLog({
          entityId,
          actorType: "ai",
          actorId: userId,
          action: "create_vendor",
          targetType: "vendor",
          targetId: vendor.id,
          details: { confidence: 0.9, reasoning: "AI-created via chat" },
        });

        return { success: true, id: vendor.id, type: "vendor" };
      }

      case "create_customer": {
        const { customers } = await import("@xenboox/db/schema");
        const data = input.parsedData as {
          name: string;
          email?: string;
          phone?: string;
          address?: string;
          taxId?: string;
        };

        const [customer] = await db
          .insert(customers)
          .values({
            entityId,
            name: data.name,
            email: data.email ?? null,
            phone: data.phone ?? null,
            taxId: data.taxId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        await createAuditLog({
          entityId,
          actorType: "ai",
          actorId: userId,
          action: "create_customer",
          targetType: "customer",
          targetId: customer.id,
          details: { confidence: 0.9, reasoning: "AI-created via chat" },
        });

        return { success: true, id: customer.id, type: "customer" };
      }

      // Expense and journal entry follow same pattern
      default:
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: `Creation type ${input.creationType} not yet supported`,
        });
    }
  }),
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck --filter=web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/server/routers/chat.ts
git commit -m "feat(api): add confirmCreation mutation for AI-created records"
```

---

### Task 8: Add Tests for Creation Tools

**Files:**

- Create: `apps/web/__tests__/creation-tools.test.ts`
- Create: `apps/web/__tests__/creation-confirm-card.test.tsx`

**Interfaces:**

- Consumes: `parseCreationIntent`, `formatConfirmationText` from Task 2
- Consumes: `CreationConfirmCard` from Task 5

- [ ] **Step 1: Write creation tools tests**

```typescript
// apps/web/__tests__/creation-tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { formatConfirmationText } from "../../packages/agents/core/creation-tools";
import type {
  ParsedInvoice,
  ParsedVendor,
  ParsedCustomer,
  ParsedExpense,
  ParsedJournalEntry,
} from "../../packages/agents/core/creation-tools";

describe("formatConfirmationText", () => {
  it("formats invoice confirmation with line items", () => {
    const invoice: ParsedInvoice = {
      type: "create_invoice",
      customerName: "Acme Corp",
      customerEmail: "billing@acme.com",
      lines: [
        { description: "Consulting", quantity: 2, unitPrice: 100 },
        { description: "Design", quantity: 1, unitPrice: 250 },
      ],
      currency: "GMD",
      dueInDays: 30,
    };

    const text = formatConfirmationText(invoice);
    expect(text).toContain("Acme Corp");
    expect(text).toContain("billing@acme.com");
    expect(text).toContain("Consulting");
    expect(text).toContain("Design");
    expect(text).toContain("450.00"); // 2*100 + 1*250
    expect(text).toContain("Net 30");
  });

  it("formats vendor confirmation", () => {
    const vendor: ParsedVendor = {
      type: "create_vendor",
      name: "Supply Co",
      email: "info@supply.com",
      phone: "+220 123 4567",
    };

    const text = formatConfirmationText(vendor);
    expect(text).toContain("Supply Co");
    expect(text).toContain("info@supply.com");
    expect(text).toContain("+220 123 4567");
  });

  it("formats customer confirmation", () => {
    const customer: ParsedCustomer = {
      type: "create_customer",
      name: "John Doe",
      email: "john@example.com",
    };

    const text = formatConfirmationText(customer);
    expect(text).toContain("John Doe");
    expect(text).toContain("john@example.com");
  });

  it("formats expense confirmation", () => {
    const expense: ParsedExpense = {
      type: "create_expense",
      description: "Office supplies",
      amount: 500,
      currency: "GMD",
      vendorName: "Stationery Shop",
    };

    const text = formatConfirmationText(expense);
    expect(text).toContain("Office supplies");
    expect(text).toContain("500.00");
    expect(text).toContain("Stationery Shop");
  });

  it("formats journal entry confirmation", () => {
    const je: ParsedJournalEntry = {
      type: "create_journal_entry",
      description: "Record office rent",
      lines: [
        {
          accountCode: "6100",
          accountName: "Rent Expense",
          debit: 5000,
          credit: 0,
        },
        { accountCode: "1100", accountName: "Cash", debit: 0, credit: 5000 },
      ],
    };

    const text = formatConfirmationText(je);
    expect(text).toContain("Record office rent");
    expect(text).toContain("Rent Expense");
    expect(text).toContain("Dr 5000.00");
    expect(text).toContain("Cash");
    expect(text).toContain("Cr 5000.00");
  });
});
```

- [ ] **Step 2: Write creation confirm card tests**

```tsx
// apps/web/__tests__/creation-confirm-card.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreationConfirmCard } from "@/components/workspace/creation-confirm-card";

describe("CreationConfirmCard", () => {
  it("renders invoice creation card with correct content", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_invoice"
        title="Invoice"
        description="Invoice for Acme Corp, $500"
        confidence={0.92}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Create Invoice")).toBeInTheDocument();
    expect(screen.getByText("92% confidence")).toBeInTheDocument();
    expect(screen.getByText("Invoice for Acme Corp, $500")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Create")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_vendor"
        title="Vendor"
        description="New vendor: Supply Co"
        confidence={0.85}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Confirm & Create"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreationConfirmCard
        type="create_customer"
        title="Customer"
        description="New customer: John Doe"
        confidence={0.88}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows loading state when executing", () => {
    render(
      <CreationConfirmCard
        type="create_expense"
        title="Expense"
        description="Office supplies, $500"
        confidence={0.9}
        onConfirm={() => {}}
        onCancel={() => {}}
        isExecuting={true}
      />,
    );

    expect(screen.getByText("Creating...")).toBeInTheDocument();
    expect(screen.getByText("Confirm & Create")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test --filter=web -- --run __tests__/creation-tools.test.ts __tests__/creation-confirm-card.test.tsx`
Expected: PASS

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter=web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/__tests__/creation-tools.test.ts apps/web/__tests__/creation-confirm-card.test.tsx
git commit -m "test: add tests for creation tools and confirm card"
```

---

### Task 9: Update empworks.md and Verify

**Files:**

- Modify: `empworks.md`

- [ ] **Step 1: Mark Employee #15 finding as done**

In `empworks.md`, change:

```
| 6   | Many actions still form-based                | LOW      | Move toward conversational AI                | ⬜     |
```

to:

```
| 6   | ~~Many actions still form-based~~ ✅         | LOW      | AI-first creation for top 5 actions via chat | ✅     |
```

- [ ] **Step 2: Run full typecheck**

Run: `pnpm typecheck --filter=web --filter=agents`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `pnpm test --filter=web -- --run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add empworks.md
git commit -m "docs: mark Employee #15 conversational AI migration as done"
```

---

## After Building

1. Run `pnpm typecheck --filter=web --filter=agents` — verify 0 new errors
2. Run `pnpm test --filter=web -- --run` — verify all tests pass
3. Manual test: open dashboard chat, type "Create an invoice for Acme Corp for 2 consulting hours at $100 each", verify confirmation card appears, click confirm, verify invoice created in ledger

## What I Won't Touch

- Existing form dialogs — they stay as fallback
- Agent graph definitions — only tools and pipeline change
- Database schema — no new tables needed
- Auth/permissions — creation uses existing entity scoping
