---
name: create-agent
description: Creates or modifies LangGraph agents in the Xenboox codebase. Loops through create → typecheck → compile → eval → verify for each layer.
license: MIT
metadata:
  author: xenboox
  category: agent-infrastructure
  version: 2.0.0
  workflow: loop
---

# Create Agent — Loop Mode (Create → Typecheck → Compile → Eval → Verify)

## Role

You are an **Agent Builder** at Xenboox. You don't just scaffold agent files and declare done. You create each file, typecheck it, compile the graph, test with evals, verify confidence calibration, and only move to the next file when the current one is solid. Each layer must pass its gate before you build the next.

**Workflow Mode:** LOOP (Prompt Chaining with gates per layer)

- **Layer 1: State** — define schema → typecheck
- **Layer 2: Tools** — create tools → typecheck → verify entity scoping
- **Layer 3: Nodes** — create nodes → typecheck → verify LangFuse logging
- **Layer 4: Graph** — build graph → typecheck → compile → verify edges
- **Layer 5: Prompts** — create prompts → typecheck
- **Layer 6: Eval** — run eval suite → verify confidence → verify escalation
- **Layer 7: Integration** — wire to orchestrator → full typecheck → quality gate

**Non-negotiable rules:**

1. Each layer must typecheck before building the next
2. Entity scoping verified on every tool and node
3. Confidence field present in every output
4. Graph compiles and all edges resolve
5. Eval suite passes with expected scores
6. You report progress — "Layer 4/7: Graph (compiled, 3 nodes, 2 conditional edges)"

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ LAYER 1  │───▶│ LAYER 2  │───▶│ LAYER 3  │───▶│ LAYER 4  │
│ State    │    │ Tools    │    │ Nodes    │    │ Graph    │
│ Schema   │    │          │    │          │    │          │
│          │    │ GATE:    │    │ GATE:    │    │ GATE:    │
│ GATE:    │    │ entity   │    │ LangFuse │    │ compile  │
│ typecheck│    │ scoping  │    │ logging  │    │ + edges  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
┌──────────┐    ┌──────────┐    ┌──────────┐         │
│ LAYER 7  │◀───│ LAYER 6  │◀───│ LAYER 5  │◀────────┘
│ Integr-  │    │ Eval     │    │ Prompts  │
│ ation    │    │ Suite    │    │          │
│          │    │          │    │ GATE:    │
│ GATE:    │    │ GATE:    │    │ typecheck│
│ full     │    │ scores + │    │          │
│ typecheck│    │ confidence│   └──────────┘
└──────────┘    └──────────┘
```

---

## Phase 0: Plan — Define the Agent

Before scaffolding anything, define what you're building:

### Agent Definition

```markdown
## Agent: [agent-name]

**Tier:** [tier1 | tier2 | tier3 | platform]
**Purpose:** [What does this agent do?]
**Reports to:** [Which supervisor agent?]
**Manages:** [Which worker agents? (if tier2)]
**Model:** [haiku | sonnet — which model tier?]

### State Fields

- entityId, entityName, currency (inherited)
- [custom fields specific to this agent]

### Tools

- [tool_name]: [what it does]
- [tool_name]: [what it does]

### Nodes

- [node_name]: [what it does]
- [node_name]: [what it does]

### Graph Edges

- START → [node1]
- [node1] → [node2] (always)
- [node2] → [node3] (if confidence ≥ 0.7)
- [node2] → [escalate] (if confidence < 0.7)
- [node3] → END
- [escalate] → END

### Eval Cases

- [input] → [expected output]
- [input] → [expected escalation]
```

### Work Queue

```
AGENT QUEUE:
┌────┬──────────────────────────┬──────────┬──────────┐
│ #  │ Layer                    │ Status   │ Gate     │
├────┼──────────────────────────┼──────────┼──────────┤
│ 1  │ State schema             │ ⬜       │ typecheck│
│ 2  │ Tools                    │ ⬜       │ entity   │
│ 3  │ Nodes                    │ ⬜       │ LangFuse │
│ 4  │ Graph                    │ ⬜       │ compile  │
│ 5  │ Prompts                  │ ⬜       │ typecheck│
│ 6  │ Eval suite               │ ⬜       │ scores   │
│ 7  │ Integration (wire up)    │ ⬜       │ all pass │
└────┴──────────────────────────┴──────────┴──────────┘

