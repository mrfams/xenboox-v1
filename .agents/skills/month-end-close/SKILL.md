---
name: month-end-close
description: Implements, modifies, or troubleshoots the autonomous month-end close flow in Xenboox. Use when working on close orchestration, agent confirmation logic, close state machine, or error recovery for the close process.
license: MIT
metadata:
  author: xenboox
  category: accounting-workflow
---

## Prerequisites

- Read `AGENTS.md` for agent communication patterns
- Read `ARCHITECTURE.md` for close flow architecture
- Read the CFO Agent spec in `docs/agents/cfo-agent.md`

## Overview

The month-end close is the core autonomous workflow. All agents run continuously throughout the month. At month-end, the CFO Agent orchestrates a close sequence where every department head confirms their domain is clean.

```
CFO Agent triggers close
  │
  ├── Controller Agent confirms
  │   ├── All transactions posted (Ledger Agent)
  │   ├── Trial balance balanced
  │   ├── AP reconciled
  │   └── AR reconciled
  │
  ├── Treasury Agent confirms
  │   ├── Bank reconciliation complete
  │   ├── Cash reconciliation clean
  │   └── Mobile money reconciled
  │
  ├── Compliance Agent confirms (Phase 2)
  │   ├── VAT calculated
  │   └── No missed filing deadlines
  │
  └── All confirmed → Close triggers automatically
      ├── Reporting Agent generates package
      ├── Owner receives notification
      └── Passive approval (owner does nothing if satisfied)
```

## Steps

### 1. Close State Machine

```typescript
// packages/agents/core/close-flow.ts

type ClosePhase =
  | "idle"
  | "initiated"
  | "controller_review"
  | "treasury_review"
  | "compliance_review"
  | "all_confirmed"
  | "report_generation"
  | "completed"
  | "error"
  | "recovery";

interface CloseState {
  entityId: string;
  year: number;
  month: number;
  phase: ClosePhase;
  controllerConfirmed: boolean;
  treasuryConfirmed: boolean;
  complianceConfirmed: boolean;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  confidence: number;
}

const closeStateMachine: Record<ClosePhase, ClosePhase[]> = {
  idle: ["initiated"],
  initiated: ["controller_review", "treasury_review", "compliance_review"],
  controller_review: ["all_confirmed", "error"],
  treasury_review: ["all_confirmed", "error"],
  compliance_review: ["all_confirmed", "error"],
  all_confirmed: ["report_generation"],
  report_generation: ["completed", "error"],
  completed: ["idle"],
  error: ["recovery"],
  recovery: ["initiated"],
};
```

### 2. CFO Agent Initiates Close

```typescript
// packages/agents/tier1/cfo-agent/nodes.ts

export async function initiateClose(state: typeof CfoState.State) {
  const { entityId, year, month } = state.input;

  // Log close initiation
  await logAudit({
    entityId,
    agentId: "cfo-agent",
    action: "close.initiated",
    details: { year, month },
  });

  // Notify owner
  await sendEmail({
    to: state.ownerEmail,
    subject: `Month-end close initiated for ${getMonthName(month)} ${year}`,
    body: `The autonomous close process has begun. You'll receive a summary when complete.`,
  });

  // Fan out to department heads in parallel
  return {
    phase: "initiated" as ClosePhase,
    departmentTasks: [
      { agent: "controller-agent", task: "confirm_close_readiness" },
      { agent: "treasury-agent", task: "confirm_close_readiness" },
      { agent: "compliance-agent", task: "confirm_close_readiness" },
    ],
  };
}
```

### 3. Controller Agent Review

```typescript
// packages/agents/tier2/controller-agent/nodes.ts

export async function reviewForClose(state: typeof ControllerState.State) {
  const { entityId, year, month } = state.input;
  const issues: string[] = [];

  // 1. Check all transactions are posted (no drafts)
  const draftEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "draft"),
      // in the close period
      gte(journalEntries.date, periodStart),
      lte(journalEntries.date, periodEnd),
    ),
  });

  if (draftEntries.length > 0) {
    issues.push(`${draftEntries.length} draft journal entries not posted`);
  }

  // 2. Verify trial balance
  const trialBalance = await generateTrialBalance(entityId, year, month);
  const totalDebit = trialBalance.reduce((sum, a) => sum + a.debitTotal, 0);
  const totalCredit = trialBalance.reduce((sum, a) => sum + a.creditTotal, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    issues.push("Trial balance does not balance");
  }

  // 3. Check AP aging
  const unpaidAP = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
      not(inArray(invoicesAp.status, ["paid", "voided"])),
    ),
  });

  // 4. Check AR aging
  const unpaidAR = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      not(inArray(salesInvoices.status, ["paid", "written_off", "voided"])),
    ),
  });

  const confidence = issues.length === 0 ? 0.95 : 0.3;

  return {
    controllerConfirmed: issues.length === 0,
    confidence,
    reasoning:
      issues.length === 0
        ? "All transactions posted, trial balance balanced, AP and AR reviewed."
        : `Issues found: ${issues.join("; ")}`,
    errors: issues,
  };
}
```

### 4. Treasury Agent Review

```typescript
// packages/agents/tier2/treasury-agent/nodes.ts

