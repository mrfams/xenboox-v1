# Phase 6: Agent Orchestration Wiring — Implementation Plan

> **For agentic workers:** Use `fire tdd` or `fire executing-plans` to implement this plan task-by-task.

**Goal:** Wire all 19 agents into the three-tier hierarchy so they communicate, hand off tasks, and escalate properly.

**Architecture:** Tier 2 department heads (Controller, Treasury, Payroll Manager, Compliance) call Tier 3 worker agents via `getAgentGraph()`. Tier 1 CFO calls Tier 2 via `fanOutToDepartments()`. Platform agents (Reporting, Document, Budget, Analytics) are called on-demand by any tier.

**Tech Stack:** LangGraph StateGraph, TypeScript, Vitest, LangFuse tracing

**Spec:** `docs/agents/` (agent specs), `AGENTS.md` (communication pattern)

---

## What's Already Wired ✅

| Wiring | Status | File |
|--------|--------|------|
| CFO → All Departments (fan-out) | ✅ Done | `tier1/cfo-agent/nodes.ts` |
| Controller → Ledger (post entries) | ✅ Done | `tier2/controller-agent/nodes.ts:81` |
| Controller → Ledger (trial balance) | ✅ Done | `tier2/controller-agent/nodes.ts:203` |
| Controller → AP (aging report) | ✅ Done | `tier2/controller-agent/nodes.ts:353` |
| Controller → AR (aging report) | ✅ Done | `tier2/controller-agent/nodes.ts:378` |
| Treasury → Reconciliation | ✅ Done | `tier2/treasury-agent/nodes.ts:96` |
| Orchestrator routing table | ✅ Done | `core/orchestrator.ts` |
| getAgentGraph() lazy imports | ✅ Done | `core/orchestrator.ts` |
| Close pipeline (CFO → all depts) | ✅ Done | `core/close-pipeline.ts` |
| Pipeline (11-step CFO flow) | ✅ Done | `core/pipeline.ts` |

## What's Missing ❌

| Wiring | Priority | Agents |
|--------|----------|--------|
| Compliance → Audit | P0 | compliance → audit |
| Payroll Manager → Payroll Worker | P0 | payroll_manager → payroll_worker |
| Treasury → Cash | P1 | treasury → cash |
| Treasury → Mobile Money | P1 | treasury → mobile_money |
| Treasury → Expense | P1 | treasury → expense |
| Controller → Asset (depreciation) | P1 | controller → asset |
| Controller → Inventory (COGS) | P1 | controller → inventory |
| CFO → Reporting (on-demand) | P2 | cfo → reporting |
| Any → Document (ingest) | P2 | any → document |
| Any → Budget (forecast) | P2 | any → budget |
| Any → Analytics (ratios) | P2 | any → analytics |

---

## Task 1: Wire Compliance Agent → Audit Agent

**Files:**
- Modify: `packages/agents/tier2/compliance-agent/nodes.ts`
- Test: `packages/agents/__tests__/phase6-orchestration.test.ts`

The Compliance Agent should call Audit Agent for sampling and drift analysis during tax reviews and compliance checks.

- [ ] **Step 1: Add getAgentGraph import to compliance-agent/nodes.ts**

```typescript
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState } from "../../core/orchestrator";
```

- [ ] **Step 2: Add audit dispatch node to compliance agent**

Add after `nodeReviewTaxPosition`:

```typescript
// Phase 6: Call Audit Agent for compliance sampling
export async function nodeRunComplianceAudit(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-run-audit" });

  try {
    const auditGraph = await getAgentGraph("audit");
    const auditState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "audit_sampling",
        status: "processing",
        input: {
          period: (state.currentOperation?.input as Record<string, unknown>)?.period,
          scope: "compliance",
        },
        output: null,
        error: null,
      },
    };
    const auditResult = await auditGraph.invoke(auditState);

    await trace.update({
      output: {
        auditCalled: true,
        confidence: (auditResult as any).confidence ?? 0,
      },
    });

    return {
      result: {
        type: "compliance_audit",
        auditResult: (auditResult as any).result,
      },
      confidence: (auditResult as any).confidence ?? 0.8,
      reasoning: `Audit Agent completed compliance sampling`,
    };
  } catch (err) {
    await trace.update({
      output: { auditCalled: false, error: err instanceof Error ? err.message : String(err) },
    });
    // Non-fatal: compliance review continues without audit
    return {
      confidence: 0.7,
      reasoning: "Audit Agent unavailable — compliance review proceeded without sampling",
    };
  }
}
```

- [ ] **Step 3: Wire node into compliance agent graph**

In `packages/agents/tier2/compliance-agent/graph.ts`, add the node and edge:

