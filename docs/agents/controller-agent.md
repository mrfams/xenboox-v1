# Controller Agent — GL Integrity Manager

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Controller Agent |
| Tier | 2 — Management |
| Reports to | CFO Agent |
| Model | Claude Sonnet 4.6 |
| LangGraph file | `packages/agents/tier2/controller-agent.ts` |
| Observability | LangFuse (traces per journal entry review + close) |

---

## Domain Ownership

The Controller Agent owns the **integrity of the general ledger** and all accounting records. It is the quality gate between worker agents and the ledger. Nothing posts to the GL without Controller review.

**Exclusively controls:**
- Journal entry review and approval before final posting
- Double-entry integrity enforcement (mathematical, not agent judgment)
- Trial balance production and validation
- Month-end close checklist for accounting operations
- Inter-company elimination entries (multi-entity)
- Chart of accounts governance (proposed changes reviewed here)
- AP/AR reconciliation confirmation before close

**Does NOT control:**
- Actual journal entry posting (Ledger Agent does this)
- Cash/bank operations (Treasury Agent domain)
- Tax compliance (Compliance Agent domain)
- Payroll (Payroll Manager Agent domain)

---

## Responsibilities

1. Review all journal entries proposed by worker agents before Ledger Agent posts them
2. Validate double-entry integrity: every debit has a matching credit, amounts balance
3. Enforce entity scoping — reject any entry missing `entityId`
4. Produce trial balance on demand and during close
5. Confirm trial balance balances (debits = credits) before reporting to CFO
6. Manage month-end close checklist for accounting domains (AP, AR, assets, inventory, GL)
7. Ensure all AP and AR sub-ledgers reconcile to GL control accounts before close
8. Review and approve inter-company elimination entries for multi-entity organizations
9. Maintain chart of accounts — review proposed additions/modifications for consistency
10. Escalate to CFO Agent when material items need strategic decision
11. Aggregate worker agent summaries for CFO Agent review
12. Validate period integrity — no entries posted to closed periods
13. Flag unusual journal entry patterns (large amounts, round numbers, manual reversals)
14. Approve depreciation, amortization, and accrual entries from Asset Agent and others

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| CFO Agent | Close triggers, task assignments, escalation decisions |
| Ledger Agent | Proposed journal entries, trial balance, chart of accounts changes |
| AP Agent | AP journal entries (invoice accruals, payments, credits) |
| AR Agent | AR journal entries (revenue recognition, receipts, write-offs) |
| Asset Agent | Depreciation entries, disposal entries, asset acquisitions |
| Inventory Agent | COGS entries, inventory valuation adjustments |
| Payroll Manager Agent | Payroll journal entries (wages, taxes, benefits) |
| Compliance Agent | Tax accrual entries |

### Outputs

| Target | Data |
|--------|------|
| CFO Agent | Trial balance, close confirmation/rejection, escalation reports, summaries |
| Ledger Agent | Approved journal entries (posting authorization), chart of accounts decisions |
| All worker agents | Rejection reasons, correction requests, status updates |

---

## Tools

```typescript
const controllerTools = {
  // Database
  queryTrialBalance: db.query.trialBalance,
  queryJournalEntries: db.query.journalEntries,
  queryAccounts: db.query.accounts,
  querySubLedger: db.query.subLedgerBalances,

  // Validation
  validateDoubleEntry: validateDoubleEntryFn,      // Mathematical check
  validateEntityScope: validateEntityScopeFn,      // entityId present check
  validatePeriodOpen: validatePeriodOpenFn,        // Period not closed check
  validateAccountExists: validateAccountExistsFn,  // Chart of accounts check

  // Inter-agent
  sendToLedger: ledgerAgent.invoke,
  sendToCFO: cfoAgent.invoke,
  sendToWorker: (agent, message) => workerAgentRouter.invoke(agent, message),

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const controllerAgentStateSchema = z.object({
  // Identity
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Pending journal entries for review
  pendingEntries: z.array(z.object({
    id: z.string().uuid(),
    sourceAgent: z.string(),
    description: z.string(),
    entries: z.array(z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      accountName: z.string(),
      debit: z.number().min(0),
      credit: z.number().min(0),
    })),
    totalDebit: z.number(),
    totalCredit: z.number(),
    reference: z.string().nullable(),
    status: z.enum(["pending", "approved", "rejected", "needs_correction"]),
    rejectionReason: z.string().nullable(),
    submittedAt: z.date(),
    reviewedAt: z.date().nullable(),
    confidence: z.number().min(0).max(1),
  })),

  // Trial balance state
  trialBalance: z.object({
    generatedAt: z.date().nullable(),
    totalDebits: z.number(),
    totalCredits: z.number(),
    balanced: z.boolean(),
    accounts: z.array(z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      accountName: z.string(),
      debitBalance: z.number(),
      creditBalance: z.number(),
    })),
  }).nullable(),

  // Close state
  closeChecklist: z.object({
    period: z.string(),
    items: z.array(z.object({
      domain: z.string(),
      description: z.string(),
      status: z.enum(["pending", "in_progress", "complete", "blocked"]),
      completedAt: z.date().nullable(),
      blockedReason: z.string().nullable(),
    })),
    allComplete: z.boolean(),
    confirmedToCFO: z.boolean(),
  }).nullable(),

  // Sub-ledger reconciliation
  subLedgerStatus: z.object({
    ap: z.object({ reconciled: z.boolean(), variance: z.number() }),
    ar: z.object({ reconciled: z.boolean(), variance: z.number() }),
    fixedAssets: z.object({ reconciled: z.boolean(), variance: z.number() }),
    inventory: z.object({ reconciled: z.boolean(), variance: z.number() }),
  }).nullable(),

  // Confidence
  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Controller Agent for [entity_name]. You own the integrity of the
general ledger.

ROLE:
- You review all journal entries before they post to the ledger.
- You enforce double-entry accounting as a hard mathematical constraint.
- You produce the trial balance and confirm it balances.
- You are the quality gate between worker agents and the general ledger.

CONSTRAINTS:
- Never post journal entries directly — approve/reject, Ledger Agent posts.
- Never skip double-entry validation. Every entry must balance (total debits
  == total credits). This is non-negotiable.
- Every entry must have a valid entityId matching the current entity.
- Never approve entries to closed periods.
- Never approve entries to accounts not in the chart of accounts.
- Flag round-number entries and large manual entries for review.

MONTH-END CLOSE:
When close is triggered:
1. Run through close checklist for your domains.
2. Reconcile sub-ledgers (AP, AR, assets, inventory) to GL control accounts.
3. Generate trial balance. Confirm debits == credits.
4. Report status to CFO Agent with confidence score.

REVIEWING ENTRIES:
For each proposed journal entry:
1. Validate: entries array present, at least 2 lines, debits == credits
2. Validate: all accounts exist in chart of accounts
3. Validate: entityId matches current entity
4. Validate: period is open
5. Check: description is clear and reasonable
6. Check: amounts are reasonable relative to entity's typical transactions
7. Approve or reject with specific reason
```

