# Skill: Create Agent
> Use this when creating a new LangGraph agent or modifying agent behavior in the Xenboox codebase.

## Prerequisites

- Read the relevant agent spec in `docs/agents/`
- Read `AGENTS.md` for project conventions
- Read `ARCHITECTURE.md` for agent architecture patterns
- Understand the three-tier hierarchy: Tier 1 (Strategic) → Tier 2 (Management) → Tier 3 (Worker)

## Steps

### 1. Determine Agent Tier and Location

```
packages/agents/
├── tier1/           # CFO Agent only
├── tier2/           # Controller, Treasury, Payroll Manager, Compliance
├── tier3/           # Worker agents (Ledger, AP, AR, Recon, Cash, etc.)
└── platform/        # Reporting, Budget, Analytics, Document
```

### 2. Create Agent Directory Structure

```
packages/agents/{tier}/{agent-name}/
├── index.ts         # Public exports
├── graph.ts         # StateGraph definition and compilation
├── state.ts         # Zod state schema
├── nodes.ts         # Graph node functions
├── tools.ts         # Agent-specific tools (DB queries, API calls)
└── prompts.ts       # System prompts and prompt templates
```

### 3. Define State Schema (state.ts)

```typescript
import { Annotation } from "@langchain/langgraph"
import { z } from "zod"

// Reusable types
const AuditEntrySchema = z.object({
  agentId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  details: z.record(z.unknown()),
  confidence: z.number().min(0).max(1)
})

export const AgentState = Annotation.Root({
  // Input context
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Task
  taskType: Annotation<string>,
  input: Annotation<Record<string, unknown>>,

  // Processing
  steps: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => []
  }),

  // Output
  result: Annotation<unknown>,
  confidence: Annotation<number>,
  reasoning: Annotation<string>,

  // Escalation
  escalatedTo: Annotation<string | null>,
  escalationReason: Annotation<string | null>,

  // Audit
  auditTrail: Annotation<Array<z.infer<typeof AuditEntrySchema>>>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => []
  }),

  // Error tracking
  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => []
  })
})
```

### 4. Create Tools (tools.ts)

Every tool MUST:
- Accept `entityId` as first parameter
- Scope all DB queries to that entity
- Return structured results with confidence
- Log to audit trail

```typescript
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"

export const getAccountBalance = tool(
  async ({ entityId, accountCode }) => {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, accountCode)
      )
    })

    if (!account) {
      return { success: false, error: `Account ${accountCode} not found` }
    }

    // Query posted journal entry lines for this account
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.accountId, account.id),
      with: { journalEntry: true }
    })

    const posted = lines.filter(l => l.journalEntry.status === "posted")
    const balance = posted.reduce(
      (acc, l) => acc + Number(l.debit) - Number(l.credit),
      0
    )

    return {
      success: true,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      balance,
      currency: "GMD" // from entity context
    }
  },
  {
    name: "get_account_balance",
    description: "Get the current balance of a specific account in the chart of accounts",
    schema: z.object({
      entityId: z.string().uuid(),
      accountCode: z.string().describe("Account code like '1000', '4010'")
    })
  }
)
```

### 5. Build the Graph (graph.ts)

```typescript
import { StateGraph, START, END } from "@langchain/langgraph"
import { AgentState } from "./state"
import { nodeValidate, nodeProcess, nodeReview } from "./nodes"

const graph = new StateGraph(AgentState)
  .addNode("validate", nodeValidate)
  .addNode("process", nodeProcess)
  .addNode("review", nodeReview)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", (state) => {
    if (state.errors.length > 0) return END
    return "process"
  })
  .addEdge("process", "review")
  .addConditionalEdges("review", (state) => {
    if (state.confidence < 0.7) return "escalate"
    return END
  })
  .addNode("escalate", nodeEscalate)
  .addEdge("escalate", END)

export const agent = graph.compile()
```

### 6. Write Node Functions (nodes.ts)

Each node:
- Receives state
- Performs work (DB queries, calculations, LLM calls)
- Returns state updates
- Logs to LangFuse

```typescript
import { langfuse } from "@xenboox/agents/core/langfuse"

export async function nodeProcess(state: typeof AgentState.State) {
  const trace = await langfuse.trace({
    name: `${state.agentId}-process`,
    metadata: {
      entityId: state.entityId,
      agentId: state.agentId,
      taskType: state.taskType
    }
  })

  // ... processing logic ...

  await trace.update({ output: result })

  return {
    result,
    confidence,
    reasoning,
    auditTrail: [...state.auditTrail, {
      agentId: state.agentId,
      action: "process",
      timestamp: new Date().toISOString(),
      details: { summary },
      confidence
    }]
  }
}
```

### 7. Create System Prompt (prompts.ts)

```typescript
export function buildSystemPrompt(agentName: string, entityContext: string) {
  return `You are the ${agentName} for Xenboox accounting platform.

ENTITY CONTEXT:
${entityContext}

RULES:
1. Every database query must be scoped to the entity_id provided.
2. Never guess on financial data. If uncertain, set confidence below 0.4 and escalate.
3. All outputs must include a confidence score (0.0 - 1.0).
4. Log every action to the audit trail.
5. Use plain English in all reasoning fields.
6. Double-entry must always balance. No exceptions.

OUTPUT FORMAT:
Return your result as a JSON object with:
- result: the output data
- confidence: 0.0-1.0
- reasoning: plain English explanation
- auditTrail: array of actions taken
`
}
```

## Code Patterns

### Entity Scoping (Non-Negotiable)

```typescript
// ALWAYS scope to entityId
const data = await db.query.table.findMany({
  where: eq(table.entityId, entityId)
})

// NEVER query without entity scope
const data = await db.query.table.findMany() // WRONG
```

### Confidence Scoring

```typescript
// High confidence: deterministic calculation
confidence = 1.0  // double-entry balanced, all data present

// Medium confidence: reasonable inference
confidence = 0.8  // matched invoice to PO with high certainty

// Low confidence: needs human review
confidence = 0.3  // can't match transaction, ambiguous categorization
```

### LangFuse Logging

```typescript
await langfuse.span({
  name: "agent-action",
  traceId: traceId,
  input: inputData,
  output: outputData,
  metadata: { entityId, confidence }
})
```

## Common Pitfalls

1. **Missing entity scoping** — Every query MUST have `entityId`. This is the #1 rule.
2. **No confidence field** — Every agent output MUST include confidence.
3. **Guessing instead of escalating** — When uncertain, escalate. Never guess on financial data.
4. **Missing audit trail** — Every action must be logged. If it's not logged, it didn't happen.
5. **Hardcoded entity context** — Always receive via state, never hardcode.
6. **Skipping LangFuse** — Every agent action must be traced for observability.
7. **Using Haiku for complex decisions** — Use Sonnet for anything requiring judgment.

## Verification

After creating or modifying an agent:

1. Run `pnpm typecheck` — must pass with no errors
2. Run `pnpm lint` — must pass
3. Verify entity scoping in every tool (grep for `findMany` without `entityId`)
4. Verify confidence field in all outputs
5. Verify LangFuse trace appears in dashboard
6. Test with known input → compare to expected output (golden dataset)
7. Test escalation: feed uncertain input → verify it escalates to supervisor
