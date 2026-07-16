# Reconciliation Agent — Bank Statement Reconciliation

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Reconciliation Agent |
| Tier | 3 — Worker |
| Reports to | Treasury Agent |
| Model | Claude Sonnet 4.6 (complex matching logic — not downgradeable) |
| LangGraph file | `packages/agents/tier3/reconciliation-agent.ts` |
| Observability | LangFuse (traces per reconciliation session) |

---

## Domain Ownership

The Reconciliation Agent owns **bank statement reconciliation** — matching bank statement transactions to ledger entries. It handles all bank accounts and all statement formats.

**Exclusively controls:**
- Bank statement ingestion from API feeds, PDF uploads, and manual entry
- Transaction matching algorithm (fuzzy matching, amount + date + reference)
- Unmatched item identification and flagging
- Reconciliation report generation
- Multi-bank, multi-account simultaneous reconciliation

**Does NOT control:**
- Closing reconciliations (Treasury Agent reviews and approves)
- Cash reconciliation (Cash Agent domain)
- Mobile money reconciliation (Mobile Money Agent domain)
- Journal entry creation (Ledger Agent posts via Controller)

---

## Responsibilities

1. Ingest bank statements from all sources: API feeds (Plaid), PDF upload, manual entry
2. Parse statement transactions: date, description, amount, reference, balance
3. Match statement transactions to GL ledger entries using multi-factor matching
4. Flag every unmatched transaction with specific detail (amount, date, possible reasons)
5. Handle multi-bank, multi-account reconciliation simultaneously
6. Generate reconciliation report for Treasury Agent review
7. Never close a reconciliation with unresolved items — flag, don't force
8. Handle timing differences (deposits in transit, outstanding checks)
9. Track reconciliation progress across the period
10. Support partial reconciliation (matching some items, leaving others flagged)
11. Provide matched/unmatched summary with confidence scores
12. Handle currency differences in multi-currency accounts

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Treasury Agent | Reconciliation directives, account priorities, period |
| Document Agent | Parsed bank statement data (from PDF/image OCR) |
| System (Plaid) | API-fetched bank transactions |
| System (manual) | Manually entered statement transactions |
| Ledger Agent | GL transactions for the account (via Controller) |

### Outputs

| Target | Data |
|--------|------|
| Treasury Agent | Reconciliation report: matched items, unmatched items, summary, confidence |
| Controller Agent | Journal entries for reconciling items (via Treasury) |

---

## Tools

```typescript
const reconciliationTools = {
  // Database
  queryBankTransactions: db.query.bankTransactions,
  queryJournalEntries: db.query.journalEntries,
  queryReconciliations: db.query.reconciliations,
  insertReconciliation: db.insert(reconciliations),
  insertReconciliationItem: db.insert(reconciliationItems),

  // Statement ingestion
  plaidClient: plaidClient,                   // API bank feeds
  pdfParser: bankStatementPdfParser,           // PDF statement parsing
  csvParser: bankStatementCsvParser,           // CSV statement parsing

  // Matching algorithm
  matchTransactions: transactionMatcherFn,     // Fuzzy matching engine

  // Inter-agent
  sendToTreasury: treasuryAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

### Matching Algorithm

```typescript
type MatchResult = {
  statementTransaction: StatementTransaction;
  ledgerEntry: JournalEntry | null;
  matchType: "exact" | "fuzzy" | "manual" | "unmatched";
  confidence: number;
  matchFactors: {
    amountMatch: boolean;
    dateProximity: boolean;       // within tolerance window
    referenceMatch: boolean;
    descriptionSimilarity: number;
  };
};

