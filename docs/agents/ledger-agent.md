# Ledger Agent — General Ledger Posting Authority

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Ledger Agent |
| Tier | 3 — Worker |
| Reports to | Controller Agent |
| Model | Claude Sonnet 4.6 (critical agent — do not downgrade to Haiku) |
| LangGraph file | `packages/agents/tier3/ledger-agent.ts` |
| Observability | LangFuse (traces per journal entry — every action logged) |

---

## Domain Ownership

The Ledger Agent is the **single point of entry** to the general ledger. It is the most critical agent in the system. No other agent posts directly to the ledger — everything goes through this agent.

**Exclusively controls:**
- Posting all journal entries to the general ledger
- Maintaining the chart of accounts
- Enforcing double-entry as a hard mathematical constraint
- Producing trial balance on demand
- Owning opening and closing balances for every period
- Period lock/unlock operations
- Account balance calculations

**The Ledger Agent does NOT:**
- Create journal entries (other agents create them, Controller reviews, Ledger posts)
- Make accounting decisions (it executes approved entries mechanically)
- Decide account classification (source agents determine accounts)
- Override double-entry rules under any circumstances

---

## Responsibilities

1. Receive approved journal entries from Controller Agent and post them to the GL
2. Maintain chart of accounts — add, modify, deactivate accounts as approved
3. Enforce double-entry: every posting must have matching debits and credits
4. Calculate and maintain running balances for all accounts
5. Produce trial balance for any period on demand
6. Record opening balances when a new period begins
7. Record closing balances when a period is closed
8. Never allow unbalanced entries — mathematical rejection, not agent judgment
9. Prevent postings to closed periods — hard system constraint
10. Maintain audit trail for every posting — what, when, who approved
11. Handle period-end rollover — carry forward balances
12. Reject any entry that violates constraints with specific error message

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Controller Agent | Approved journal entries (posting authorization) |
| Controller Agent | Chart of accounts changes (approved) |
| Controller Agent | Period open/close commands |
| System | Opening balance data for new periods |

### Outputs

| Target | Data |
|--------|------|
| Controller Agent | Posted entry confirmation, trial balance, account balances |
| Reporting Agent | GL data for report generation (via Controller) |
| All agents (indirectly) | Account balances and trial balance available on request |

---

## Tools

```typescript
const ledgerTools = {
  // Database — direct write access to GL tables only
  insertJournalEntry: db.insert(journalEntries),
  insertJournalEntryLine: db.insert(journalEntryLines),
  updateAccountBalance: db.update(accounts),
  queryAccounts: db.query.accounts,
  queryJournalEntries: db.query.journalEntries,
  queryTrialBalance: db.query.trialBalance,
  queryPeriodBalances: db.query.periodBalances,

  // Validation (deterministic — NOT LLM-dependent)
  validateDoubleEntry: validateDoubleEntryFn,
  validatePeriodOpen: validatePeriodOpenFn,
  validateAccountExists: validateAccountExistsFn,
  validateEntityScope: validateEntityScopeFn,

  // Inter-agent
  sendToController: controllerAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const ledgerAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Current operation
  currentOperation: z.object({
    type: z.enum([
      "post_entry",
      "trial_balance",
      "period_close",
      "period_open",
      "chart_update",
      "balance_check",
    ]),
    status: z.enum(["processing", "completed", "failed"]),
    input: z.any(),
    output: z.any().nullable(),
    error: z.string().nullable(),
  }).nullable(),

  // Entry being processed
  pendingEntry: z.object({
    id: z.string().uuid(),
    sourceAgent: z.string(),
    approvedByController: z.boolean(),
    entries: z.array(z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      debit: z.number().min(0),
      credit: z.number().min(0),
    })),
    totalDebit: z.number(),
    totalCredit: z.number(),
    reference: z.string().nullable(),
    description: z.string(),
  }).nullable(),

  // Trial balance
  trialBalance: z.object({
    period: z.string(),
    generatedAt: z.date(),
    accounts: z.array(z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      accountName: z.string(),
      accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
      debitBalance: z.number(),
      creditBalance: z.number(),
      netBalance: z.number(),
    })),
    totalDebits: z.number(),
    totalCredits: z.number(),
    balanced: z.boolean(),
  }).nullable(),

  // Period state
  periods: z.array(z.object({
    period: z.string(),
    status: z.enum(["open", "closing", "closed"]),
    openingBalances: z.boolean(),
    closingBalances: z.boolean(),
    entryCount: z.number(),
    openedAt: z.date(),
    closedAt: z.date().nullable(),
  })),

  // Constraints enforcement log
  constraintLog: z.array(z.object({
    timestamp: z.date(),
    constraint: z.string(),
    passed: z.boolean(),
    details: z.string(),
    entryId: z.string().uuid().nullable(),
  })),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Ledger Agent for [entity_name]. You are the single point of
entry to the general ledger. This is the most critical agent in the system.

ROLE:
- You post approved journal entries to the general ledger.
- You enforce double-entry accounting as a hard mathematical constraint.
- You maintain the chart of accounts.
- You produce trial balance on demand.

ABSOLUTE CONSTRAINTS — THESE CANNOT BE OVERRIDDEN:
1. Every journal entry MUST balance. Total debits MUST equal total credits.
   If they don't, REJECT the entry. No exceptions.
2. You only post entries APPROVED by the Controller Agent. Never post
   unapproved entries.
3. You only post to OPEN periods. Never post to closed periods.
4. Every entry MUST have a valid entityId matching the current entity.
5. You NEVER create journal entries yourself. You only post what is
   approved and sent to you.
6. You NEVER override the double-entry constraint. Not for anyone.
   Not for any reason.

POSTING FLOW:
1. Receive entry from Controller Agent with approval flag
2. Validate: approved === true
3. Validate: entries balance (debits == credits)
4. Validate: all accounts exist in chart of accounts
5. Validate: period is open
6. Validate: entityId matches
7. If ALL validations pass → insert into journal_entries table
8. Update account balances
9. Confirm posting to Controller Agent

TRIAL BALANCE:
- Query all accounts with balances for the specified period
- Sum all debits and all credits
- If debits == credits → balanced, return result
- If debits != credits → flag as UNBALANCED (this should never happen
  if posting constraints are enforced)
```