AGENT: [name] | 0/7 layers complete
```

---

## Layer 1: State Schema

### Step 1: Create State File

Create `packages/agents/{tier}/{agent-name}/state.ts`:

```typescript
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";

const AuditEntrySchema = z.object({
  agentId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  details: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
});

export const AgentState = Annotation.Root({
  // Input context (always required)
  entityId: Annotation<string>,
  entityName: Annotation<string>,
  currency: Annotation<string>,

  // Task
  taskType: Annotation<string>,
  input: Annotation<Record<string, unknown>>,

  // Processing
  steps: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
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
    default: () => [],
  }),

  // Error tracking
  errors: Annotation<string[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  // [Custom fields for this agent]
});
```

### Step 2: State Quality Gate

```
□ entityId, entityName, currency present?
□ taskType and input present?
□ result, confidence, reasoning present?
□ escalatedTo, escalationReason present?
□ auditTrail with reducer?
□ errors with reducer?
□ Custom fields typed correctly?
```

---

## Layer 2: Tools

### Step 1: Create Tools File

Create `packages/agents/{tier}/{agent-name}/tools.ts`:

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";

export const getAccountBalance = tool(
  async ({ entityId, accountCode }) => {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, accountCode),
      ),
    });

    if (!account) {
      return { success: false, error: `Account ${accountCode} not found` };
    }

    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.accountId, account.id),
      with: { journalEntry: true },
    });

    const posted = lines.filter((l) => l.journalEntry.status === "posted");
    const balance = posted.reduce(
      (acc, l) => acc + Number(l.debit) - Number(l.credit),
      0,
    );

    return {
      success: true,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      balance,
      currency: "USD",
    };
  },
  {
    name: "get_account_balance",
    description: "Get the current balance of a specific account",
    schema: z.object({
      entityId: z.string().uuid(),
      accountCode: z.string().describe("Account code like '1000', '4010'"),
    }),
  },
);
```

### Step 2: Tools Quality Gate

```bash
pnpm typecheck --filter=agents
```

```
□ Typecheck passes?
□ Every tool accepts entityId as first parameter?
□ Every DB query scoped to entityId?
□ Every tool returns structured result?
□ Tool schemas use zod validation?
□ No hardcoded entity context?
```

**Gate:** Typecheck passes + entity scoping verified before moving to Nodes.

---

## Layer 3: Nodes

### Step 1: Create Nodes File

Create `packages/agents/{tier}/{agent-name}/nodes.ts`:

```typescript
import { langfuse } from "@xenboox/agents/core/langfuse";

export async function nodeProcess(state: typeof AgentState.State) {
  const trace = await langfuse.trace({
    name: `${state.taskType}-process`,
    metadata: {
      entityId: state.entityId,
      agentId: state.agentId,
      taskType: state.taskType,
    },
  });

  // ... processing logic ...

  await trace.update({ output: result });

  return {
    result,
    confidence,
    reasoning,
    auditTrail: [
      ...state.auditTrail,
      {
        agentId: state.agentId,
        action: "process",
        timestamp: new Date().toISOString(),
        details: { summary },
        confidence,
      },
    ],
  };
}
```

### Step 2: Nodes Quality Gate

```bash
pnpm typecheck --filter=agents
```

```
□ Typecheck passes?
□ Every node creates a LangFuse trace?
□ Every node returns confidence field?
□ Every node appends to auditTrail?
□ Every node handles errors gracefully?
□ No hardcoded entity context (received via state)?
```

---

## Layer 4: Graph

### Step 1: Build Graph

Create `packages/agents/{tier}/{agent-name}/graph.ts`:

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { nodeValidate, nodeProcess, nodeReview, nodeEscalate } from "./nodes";

const graph = new StateGraph(AgentState)
  .addNode("validate", nodeValidate)
  .addNode("process", nodeProcess)
  .addNode("review", nodeReview)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "validate")
  .addConditionalEdges("validate", (state) => {
    if (state.errors.length > 0) return END;
    return "process";
  })
  .addEdge("process", "review")
  .addConditionalEdges("review", (state) => {
    if (state.confidence < 0.7) return "escalate";
    return END;
  })
  .addEdge("escalate", END);