```typescript
.addNode("run_compliance_audit", nodeRunComplianceAudit)
```

Route from `review_tax_position` to `run_compliance_audit` before `escalate`/`END`.

- [ ] **Step 4: Add test for Compliance → Audit wiring**

Add to `packages/agents/__tests__/phase6-orchestration.test.ts`:

```typescript
describe("Phase 6: Compliance Agent → Audit Agent wiring", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("nodeRunComplianceAudit dispatches to Audit Agent", async () => {
    const mockAuditGraph = {
      invoke: vi.fn().mockResolvedValue({
        entityId: "test-entity",
        result: { type: "audit_complete", samplesReviewed: 25, findings: [] },
        confidence: 0.92,
        reasoning: "Audit sampling completed",
        errors: [],
        auditTrail: [],
      }),
    };

    // Override getAgentGraph for this test
    const { getAgentGraph } = await import("../core/orchestrator");
    (getAgentGraph as any).mockImplementation(async (id: string) => {
      if (id === "audit") return mockAuditGraph;
      return { invoke: vi.fn() };
    });

    const { nodeRunComplianceAudit } = await import("../tier2/compliance-agent/nodes");

    const state = {
      entityId: "test-entity",
      entityName: "Test Entity",
      currency: "GMD",
      currentOperation: {
        type: "tax_review",
        status: "processing",
        input: { period: "2026-07" },
        output: null,
        error: null,
      },
    };

    const result = await nodeRunComplianceAudit(state as any);

    expect(mockAuditGraph.invoke).toHaveBeenCalledTimes(1);
    expect(mockAuditGraph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "test-entity",
        currentOperation: expect.objectContaining({ type: "audit_sampling" }),
      })
    );
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add packages/agents/tier2/compliance-agent/ packages/agents/__tests__/phase6-orchestration.test.ts
git commit -m "feat(agents): wire Compliance Agent → Audit Agent for compliance sampling"
```

---

## Task 2: Wire Payroll Manager → Payroll Worker

**Files:**
- Modify: `packages/agents/tier2/payroll-manager-agent/nodes.ts`
- Modify: `packages/agents/tier2/payroll-manager-agent/graph.ts`
- Test: `packages/agents/__tests__/phase6-orchestration.test.ts`

The Payroll Manager validates payroll data, then dispatches to Payroll Worker for PAYE calculation, social security, and payslip generation.

- [ ] **Step 1: Add imports to payroll-manager-agent/nodes.ts**

```typescript
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState } from "../../core/orchestrator";
```

- [ ] **Step 2: Add dispatch node**

```typescript
// Phase 6: Dispatch validated payroll to Payroll Worker for calculations
export async function nodeDispatchToWorker(state: PayrollManagerStateType) {
  const trace = await langfuse.span({ name: "payroll-manager-dispatch" });

  const payrollData = state.currentOperation?.input?.payroll;
  if (!payrollData) {
    return { errors: ["No payroll data to dispatch"], confidence: 0 };
  }

  try {
    const workerGraph = await getAgentGraph("payroll_worker");
    const workerState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "process_payroll_batch",
        status: "processing",
        input: { payroll: payrollData },
        output: null,
        error: null,
      },
    };
    const workerResult = await workerGraph.invoke(workerState);

    await trace.update({
      output: {
        workerCalled: true,
        confidence: (workerResult as any).confidence ?? 0,
      },
    });

    return {
      result: {
        type: "payroll_dispatched",
        workerResult: (workerResult as any).result,
      },
      confidence: (workerResult as any).confidence ?? 0.85,
      reasoning: "Payroll Worker completed PAYE, SSRC, and payslip generation",
    };
  } catch (err) {
    await trace.update({ output: { workerCalled: false, error: err instanceof Error ? err.message : String(err) } });
    return {
      errors: [`Payroll Worker dispatch failed: ${err instanceof Error ? err.message : String(err)}`],
      confidence: 0,
      reasoning: "Payroll Worker unavailable",
    };
  }
}
```

- [ ] **Step 3: Wire into graph**

In `graph.ts`, add node and route from validation success to dispatch.

- [ ] **Step 4: Add test**

```typescript
describe("Phase 6: Payroll Manager → Payroll Worker wiring", () => {
  it("nodeDispatchToWorker dispatches to Payroll Worker", async () => {
    // Similar pattern to Task 1 test
  });
});
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(agents): wire Payroll Manager → Payroll Worker for payroll processing"
```

---

## Task 3: Wire Treasury → Cash Agent

**Files:**
- Modify: `packages/agents/tier2/treasury-agent/nodes.ts`
- Test: `packages/agents/__tests__/phase6-orchestration.test.ts`

