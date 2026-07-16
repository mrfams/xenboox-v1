# Cash Agent — Cash & Imprest Management

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Cash Agent |
| Tier | 3 — Worker |
| Reports to | Treasury Agent |
| Model | Claude Haiku 4.5 (routine operations) + Sonnet for discrepancy analysis |
| LangGraph file | `packages/agents/tier3/cash-agent.ts` |
| Observability | LangFuse (traces per cash count + imprest operation) |

---

## Domain Ownership

The Cash Agent owns **physical cash operations** — daily cash position, petty cash, imprest issuance and retirement, and cash discrepancy detection. This is critical for African operations where cash-heavy workflows are the norm.

**Exclusively controls:**
- Daily cash position tracking across all physical cash tills and locations
- Petty cash float management
- Imprest issuance recording (who, how much, purpose, when)
- Imprest retirement matching (receipts to float, balance calculation)
- Cash discrepancy detection and flagging
- Daily cash reconciliation report
- Cash count scheduling and tracking

**Does NOT control:**
- Bank account reconciliation (Reconciliation Agent)
- Mobile money reconciliation (Mobile Money Agent)
- Journal entry posting (Ledger Agent via Controller)
- Payment scheduling (Treasury Agent)

---

## Responsibilities

1. Track daily cash position across all physical cash tills and locations
2. Record petty cash float — opening balance, receipts in, receipts out, closing balance
3. Issue imprest — record who received float, amount, purpose, expected retirement date
4. Process imprest retirement — match receipts to issued float, calculate balance due
5. Detect cash discrepancies — any difference between recorded and counted amounts
6. Flag discrepancies immediately — never silently absorb discrepancies
7. Produce daily cash reconciliation report for each cash location
8. Schedule and track periodic cash counts (daily, weekly, as configured)
9. Track cash custodians and their outstanding imprest balances
10. Report aggregate cash position to Treasury Agent
11. Escalate material discrepancies to Treasury Agent
12. Support multi-location, multi-currency cash operations

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Treasury Agent | Cash management directives, imprest authorization, discrepancy queries |
| Cashier (mobile/web) | Cash count entries, receipt captures, imprest requests |
| System | Opening balances, prior day reports |

### Outputs

| Target | Data |
|--------|------|
| Treasury Agent | Daily cash reports, discrepancy alerts, imprest status |
| Controller Agent | Cash journal entries (via Treasury): imprest issued, imprest retired, discrepancies |
| Reporting Agent | Cash position data (via Treasury) |

---

## Tools

```typescript
const cashTools = {
  // Database
  queryCashPositions: db.query.cashPositions,
  queryCashCounts: db.query.cashCounts,
  queryImprest: db.query.imprestRecords,
  queryPettyCash: db.query.pettyCash,
  insertCashCount: db.insert(cashCounts),
  insertImprest: db.insert(imprestRecords),
  updateCashPosition: db.update(cashPositions),

  // Inter-agent
  sendToTreasury: treasuryAgent.invoke,

  // Mobile
  pushNotification: pushNotificationService,

  // Observability
  langfuse: langfuseClient,
};
```

---

## State Schema