export async function reviewForClose(state: typeof TreasuryState.State) {
  const { entityId, year, month } = state.input;
  const issues: string[] = [];

  // 1. Check all bank reconciliations complete
  const pendingRecons = await db.query.reconciliations.findMany({
    where: and(
      eq(reconciliations.entityId, entityId),
      eq(reconciliations.status, "in_progress"),
    ),
  });

  if (pendingRecons.length > 0) {
    issues.push(`${pendingRecons.length} bank reconciliations incomplete`);
  }

  // 2. Check cash reconciliation
  const cashAccounts = await db.query.cashAccounts.findMany({
    where: eq(cashAccounts.entityId, entityId),
  });

  for (const cash of cashAccounts) {
    const balance = await calculateCashBalance(cash.id, year, month);
    if (Math.abs(balance - cash.currentBalance) > 0.01) {
      issues.push(`Cash account ${cash.name}: balance mismatch`);
    }
  }

  // 3. Check mobile money reconciliation
  const mmAccounts = await db.query.mobileMoneyAccounts.findMany({
    where: eq(mobileMoneyAccounts.entityId, entityId),
  });

  for (const mm of mmAccounts) {
    const reconciled = await checkMobileMoneyReconciled(mm.id, year, month);
    if (!reconciled) {
      issues.push(`Mobile money ${mm.provider}: not reconciled`);
    }
  }

  return {
    treasuryConfirmed: issues.length === 0,
    confidence: issues.length === 0 ? 0.95 : 0.3,
    reasoning:
      issues.length === 0
        ? "All bank reconciliations complete, cash and mobile money reconciled."
        : `Issues found: ${issues.join("; ")}`,
    errors: issues,
  };
}
```

### 5. All Confirmed → Generate Reports

```typescript
// packages/agents/platform/reporting-agent/nodes.ts

export async function generateCloseReport(state: typeof ReportingState.State) {
  const { entityId, year, month } = state.input;

  // Generate all reports in parallel
  const [profitLoss, balanceSheet, cashFlow, trialBalance] = await Promise.all([
    generateProfitLoss(entityId, year, month),
    generateBalanceSheet(entityId, year, month),
    generateCashFlow(entityId, year, month),
    generateTrialBalance(entityId, year, month),
  ]);

  // Plain-English summary
  const summary = await generateNarrativeSummary({
    profitLoss,
    balanceSheet,
    cashFlow,
    previousMonth: await getPreviousMonthData(entityId, year, month),
  });

  // Send to owner
  await sendEmail({
    to: state.ownerEmail,
    subject: `Books closed for ${getMonthName(month)} ${year}`,
    body: summary.plainEnglish,
    attachments: [
      { name: "Profit & Loss.pdf", content: profitLoss.pdf },
      { name: "Balance Sheet.pdf", content: balanceSheet.pdf },
      { name: "Cash Flow.pdf", content: cashFlow.pdf },
    ],
  });

  return {
    completedAt: new Date().toISOString(),
    confidence: 0.95,
    reasoning:
      "All department confirmations received. Reports generated and delivered.",
  };
}
```

### 6. Error Recovery Flow

```typescript
// When owner flags an issue with a close

export async function initiateRecovery(state: typeof CfoState.State) {
  const { entityId, issueDescription, closeId } = state.input;

  // 1. Reopen the period
  await db
    .update(fiscalPeriods)
    .set({ status: "open" })
    .where(
      and(eq(fiscalPeriods.entityId, entityId), eq(fiscalPeriods.id, closeId)),
    );

  // 2. Classify error type
  const errorType = await classifyError(issueDescription);

  switch (errorType) {
    case "simple_correction":
      // Recategorize, repost, re-close (< 10 minutes)
      return handleSimpleCorrection(entityId, issueDescription);

    case "missing_data":
      // Re-pull from integration or request upload
      return handleMissingData(entityId, issueDescription);

    case "cascading_error":
      // Identify all affected periods, propose correction sequence
      return handleCascadingError(entityId, issueDescription);
  }
}
```

## Close Checklist (What Each Agent Must Confirm)

### Controller Agent

- [ ] All journal entries posted (no drafts in period)
- [ ] Trial balance balanced (debits = credits)
- [ ] AP aging reviewed
- [ ] AR aging reviewed
- [ ] All adjustments posted

### Treasury Agent

- [ ] All bank reconciliations complete
- [ ] No unresolved reconciliation items
- [ ] Cash accounts reconciled
- [ ] Mobile money accounts reconciled
- [ ] Daily cash position reports generated

### Compliance Agent (Phase 2)

- [ ] VAT calculated for period
- [ ] PAYE calculated
- [ ] No missed filing deadlines
- [ ] Tax provisions recorded

## Common Pitfalls

1. **Closing with unresolved items** — Never close if any department has unresolved issues.
2. **Skipping department reviews** — Every department head must confirm independently.
3. **Not logging close state** — Every phase transition must be logged to audit trail.
4. **Forgetting to notify owner** — Owner always receives close notification.
5. **Not preserving history** — Every close version must be preserved for audit.
6. **Closing without confidence check** — All confirmations must have confidence >= 0.7.
7. **Missing error recovery** — Every close must have a recovery path.

## Verification

1. Run close for a test entity with known correct data → should complete successfully
2. Run close with draft entries → Controller should flag
3. Run close with unreconciled bank account → Treasury should flag
4. Run close with all clean → Reports generated and notification sent
5. Flag close as wrong → Recovery flow initiates
6. Verify audit trail has complete close history