Treasury should call Cash Agent for imprest tracking and cash counts.

- [ ] **Step 1: Add cash dispatch to treasury-agent/nodes.ts**

Add after `nodeRunReconciliation`:

```typescript
// Phase 6: Call Cash Agent for imprest/cash count
export async function nodeRunCashCheck(state: TreasuryStateType) {
  const trace = await langfuse.span({ name: "treasury-cash-check" });

  try {
    const cashGraph = await getAgentGraph("cash");
    const cashState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "cash_count",
        status: "processing",
        input: {},
        output: null,
        error: null,
      },
    };
    const cashResult = await cashGraph.invoke(cashState);

    return {
      result: { type: "cash_check", cashResult: (cashResult as any).result },
      confidence: (cashResult as any).confidence ?? 0.85,
      reasoning: "Cash Agent completed imprest verification",
    };
  } catch (err) {
    return {
      confidence: 0.7,
      reasoning: "Cash Agent unavailable — treasury proceeded without cash verification",
    };
  }
}
```

- [ ] **Step 2: Wire into treasury graph**
- [ ] **Step 3: Add test**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agents): wire Treasury → Cash Agent for imprest tracking"
```

---

## Task 4: Wire Treasury → Mobile Money Agent

**Files:**
- Modify: `packages/agents/tier2/treasury-agent/nodes.ts`

- [ ] **Step 1: Add mobile money dispatch**

```typescript
// Phase 6: Call Mobile Money Agent for MM reconciliation
export async function nodeRunMobileMoneyReconciliation(state: TreasuryStateType) {
  const trace = await langfuse.span({ name: "treasury-mm-reconciliation" });

  try {
    const mmGraph = await getAgentGraph("mobile_money");
    const mmState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "mm_reconcile",
        status: "processing",
        input: {},
        output: null,
        error: null,
      },
    };
    const mmResult = await mmGraph.invoke(mmState);

    return {
      result: { type: "mm_reconciliation", mmResult: (mmResult as any).result },
      confidence: (mmResult as any).confidence ?? 0.85,
      reasoning: "Mobile Money Agent completed reconciliation",
    };
  } catch (err) {
    return {
      confidence: 0.7,
      reasoning: "Mobile Money Agent unavailable — treasury proceeded without MM reconciliation",
    };
  }
}
```

- [ ] **Step 2: Wire into graph**
- [ ] **Step 3: Add test**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agents): wire Treasury → Mobile Money Agent for MM reconciliation"
```

---

## Task 5: Wire Treasury → Expense Agent

**Files:**
- Modify: `packages/agents/tier2/treasury-agent/nodes.ts`

- [ ] **Step 1: Add expense dispatch**

```typescript
// Phase 6: Call Expense Agent for expense processing
export async function nodeProcessExpenses(state: TreasuryStateType) {
  const trace = await langfuse.span({ name: "treasury-expense-processing" });

  try {
    const expenseGraph = await getAgentGraph("expense");
    const expenseState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "submit_expense",
        status: "processing",
        input: (state.currentOperation?.input as Record<string, unknown>)?.expense ?? {},
        output: null,
        error: null,
      },
    };
    const expenseResult = await expenseGraph.invoke(expenseState);

    return {
      result: { type: "expense_processed", expenseResult: (expenseResult as any).result },
      confidence: (expenseResult as any).confidence ?? 0.85,
      reasoning: "Expense Agent processed expense claim",
    };
  } catch (err) {
    return {
      errors: [`Expense Agent dispatch failed: ${err instanceof Error ? err.message : String(err)}`],
      confidence: 0,
      reasoning: "Expense Agent unavailable",
    };
  }
}
```

- [ ] **Step 2: Wire into graph**
- [ ] **Step 3: Add test**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agents): wire Treasury → Expense Agent for expense processing"
```

---

## Task 6: Wire Controller → Asset Agent (Depreciation)

**Files:**
- Modify: `packages/agents/tier2/controller-agent/nodes.ts`

- [ ] **Step 1: Add asset depreciation dispatch to close checklist**

In `nodeRunCloseChecklist`, after AP/AR aging, add:

```typescript
// Phase 6: Call Asset Agent for depreciation
let depreciationResult: any = null;
try {
  const assetGraph = await getAgentGraph("asset");
  const assetState: AgentState = {
    entityId: state.entityId,
    entityName: state.entityName,
    currency: state.currency,
    currentOperation: {
      type: "depreciation",
      status: "processing",
      input: { period: checklist.period },
      output: null,
      error: null,
    },
  };
  depreciationResult = await assetGraph.invoke(assetState);
} catch (err) {
  langfuse.event({
    name: "controller-asset-dispatch-failed",
    metadata: { error: err instanceof Error ? err.message : String(err) },
  });
}
```

- [ ] **Step 2: Update checklist item based on result**
- [ ] **Step 3: Add test**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agents): wire Controller → Asset Agent for depreciation in close checklist"
```