### Double-Entry Validation (Hardcoded — Not LLM-Dependent)

```typescript
// This is deterministic code, not LLM reasoning
function validateDoubleEntry(entries: JournalEntryLine[]): ValidationResult {
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      valid: false,
      reason: `Entry does not balance. Debits: ${totalDebit}, Credits: ${totalCredit}, Difference: ${totalDebit - totalCredit}`,
    };
  }

  if (entries.length < 2) {
    return { valid: false, reason: "Entry must have at least 2 lines" };
  }

  for (const entry of entries) {
    if (entry.debit < 0 || entry.credit < 0) {
      return { valid: false, reason: "Negative amounts not allowed" };
    }
    if (entry.debit > 0 && entry.credit > 0) {
      return { valid: false, reason: "Line cannot have both debit and credit" };
    }
  }

  return { valid: true };
}
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| All entries balance, sub-ledgers reconcile | ≥ 0.9 | Approve entries, confirm to CFO |
| Trial balance balanced, minor sub-ledger variance (< 0.01) | ≥ 0.85 | Approve with note |
| Entry has unusual amount but passes all checks | 0.7–0.85 | Approve but flag to CFO |
| Sub-ledger variance > 0.01 but < 1.00 | 0.6–0.7 | Investigate, attempt resolution, escalate if unresolved |
| Entry fails double-entry validation | Any | Reject — must correct before posting |
| Sub-ledger variance > 1.00 | < 0.6 | Escalate to CFO immediately |
| Trial balance does not balance | < 0.5 | Block close, escalate to CFO |
| Cannot determine correctness of entry | < 0.5 | Reject and escalate to CFO with reasoning |

---

## Error Handling

| Error | Response |
|-------|----------|
| Journal entry fails double-entry validation | Reject with specific reason, return to source agent |
| Entry targets closed period | Reject with "Period [X] is closed" message |
| Entry targets non-existent account | Reject with "Account [code] not found in chart of accounts" |
| Sub-ledger variance at close | Investigate, flag specific variance to CFO |
| Ledger Agent fails to post approved entry | Retry once, then escalate to CFO |
| Trial balance doesn't balance | Block close, escalate to CFO with detail |
| Source agent rejects correction request | Escalate to CFO with both positions |
| Conflicting entries from two agents on same transaction | Flag both, escalate to CFO |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Ledger Agent | `entry_approved` | Approved journal entries for posting |
| Ledger Agent | `entry_rejected` | Rejection with reason and correction guidance |
| CFO Agent | `close_confirmation` | Status: clean/blocked, trial balance, summary, confidence |
| CFO Agent | `escalation` | Material item needing strategic decision |
| Worker agents | `correction_request` | Specific correction needed before approval |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| CFO Agent | `close_trigger` | Period, deadline |
| Ledger Agent | `entry_submitted` | Proposed journal entries for review |
| Ledger Agent | `trial_balance` | Generated trial balance |
| AP Agent | `journal_entries` | AP-related entries |
| AR Agent | `journal_entries` | AR-related entries |
| Asset Agent | `journal_entries` | Depreciation, disposal entries |
| Inventory Agent | `journal_entries` | COGS, valuation entries |
| Payroll Manager Agent | `journal_entries` | Payroll entries |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Double-entry enforcement | 100% | Zero unbalanced entries ever posted |
| Sub-ledger reconciliation accuracy | 100% | All sub-ledgers match GL at close |
| Entry review turnaround | < 5s | Time from submission to approval/rejection |
| False approval rate | 0% | No invalid entries approved |
| False rejection rate | < 5% | Valid entries incorrectly rejected |
| Close checklist completeness | 100% | All items confirmed before reporting to CFO |
| Entity scoping compliance | 100% | No cross-entity contamination |
| Period integrity | 100% | No entries posted to closed periods |

**Golden dataset scenarios:**
1. Valid 2-line journal entry → approved correctly
2. Unbalanced entry (debits ≠ credits) → rejected with exact difference
3. Entry to closed period → rejected with period status
4. Entry with non-existent account code → rejected with guidance
5. Sub-ledger variance at close → investigated and escalated appropriately
6. Large round-number entry → flagged but approved if all checks pass
7. Inter-company entry requiring elimination → flagged for close process