```typescript
const cashAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Cash locations
  cashLocations: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.enum(["till", "safe", "petty_cash_box", "field_float"]),
    custodian: z.string(),
    currency: z.string(),
    floatAmount: z.number(),          // authorized float
    currentBalance: z.number(),
    lastCountedAt: z.date().nullable(),
    lastCountedBy: z.string().nullable(),
  })),

  // Today's cash activity
  dailyActivity: z.object({
    date: z.string(),
    locations: z.array(z.object({
      locationId: z.string().uuid(),
      openingBalance: z.number(),
      cashIn: z.number(),
      cashOut: z.number(),
      expectedBalance: z.number(),
      actualBalance: z.number().nullable(),
      discrepancy: z.number().nullable(),
      transactions: z.array(z.object({
        id: z.string().uuid(),
        type: z.enum(["in", "out"]),
        amount: z.number(),
        description: z.string(),
        reference: z.string().nullable(),
        recordedBy: z.string(),
        recordedAt: z.date(),
      })),
    })),
  }).nullable(),

  // Imprest tracking
  imprests: z.array(z.object({
    id: z.string().uuid(),
    custodian: z.string(),
    locationId: z.string().uuid(),
    amountIssued: z.number(),
    currency: z.string(),
    purpose: z.string(),
    issuedAt: z.date(),
    expectedRetirementDate: z.date(),
    status: z.enum(["issued", "partially_retired", "retired", "overdue"]),
    amountRetired: z.number(),
    balanceDue: z.number(),
    receiptsAttached: z.number(),
    retirementDate: z.date().nullable(),
  })),

  // Discrepancies
  discrepancies: z.array(z.object({
    id: z.string().uuid(),
    locationId: z.string().uuid(),
    locationName: z.string(),
    expectedAmount: z.number(),
    actualAmount: z.number(),
    difference: z.number(),
    severity: z.enum(["minor", "moderate", "material", "critical"]),
    detectedAt: z.date(),
    reportedTo: z.string().nullable(),
    resolvedAt: z.date().nullable(),
    resolution: z.string().nullable(),
  })),

  // Daily report
  dailyReport: z.object({
    date: z.string(),
    totalCashAllLocations: z.number(),
    totalDiscrepancies: z.number(),
    overdueImprests: z.number(),
    overdueImprestAmount: z.number(),
    alerts: z.array(z.string()),
  }).nullable(),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Cash Agent for [entity_name]. You manage all physical cash
operations.

ROLE:
- You track daily cash position across all physical locations.
- You manage petty cash floats and imprest lifecycle.
- You detect and flag cash discrepancies immediately.
- You are critical for African operations where cash is heavily used.

CONSTRAINTS:
- Never silently absorb a cash discrepancy. Always flag it.
- Never approve imprest above the configured threshold without
  escalating to Treasury Agent.
- Always maintain accurate custodian tracking.
- Entity-scope all operations to [entity_id].

DISCREPANCY SEVERITY:
- Minor: difference < 1% of float → note in report, no immediate escalation
- Moderate: 1-5% of float → flag to Treasury Agent same day
- Material: 5-10% of float → escalate to Treasury Agent immediately
- Critical: > 10% of float → escalate to Treasury Agent AND CFO Agent immediately

IMPREST LIFECYCLE:
1. Treasury Agent authorizes imprest issuance
2. Record: custodian, amount, purpose, location, expected retirement date
3. Track: custodian uses float for authorized purpose
4. Retirement: custodian submits receipts, agent matches to float
5. Calculate: balance due (amount issued - receipts total)
6. Close: if balance due is 0, mark retired. If > 0, flag for follow-up.
7. Overdue: if retirement date passed and not retired, escalate.

DAILY CASH REPORT:
For each location:
- Opening balance
- Cash in (total)
- Cash out (total)
- Expected balance (opening + in - out)
- Actual balance (last count)
- Discrepancy (expected - actual)
- Number of transactions
Aggregate across all locations.
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| All locations counted, no discrepancies | ≥ 0.9 | Clean report to Treasury |
| Minor discrepancies (< 1% of float) | 0.8–0.9 | Note in report, no escalation |
| Moderate discrepancies (1-5%) | 0.6–0.8 | Flag to Treasury with detail |
| Material discrepancies (5-10%) | 0.4–0.6 | Escalate to Treasury immediately |
| Critical discrepancies (> 10%) | < 0.4 | Escalate to Treasury AND CFO immediately |
| Cannot determine actual balance (no count) | < 0.5 | Flag to Treasury — counting needed |
| Imprest overdue | < 0.6 | Escalate to Treasury with custodian detail |

---

## Error Handling

| Error | Response |
|-------|----------|
| Cash count not submitted for location | Flag as "no count" in report, alert Treasury |
| Imprest retirement has no receipts | Flag for follow-up, alert Treasury |
| Discrepancy exceeds threshold | Immediate escalation per severity rules |
| Custodian left organization with outstanding imprest | Critical escalation to Treasury AND CFO |
| Cash count entry has impossible values | Reject entry, request recount |
| Same location counted twice with different amounts | Use second count, flag difference |
| Multi-currency cash at same location | Track each currency separately |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `daily_cash_report` | All locations, balances, discrepancies |
| Treasury Agent | `discrepancy_alert` | Discrepancy with severity, location, detail |
| Treasury Agent | `imprest_overdue` | Overdue imprest with custodian, amount |
| Treasury Agent | `imprest_status` | All active imprests with balances |
| Controller Agent | `journal_entries` | Cash entries via Treasury (imprest issued/retired) |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `imprest_authorize` | Approved imprest issuance |
| Treasury Agent | `cash_count_request` | Request for count at specific location |
| Treasury Agent | `discrepancy_query` | Query about specific discrepancy |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Discrepancy detection rate | 100% | All discrepancies identified |
| Discrepancy severity classification | ≥ 95% | Correct severity level assigned |
| Daily report accuracy | 100% | Balances match actual records |
| Imprest tracking accuracy | 100% | All imprests tracked correctly |
| Overdue imprest flagging | 100% | All overdue items flagged same day |
| Cash count completeness | ≥ 90% | Locations counted on schedule |
| Report timeliness | < 5s | Time from count submission to report |

**Golden dataset scenarios:**
1. 3 locations, all counted, no discrepancies → clean daily report
2. 3 locations, one with 3% discrepancy → flagged, reported to Treasury
3. Imprest $500 issued, $420 in receipts, $80 balance due → tracked correctly
4. Imprest 7 days overdue → escalated to Treasury with custodian detail
5. Critical discrepancy at main till → immediate escalation to Treasury AND CFO
6. Multi-currency cash location → each currency tracked separately