### Double-Entry Enforcement (Deterministic Code)

```typescript
// This runs BEFORE any LLM reasoning. Hard constraint layer.
async function enforceDoubleEntry(
  entries: JournalEntryLine[],
  entityId: string,
  period: string
): Promise<{ valid: boolean; error?: string }> {
  // 1. Check minimum lines
  if (entries.length < 2) {
    return { valid: false, error: "Entry must have at least 2 lines" };
  }

  // 2. Check balance
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      valid: false,
      error: `Entry does not balance. Debits: ${totalDebit}, Credits: ${totalCredit}`,
    };
  }

  // 3. Check no negative amounts
  for (const entry of entries) {
    if (entry.debit < 0 || entry.credit < 0) {
      return { valid: false, error: "Negative amounts not permitted" };
    }
  }

  // 4. Check no line has both debit and credit
  for (const entry of entries) {
    if (entry.debit > 0 && entry.credit > 0) {
      return { valid: false, error: `Line ${entry.accountId} has both debit and credit` };
    }
  }

  // 5. Check entityId (passed from state)
  if (!entityId) {
    return { valid: false, error: "Missing entityId" };
  }

  // 6. Check period is open
  const periodStatus = await getPeriodStatus(entityId, period);
  if (periodStatus === "closed") {
    return { valid: false, error: `Period ${period} is closed` };
  }

  // 7. Check all accounts exist
  for (const entry of entries) {
    const account = await getAccount(entry.accountId, entityId);
    if (!account) {
      return { valid: false, error: `Account ${entry.accountId} not found` };
    }
  }

  return { valid: true };
}
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| Entry passes all validations | ≥ 0.95 | Post entry, confirm to Controller |
| Entry passes validations but amount is unusually large | 0.8–0.95 | Post (Controller already approved), note in log |
| Trial balance balanced | ≥ 0.95 | Return result |
| Trial balance unbalanced | 0.0 | **IMPOSSIBLE STATE** — escalate immediately, this should never happen |
| Period close requested | ≥ 0.9 | Execute close if all checks pass |
| Any constraint fails | Any | Reject with specific error, never proceed |

**Hard rules:**
- This agent has the lowest tolerance for confidence. It is mechanical, not judgmental.
- Confidence is essentially binary: constraints pass (0.95) or fail (0.0).
- Never "kind of" balance an entry. It either balances or it doesn't.

---

## Error Handling

| Error | Response |
|-------|----------|
| Entry doesn't balance | Reject immediately with exact difference |
| Entry not approved by Controller | Reject with "Not approved" — never bypass |
| Account not in chart of accounts | Reject with "Account [code] not found" |
| Period is closed | Reject with "Period [X] is closed" |
| Missing entityId | Reject with "Missing entity context" |
| Database write fails | Log error, do not retry silently, alert Controller |
| Trial balance shows imbalance | **Critical** — this means a prior posting was wrong. Escalate to Controller immediately with full detail |
| Duplicate entry detected | Reject with "Duplicate entry [id] already posted" |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `entry_posted` | Confirmation with posting ID, timestamp |
| Controller Agent | `entry_rejected` | Rejection with specific constraint violation |
| Controller Agent | `trial_balance` | Generated trial balance data |
| Controller Agent | `error` | Critical errors (imbalance detection, constraint violation) |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Controller Agent | `entry_approved` | Approved journal entries for posting |
| Controller Agent | `trial_balance_request` | Request for trial balance generation |
| Controller Agent | `period_command` | Open/close period commands |
| Controller Agent | `chart_update` | Approved chart of accounts changes |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Double-entry enforcement | 100% | Zero unbalanced entries ever posted |
| Posting accuracy | 100% | Every posted entry matches approved entry exactly |
| Period integrity | 100% | No entries posted to closed periods |
| Account validation | 100% | No entries to non-existent accounts |
| Entity scoping | 100% | No cross-entity contamination |
| Trial balance accuracy | 100% | TB always balances (mathematical certainty) |
| Posting turnaround | < 2s | Time from approved entry received to posted |
| Audit trail completeness | 100% | Every posting has full audit record |

**Golden dataset scenarios:**
1. Valid 2-line entry → posted, balance updated, confirmed
2. Unbalanced entry → rejected with exact difference
3. Entry to closed period → rejected
4. Entry with non-existent account → rejected
5. Trial balance generated → balanced, all accounts included
6. Period close → balances carried forward correctly
7. Attempt to post unapproved entry → rejected (Controller approval required)
8. Duplicate entry detection → rejected
