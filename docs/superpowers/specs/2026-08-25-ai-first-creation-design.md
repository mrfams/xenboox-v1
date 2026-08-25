# AI-First Creation via Chat — Design Spec

> **Employee #15 Finding:** "Many actions still form-based — Move toward conversational AI"
> **Severity:** LOW
> **Decision:** AI-first, forms as fallback

## Problem

The dashboard has 15 form-based dialogs for creating records (invoices, vendors, customers, expenses, journal entries, etc.). The AI chat interface can answer questions and run reports but cannot create records. Users must navigate to specific pages and fill out forms for every creation action.

## Solution

Extend the agent pipeline to handle creation intents. The AI parses natural language into structured input, shows a confirmation card in chat, and executes the tRPC mutation on user confirmation.

## User Flow

```
User: "Create an invoice for Acme Corp for 2 consulting hours at $100 each"
        ↓
AI: [Thinking: classify intent → instruction → create_invoice]
        ↓
AI: [Confirmation Card]
    ┌─────────────────────────────────┐
    │ 📄 Create Invoice       92%    │
    │                                 │
    │ Customer: Acme Corp             │
    │   • Consulting: 2 × GMD 100.00 │
    │                                 │
    │ Total: GMD 200.00              │
    │ Terms: Net 30                   │
    │                                 │
    │ [Confirm & Create]  [Cancel]   │
    └─────────────────────────────────┘
        ↓
User clicks "Confirm & Create"
        ↓
AI: "Invoice INV-20260825-001 created for Acme Corp (GMD 200.00). Draft status — ready for review."
```

## Scope: Top 5 Creation Actions

| Action        | Task Type              | Agent      | Rationale                          |
| ------------- | ---------------------- | ---------- | ---------------------------------- |
| Invoice       | `create_invoice`       | Controller | Most common creation action        |
| Vendor        | `create_vendor`        | Compliance | Compliance checks on vendor data   |
| Customer      | `create_customer`      | Compliance | Compliance checks on customer data |
| Expense       | `submit_expense`       | Controller | Already has task type              |
| Journal Entry | `create_journal_entry` | Ledger     | Double-entry validation            |

## Key Design Decisions

1. **Confirmation before mutation** — Every creation shows a preview card. User must confirm. Prevents AI mistakes from becoming real records.

2. **Confidence gate** — If AI confidence < 0.8 on parsed input, it asks clarifying questions instead of showing a confirmation card.

3. **Reuse existing mutations** — The confirmation handler calls the same tRPC mutations the forms use. No duplicate logic.

4. **Audit trail** — Every AI-created record logs `{actor: "ai", confidence, reasoning}` in the audit log.

5. **Forms remain** — All 15 form dialogs stay as fallback. Users can still use them for complex cases or if they prefer.

## Architecture

```
User Message
    ↓
Pipeline (intent classification)
    ↓
Creation Intent Detected?
    ├── Yes → parseCreationIntent (Haiku)
    │         ├── confidence ≥ 0.8 → Show ConfirmationCard
    │         │                        └── User confirms → tRPC mutation
    │         └── confidence < 0.8 → Ask clarifying question
    └── No → Standard agent dispatch (existing flow)
```

## Files Changed

| File                                                      | Change                                   |
| --------------------------------------------------------- | ---------------------------------------- |
| `packages/agents/core/orchestrator.ts`                    | Add 4 creation task types                |
| `packages/agents/core/creation-tools.ts`                  | New: NL parsing, confirmation formatting |
| `packages/agents/core/pipeline.ts`                        | Route creation intents                   |
| `packages/agents/tier2/controller-agent/tools.ts`         | Invoice + expense creation tools         |
| `packages/agents/tier2/compliance-agent/tools.ts`         | Vendor + customer creation tools         |
| `packages/agents/tier3/ledger-agent/tools.ts`             | Journal entry creation tool              |
| `apps/web/components/workspace/creation-confirm-card.tsx` | New: confirmation card                   |
| `apps/web/components/workspace/streaming-message.tsx`     | Render creation cards                    |
| `apps/web/server/routers/chat.ts`                         | confirmCreation mutation                 |
| `apps/web/lib/hooks/use-dashboard-chat.ts`                | Creation state management                |

## Non-Goals

- Replacing existing forms (they stay as fallback)
- Supporting all 15 creation types (start with top 5)
- Real-time validation against DB during parsing (validate on confirm)
- Multi-step creation flows (e.g., "create invoice with 5 line items" — keep it simple)