export const agent = graph.compile();
```

### Step 2: Graph Quality Gate

```bash
pnpm typecheck --filter=agents
```

```
□ Typecheck passes?
□ Graph compiles without errors?
□ All nodes referenced in graph are defined?
□ All edges resolve to valid nodes?
□ START connects to first node?
□ All terminal nodes connect to END?
□ Conditional edges cover all cases?
□ No unreachable nodes?
□ No infinite loops (recursion limit set)?
```

**Gate:** Graph compiles cleanly before moving to Prompts.

---

## Layer 5: Prompts

### Step 1: Create Prompts File

Create `packages/agents/{tier}/{agent-name}/prompts.ts`:

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
`;
}
```

### Step 2: Create Index File

Create `packages/agents/{tier}/{agent-name}/index.ts`:

```typescript
export { agent } from "./graph";
export { AgentState } from "./state";
```

### Step 3: Prompts Quality Gate

```bash
pnpm typecheck --filter=agents
```

```
□ Typecheck passes?
□ Index file exports agent and state?
□ Prompt includes entity scoping rule?
□ Prompt includes confidence rule?
□ Prompt includes escalation rule?
□ Prompt includes audit trail rule?
```

---

## Layer 6: Eval Suite

### Step 1: Create Eval Cases

Create eval test cases in `packages/agents/core/eval/` or test files:

```typescript
// Test: agent processes known input correctly
it("processes invoice creation correctly", async () => {
  const result = await agent.invoke({
    entityId: testEntityId,
    entityName: "Test Corp",
    currency: "GMD",
    taskType: "create_invoice",
    input: { customerName: "Acme Corp", amount: 5000 },
  });

  expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  expect(result.result).toBeDefined();
  expect(result.auditTrail.length).toBeGreaterThan(0);
});

// Test: agent escalates on uncertain input
it("escalates when confidence is low", async () => {
  const result = await agent.invoke({
    entityId: testEntityId,
    entityName: "Test Corp",
    currency: "GMD",
    taskType: "categorize_transaction",
    input: { description: "UNCLEAR PAYMENT XYZ" },
  });

  expect(result.confidence).toBeLessThan(0.7);
  expect(result.escalatedTo).toBeDefined();
});

// Test: entity scoping
it("scopes all queries to entity", async () => {
  const result = await agent.invoke({
    entityId: "wrong-entity-id",
    entityName: "Wrong Corp",
    currency: "GMD",
    taskType: "get_balance",
    input: { accountCode: "1000" },
  });

  // Should not return data for wrong entity
  expect(result.result).toBeNull();
});
```

### Step 2: Run Eval

```bash
pnpm test --filter=agents
# or
pnpm test:eval
```

### Step 3: Eval Quality Gate

```
□ All eval cases pass?
□ Confidence is calibrated (not always 0.9)?
□ Escalation works for uncertain input?
□ Entity scoping verified (wrong entityId returns empty)?
□ Audit trail is populated?
□ No eval() or hardcoded values in test?
```

---

## Layer 7: Integration — Final Verification

### Step 1: Wire to Orchestrator

If this agent is managed by a supervisor, wire the dispatch:

```typescript
// In supervisor's nodes.ts
// Add conditional edge to dispatch to this agent
```

### Step 2: Full Typecheck

```bash
pnpm typecheck
```

- [ ] 0 errors across all packages

### Step 3: Full Lint

```bash
pnpm lint
```

- [ ] 0 lint errors in new files

### Step 4: Run Full Eval Suite

```bash
pnpm test:eval
```

- [ ] All eval cases pass
- [ ] No regressions in other agents

### Integration Quality Gate

```
□ pnpm typecheck: 0 errors?
□ pnpm lint: 0 errors in new files?
□ Eval suite: all cases pass?
□ Graph compiles: all edges resolve?
□ Entity scoping: verified on all tools?
□ Confidence: calibrated in all outputs?
□ LangFuse: traces appear in dashboard?
□ Escalation: works for low confidence?
□ Audit trail: populated on all actions?
```

---

## Progress Reporting

### During Build

```
AGENT BUILD: Reconciliation Agent
Layer: 4/7 — Graph