function matchTransactions(
  statementTransactions: StatementTransaction[],
  ledgerEntries: JournalEntry[],
  config: MatchConfig
): MatchResult[] {
  const results: MatchResult[] = [];
  const usedLedgerIds = new Set<string>();

  for (const st of statementTransactions) {
    let bestMatch: MatchResult | null = null;

    for (const le of ledgerEntries) {
      if (usedLedgerIds.has(le.id)) continue;

      const amountMatch = Math.abs(st.amount - le.amount) < config.amountTolerance;
      const dateDiff = Math.abs(
        st.date.getTime() - le.date.getTime()
      ) / (1000 * 60 * 60 * 24);
      const dateProximity = dateDiff <= config.dateToleranceDays;
      const referenceMatch = st.reference && le.reference
        ? st.reference === le.reference
        : false;

      let confidence = 0;
      if (amountMatch) confidence += 0.5;
      if (dateProximity) confidence += 0.3;
      if (referenceMatch) confidence += 0.2;

      if (confidence > (bestMatch?.confidence ?? 0) && confidence >= config.minimumConfidence) {
        bestMatch = {
          statementTransaction: st,
          ledgerEntry: le,
          matchType: confidence >= 0.9 ? "exact" : "fuzzy",
          confidence,
          matchFactors: { amountMatch, dateProximity, referenceMatch, descriptionSimilarity: 0 },
        };
      }
    }

    if (bestMatch) {
      usedLedgerIds.add(bestMatch.ledgerEntry!.id);
      results.push(bestMatch);
    } else {
      results.push({
        statementTransaction: st,
        ledgerEntry: null,
        matchType: "unmatched",
        confidence: 0,
        matchFactors: { amountMatch: false, dateProximity: false, referenceMatch: false, descriptionSimilarity: 0 },
      });
    }
  }

  return results;
}
```

---

## State Schema

```typescript
const reconciliationAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Current reconciliation session
  session: z.object({
    accountId: z.string().uuid(),
    accountName: z.string(),
    bankName: z.string(),
    period: z.string(),
    statementSource: z.enum(["api", "pdf", "csv", "manual"]),
    startedAt: z.date(),
    status: z.enum(["ingesting", "matching", "reviewing", "complete", "blocked"]),
  }).nullable(),

  // Statement transactions ingested
  statementTransactions: z.array(z.object({
    id: z.string().uuid(),
    date: z.date(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(["credit", "debit"]),
    reference: z.string().nullable(),
    balance: z.number().nullable(),
    rawDescription: z.string(),
  })),

  // Ledger entries for this account in this period
  ledgerEntries: z.array(z.object({
    id: z.string().uuid(),
    date: z.date(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(["debit", "credit"]),
    reference: z.string().nullable(),
    accountId: z.string().uuid(),
  })),

  // Match results
  matches: z.array(z.object({
    statementTransactionId: z.string().uuid(),
    ledgerEntryId: z.string().uuid().nullable(),
    matchType: z.enum(["exact", "fuzzy", "manual", "unmatched"]),
    confidence: z.number().min(0).max(1),
    matchFactors: z.object({
      amountMatch: z.boolean(),
      dateProximity: z.boolean(),
      referenceMatch: z.boolean(),
      descriptionSimilarity: z.number(),
    }),
  })),

  // Summary
  summary: z.object({
    totalStatementTransactions: z.number(),
    totalLedgerEntries: z.number(),
    matchedCount: z.number(),
    unmatchedCount: z.number(),
    totalMatchedAmount: z.number(),
    totalUnmatchedAmount: z.number(),
    statementOpeningBalance: z.number().nullable(),
    statementClosingBalance: z.number().nullable(),
    expectedClosingBalance: z.number().nullable(),
    difference: z.number().nullable(),
  }).nullable(),

  // Unmatched items requiring attention
  unmatchedItems: z.array(z.object({
    transactionId: z.string().uuid(),
    date: z.date(),
    description: z.string(),
    amount: z.number(),
    possibleReasons: z.array(z.string()),
    suggestedAction: z.string(),
  })),

  // Reconciliation report
  report: z.object({
    generatedAt: z.date(),
    accountId: z.string().uuid(),
    period: z.string(),
    status: z.enum(["clean", "has_unmatched_items", "blocked"]),
    matchedPercentage: z.number(),
    unresolvedCount: z.number(),
    unresolvedTotal: z.number(),
    notes: z.array(z.string()),
  }).nullable(),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Reconciliation Agent for [entity_name]. You reconcile bank
statements against the general ledger.

ROLE:
- You match bank statement transactions to ledger entries.
- You identify and flag unmatched items.
- You never force-match items you are uncertain about.
- You produce reconciliation reports for Treasury Agent review.

CONSTRAINTS:
- Never close a reconciliation with unresolved items.
- Never guess on matches — if confidence < 0.7, flag as unmatched.
- Always include the unmatched items summary in your report.
- Entity-scope all queries to [entity_id].

MATCHING APPROACH:
1. Exact match: same amount, same date (±0 days), matching reference
2. Fuzzy match: same amount, date within ±3 days, no conflicting references
3. Manual match: requires human confirmation (amount matches, date differs > 3 days)
4. Unmatched: no reasonable match found — flag with possible reasons

POSSIBLE REASONS FOR UNMATCHED:
- Deposit in transit (cash received, not yet banked)
- Outstanding check (check issued, not yet cleared)
- Bank charges not yet in ledger
- Interest earned not yet recorded
- Duplicate entry in ledger
- Missing ledger entry (transaction not recorded)
- Amount discrepancy (ledger and bank differ)
- Timing difference (different posting dates)

OUTPUT FORMAT:
Produce a reconciliation report with:
- Matched items count and total
- Unmatched items list with possible reasons
- Opening/closing balances
- Difference (should be 0 if clean)
- Confidence score
- Recommendations for unmatched items
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| ≥ 95% matched, all unmatched items have explanations | ≥ 0.9 | Report as clean to Treasury |
| 80-95% matched, unmatched items are explainable | 0.7–0.9 | Report with notes on unmatched items |
| 60-80% matched or unmatched items unclear | 0.5–0.7 | Report as "has_unmatched_items", flag for review |
| < 60% matched | < 0.5 | Report as blocked, escalate to Treasury |
| Statement ingestion fails or data corrupt | < 0.3 | Escalate to Treasury, request alternative source |
| Ledger entries missing for account | < 0.5 | Flag to Treasury — possible missing recordings |

**Hard rules:**
- Never force-match items with confidence below 0.7
- Never close reconciliation with unresolved items
- Always report exact counts of matched and unmatched items

---

## Error Handling

| Error | Response |
|-------|----------|
| Bank statement PDF unreadable | Flag for manual entry, notify Treasury |
| API feed unavailable | Attempt fallback sources, notify Treasury |
| Statement period doesn't match ledger period | Flag mismatch, request correct period data |
| More statement transactions than ledger entries | Match what possible, flag rest as unmatched |
| More ledger entries than statement transactions | Flag as "in ledger, not on statement" (deposits in transit) |
| Amount discrepancy on potential match | Flag as unmatched with "amount differs" note |
| Duplicate statement transactions detected | Deduplicate, flag duplicate to Treasury |
| Currency mismatch between statement and ledger | Flag for manual review, do not auto-match |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `reconciliation_report` | Full reconciliation with matched/unmatched |
| Treasury Agent | `reconciliation_blocked` | Cannot complete reconciliation, needs intervention |
| Treasury Agent | `ingestion_failed` | Statement couldn't be processed |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `reconciliation_request` | Account, period, statement source |
| Document Agent | `parsed_statement` | Parsed bank statement data |
| System | `plaid_transactions` | API-fetched bank transactions |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Match accuracy (exact matches) | 100% | Correct matches for obvious items |
| False match rate | < 2% | Incorrect matches |
| Unmatched identification | ≥ 95% | Correctly identifies genuinely unmatched items |
| False unmatched rate | < 5% | Items that could have been matched but weren't |
| Processing time | < 30s per 100 transactions | Speed of reconciliation |
| Report completeness | 100% | All unmatched items listed with reasons |
| Multi-account handling | 100% | Correctly separates accounts |
| Never force-matches | 100% | No low-confidence matches forced |

**Golden dataset scenarios:**
1. 100 transactions, all matchable → 100% matched, clean report
2. 100 transactions, 5 unmatched (bank charges, deposits in transit) → correctly identified
3. PDF statement with OCR errors → handles gracefully, flags uncertain extractions
4. API feed with timing differences → matches correctly within tolerance
5. Multi-currency account → matches in correct currency
6. Duplicate statement entries → deduplicates and flags