---

## Task 7: Wire Controller → Inventory Agent (COGS)

**Files:**
- Modify: `packages/agents/tier2/controller-agent/nodes.ts`

- [ ] **Step 1: Add inventory dispatch to close checklist**

```typescript
// Phase 6: Call Inventory Agent for COGS calculation
let inventoryResult: any = null;
try {
  const inventoryGraph = await getAgentGraph("inventory");
  const inventoryState: AgentState = {
    entityId: state.entityId,
    entityName: state.entityName,
    currency: state.currency,
    currentOperation: {
      type: "cogs",
      status: "processing",
      input: { period: checklist.period },
      output: null,
      error: null,
    },
  };
  inventoryResult = await inventoryGraph.invoke(inventoryState);
} catch (err) {
  langfuse.event({
    name: "controller-inventory-dispatch-failed",
    metadata: { error: err instanceof Error ? err.message : String(err) },
  });
}
```

- [ ] **Step 2: Update checklist item**
- [ ] **Step 3: Add test**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agents): wire Controller → Inventory Agent for COGS in close checklist"
```

---

## Task 8: Add Phase 6 Wiring Tests for All New Connections

**Files:**
- Modify: `packages/agents/__tests__/phase6-orchestration.test.ts`

- [ ] **Step 1: Add test suite for Treasury → Cash/MobileMoney/Expense**

```typescript
describe("Phase 6: Treasury Agent → Cash/MobileMoney/Expense wiring", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("nodeRunCashCheck dispatches to Cash Agent", async () => { /* ... */ });
  it("nodeRunMobileMoneyReconciliation dispatches to Mobile Money Agent", async () => { /* ... */ });
  it("nodeProcessExpenses dispatches to Expense Agent", async () => { /* ... */ });
  it("handles Cash Agent failure gracefully", async () => { /* ... */ });
  it("handles Mobile Money Agent failure gracefully", async () => { /* ... */ });
});
```

- [ ] **Step 2: Add test suite for Controller → Asset/Inventory**

```typescript
describe("Phase 6: Controller Agent → Asset/Inventory wiring (close checklist)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("nodeRunCloseChecklist calls Asset Agent for depreciation", async () => { /* ... */ });
  it("nodeRunCloseChecklist calls Inventory Agent for COGS", async () => { /* ... */ });
  it("handles Asset Agent failure gracefully", async () => { /* ... */ });
  it("handles Inventory Agent failure gracefully", async () => { /* ... */ });
});
```

- [ ] **Step 3: Add humanResponse propagation test**

```typescript
describe("Phase 6: humanResponse propagation", () => {
  it("propagates humanResponse from worker agents through hierarchy", async () => { /* ... */ });
  it("aggregates errors from multiple agent failures", async () => { /* ... */ });
});
```

- [ ] **Step 4: Commit**

```bash
git commit -m "test(agents): add Phase 6 wiring tests for all new agent connections"
```

---

## Task 9: Verify Full Orchestration Flow

- [ ] **Step 1: Run full test suite**

```bash
cd packages/agents && npx vitest run __tests__/phase6-orchestration.test.ts
```

- [ ] **Step 2: Run eval suite (report-only)**

```bash
cd packages/agents && npx tsx core/eval/runner.ts
```

- [ ] **Step 3: Verify all 499 eval cases still parse**

```bash
cd packages/agents && node -e "const fs=require('fs'),yaml=require('yaml'),path=require('path');const dir=path.join(__dirname,'datasets');const files=fs.readdirSync(dir).filter(f=>f.endsWith('-golden.yaml'));let t=0;for(const f of files){const p=yaml.parse(fs.readFileSync(path.join(dir,f),'utf8'));t+=(p.cases||[]).length;}console.log(t+' cases valid');"
```

- [ ] **Step 4: Update BUILD_LOG.md**

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "feat(agents): complete Phase 6 orchestration wiring — all 19 agents connected"
git push
```

---

## Verification Checklist

After all tasks:

- [ ] All 19 agents reachable via `getAgentGraph()`
- [ ] All tier 2 → tier 3 wiring tested
- [ ] All agent failures handled gracefully (non-fatal where appropriate)
- [ ] All dispatches logged to LangFuse
- [ ] humanResponse propagates through hierarchy
- [ ] No circular agent calls
- [ ] All eval datasets still valid (499 cases)
- [ ] Phase 6 test suite passes
- [ ] BUILD_LOG.md updated