├── Layer 1 (State):    ✅ — typecheck passed, 8 fields
├── Layer 2 (Tools):    ✅ — 3 tools, entity scoping verified
├── Layer 3 (Nodes):    ✅ — 4 nodes, LangFuse logging verified
├── Layer 4 (Graph):    🔄 — compiling... 4 nodes, 3 edges
│   Edge validate→process: ✅
│   Edge process→review: ✅
│   Edge review→escalate (conditional): ✅
│   Compilation: ✅
├── Layer 5 (Prompts):  ⬜ pending
├── Layer 6 (Eval):     ⬜ pending
└── Layer 7 (Integration): ⬜ pending
```

### Final Report

```markdown
## Agent: [Name]

### Status: ✅ COMPLETE

### Layers Built

| #   | Layer       | Files                | Typecheck | Gate                          |
| --- | ----------- | -------------------- | --------- | ----------------------------- |
| 1   | State       | state.ts             | ✅        | ✅ Schema correct             |
| 2   | Tools       | tools.ts             | ✅        | ✅ Entity scoping verified    |
| 3   | Nodes       | nodes.ts             | ✅        | ✅ LangFuse logging verified  |
| 4   | Graph       | graph.ts             | ✅        | ✅ Compiled, 4 nodes, 3 edges |
| 5   | Prompts     | prompts.ts, index.ts | ✅        | ✅ Rules included             |
| 6   | Eval        | eval cases           | ✅        | ✅ All cases pass             |
| 7   | Integration | orchestrator wiring  | ✅        | ✅ Full typecheck pass        |

### Agent Architecture
```

START → validate → process → review → END
↓ (confidence < 0.7)
escalate → END

```

### Verification
- pnpm typecheck: ✅ 0 errors
- pnpm lint: ✅ 0 errors
- Eval suite: ✅ 3/3 cases pass
- Entity scoping: ✅ verified on all tools
- Confidence: ✅ calibrated (0.3-0.95 range)
- LangFuse: ✅ traces appear
- Escalation: ✅ works for uncertain input
- Audit trail: ✅ populated on all actions
```

---

## Code Patterns

### Entity Scoping (Non-Negotiable)

```typescript
// ALWAYS scope to entityId
const data = await db.query.table.findMany({
  where: eq(table.entityId, entityId),
});

// NEVER query without entity scope
const data = await db.query.table.findMany(); // WRONG
```

### Confidence Scoring

```typescript
// High confidence: deterministic calculation
confidence = 1.0; // double-entry balanced, all data present

// Medium confidence: reasonable inference
confidence = 0.8; // matched invoice to PO with high certainty

// Low confidence: needs human review
confidence = 0.3; // can't match transaction, ambiguous categorization
```

### LangFuse Logging

```typescript
await langfuse.span({
  name: "agent-action",
  traceId: traceId,
  input: inputData,
  output: outputData,
  metadata: { entityId, confidence },
});
```

### Model Tier Usage

```
Haiku:  Routine tasks — extraction, categorization, matching
Sonnet: Complex tasks — judgment, strategy, multi-step reasoning
```

---

## Common Pitfalls

1. **Missing entity scoping** — Every query MUST have `entityId` (#1 rule)
2. **No confidence field** — Every output MUST include confidence
3. **Guessing instead of escalating** — When uncertain, escalate. Never guess on financial data
4. **Missing audit trail** — Every action must be logged
5. **Hardcoded entity context** — Always receive via state, never hardcode
6. **Skipping LangFuse** — Every action must be traced
7. **Using Haiku for complex decisions** — Use Sonnet for judgment tasks
8. **Not testing escalation** — Feed uncertain input, verify it escalates
9. **Graph has unreachable nodes** — Every node must be reachable from START

---

## Failure Recovery

### Typecheck errors

1. Read the error message carefully
2. Fix import paths (most common)
3. Fix type mismatches (check state vs tool types)
4. Re-run typecheck after each fix
5. Max 5 fix attempts per layer

### Graph won't compile

1. Check all node functions are defined
2. Check all edges reference valid nodes
3. Check conditional edges cover all cases
4. Check START/END connections
5. Check for cycles without recursion limit

### Eval cases fail

1. Read the failure message
2. Check if the test expectation is correct
3. Check if the agent's output matches expected format
4. Check entity scoping in test (use correct entityId)
5. If confidence is wrong: check calibration logic

### Budget Guard

- Max **5 typecheck fix attempts** per layer
- Max **3 eval runs** (fix between each)
- Max **2 full passes** on integration gate
- If budget exceeded: report progress, list remaining layers
