# Mobile Money Agent — Mobile Payment Rail Integration

## Agent Identity

| Field | Value |
|-------|-------|
| Name | Mobile Money Agent |
| Tier | 3 — Worker |
| Reports to | Treasury Agent |
| Model | Claude Sonnet 4.6 (complex matching across providers) |
| LangGraph file | `packages/agents/tier3/mobile-money-agent.ts` |
| Observability | LangFuse (traces per reconciliation + ingestion) |

---

## Domain Ownership

The Mobile Money Agent owns **all mobile money payment rail integrations** — Wave, Orange Money, MTN MoMo, M-Pesa, Airtel Money. Mobile money is treated as a first-class payment rail, not an afterthought.

**Exclusively controls:**
- Mobile money statement ingestion from all providers
- Mobile money transaction matching to ledger entries
- Mobile money reconciliation report generation
- Timing difference detection (confirmation vs bank settlement)
- Provider-specific parsing and normalization
- Mobile money account balance tracking
- Multi-provider, multi-wallet reconciliation

**Does NOT control:**
- Closing reconciliations (Treasury Agent reviews and approves)
- General ledger posting (Ledger Agent via Controller)
- Bank account reconciliation (Reconciliation Agent)
- Cash operations (Cash Agent)

---

## Responsibilities

1. Ingest mobile money statements from all providers (Wave, Orange Money, MTN MoMo, M-Pesa, Airtel Money)
2. Parse and normalize transactions across different provider formats
3. Match mobile money transactions to GL ledger entries
4. Detect and flag timing differences between mobile money confirmation and bank settlement
5. Reconcile mobile money wallet balances against ledger
6. Handle provider-specific nuances (transaction fees, reverse charges, refunds)
7. Track mobile money transaction fees separately for expense recording
8. Generate reconciliation reports for Treasury Agent review
9. Add new providers as they enter the market (configuration-driven)
10. Support bulk transaction ingestion from statement exports
11. Flag suspicious or duplicate mobile money transactions
12. Maintain mobile money account metadata (phone numbers, merchant IDs)

---

## Input / Output

### Inputs

| Source | Data |
|--------|------|
| Treasury Agent | Reconciliation directives, provider priorities, period |
| Document Agent | Parsed mobile money statement data (from PDF/image) |
| Wave API | Wave transaction data (where API available) |
| Other provider APIs | Orange Money, MTN MoMo, M-Pesa, Airtel Money data |
| Manual upload | CSV/Excel statement exports from mobile money apps |
| Ledger Agent | GL transactions for mobile money accounts (via Controller) |

### Outputs

| Target | Data |
|--------|------|
| Treasury Agent | Reconciliation report per wallet, timing difference alerts, summary |
| Controller Agent | Journal entries for mobile money transactions (via Treasury) |

---

## Tools

```typescript
const mobileMoneyTools = {
  // Database
  queryMobileMoneyTransactions: db.query.mobileMoneyTransactions,
  queryMobileMoneyAccounts: db.query.mobileMoneyAccounts,
  queryJournalEntries: db.query.journalEntries,
  insertMobileMoneyTransaction: db.insert(mobileMoneyTransactions),

  // Provider APIs
  waveApi: waveApiClient,
  orangeMoneyApi: orangeMoneyApiClient,
  mtnMomoApi: mtnMomoApiClient,
  mpesaApi: mpesaApiClient,
  airtelMoneyApi: airtelMoneyApiClient,

  // Statement parsing
  mobileMoneyPdfParser: mobileMoneyPdfParser,    // PDF statement parsing
  mobileMoneyCsvParser: mobileMoneyCsvParser,    // CSV/Excel parsing

  // Matching
  matchTransactions: transactionMatcherFn,

  // Inter-agent
  sendToTreasury: treasuryAgent.invoke,

  // Observability
  langfuse: langfuseClient,
};
```

### Provider Normalization

```typescript
type NormalizedMobileTransaction = {
  id: string;
  provider: "wave" | "orange_money" | "mtn_momo" | "mpesa" | "airtel_money";
  externalId: string;              // Provider's transaction ID
  phoneNumber: string;
  type: "send" | "receive" | "pay" | "withdraw" | "fee" | "reversal";
  amount: number;
  currency: string;
  fee: number;
  timestamp: Date;
  description: string;
  counterparty: string | null;
  status: "completed" | "pending" | "failed" | "reversed";
  reference: string | null;
};

function normalizeProviderTransaction(
  raw: unknown,
  provider: string
): NormalizedMobileTransaction {
  switch (provider) {
    case "wave":
      return normalizeWaveTransaction(raw);
    case "orange_money":
      return normalizeOrangeMoneyTransaction(raw);
    case "mtn_momo":
      return normalizeMtnMomoTransaction(raw);
    case "mpesa":
      return normalizeMpesaTransaction(raw);
    case "airtel_money":
      return normalizeAirtelMoneyTransaction(raw);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

---

## State Schema

```typescript
const mobileMoneyAgentStateSchema = z.object({
  entityId: z.string().uuid(),
  organizationId: z.string().uuid(),

  // Mobile money accounts
  wallets: z.array(z.object({
    id: z.string().uuid(),
    provider: z.enum(["wave", "orange_money", "mtn_momo", "mpesa", "airtel_money"]),
    phoneNumber: z.string(),
    accountName: z.string(),
    currency: z.string(),
    currentBalance: z.number().nullable(),
    lastReconciled: z.date().nullable(),
    linkedBankAccountId: z.string().uuid().nullable(),
  })),

  // Current reconciliation session
  session: z.object({
    walletId: z.string().uuid(),
    provider: z.string(),
    period: z.string(),
    statementSource: z.enum(["api", "pdf", "csv", "manual"]),
    startedAt: z.date(),
    status: z.enum(["ingesting", "normalizing", "matching", "reviewing", "complete", "blocked"]),
  }).nullable(),

  // Normalized transactions
  transactions: z.array(z.object({
    id: z.string().uuid(),
    provider: z.string(),
    externalId: z.string(),
    phoneNumber: z.string(),
    type: z.enum(["send", "receive", "pay", "withdraw", "fee", "reversal"]),
    amount: z.number(),
    currency: z.string(),
    fee: z.number(),
    timestamp: z.date(),
    description: z.string(),
    counterparty: z.string().nullable(),
    status: z.enum(["completed", "pending", "failed", "reversed"]),
    reference: z.string().nullable(),
    matched: z.boolean(),
    ledgerEntryId: z.string().uuid().nullable(),
    matchConfidence: z.number().nullable(),
  })),

  // Reconciliation summary
  summary: z.object({
    walletId: z.string().uuid(),
    provider: z.string(),
    totalTransactions: z.number(),
    totalInflow: z.number(),
    totalOutflow: z.number(),
    totalFees: z.number(),
    matchedCount: z.number(),
    unmatchedCount: z.number(),
    pendingCount: z.number(),
    ledgerBalance: z.number().nullable(),
    statementBalance: z.number().nullable(),
    difference: z.number().nullable(),
  }).nullable(),

  // Timing differences
  timingDifferences: z.array(z.object({
    transactionId: z.string().uuid(),
    mobileMoneyTimestamp: z.date(),
    expectedSettlementDate: z.date(),
    actualSettlementDate: z.date().nullable(),
    status: z.enum(["pending", "settled", "overdue"]),
    amount: z.number(),
  })),

  // Unmatched items
  unmatchedItems: z.array(z.object({
    transactionId: z.string().uuid(),
    provider: z.string(),
    type: z.string(),
    amount: z.number(),
    timestamp: z.date(),
    description: z.string(),
    possibleReasons: z.array(z.string()),
  })),

  confidence: z.number().min(0).max(1),
  confidenceReasoning: z.string(),
});
```

---

## Prompt Architecture

### System Prompt Outline

```
You are the Mobile Money Agent for [entity_name]. You manage all mobile
money payment rail integrations.

ROLE:
- You ingest and reconcile mobile money transactions from all providers.
- You normalize transactions across different provider formats.
- You match mobile money transactions to ledger entries.
- You detect and flag timing differences.

SUPPORTED PROVIDERS:
- Wave (primary for The Gambia, Senegal)
- Orange Money
- MTN Mobile Money
- M-Pesa (primary for East Africa)
- Airtel Money

CONSTRAINTS:
- Treat mobile money as a first-class payment rail — never an afterthought.
- Never force-match transactions with confidence below 0.7.
- Always track transaction fees separately.
- Entity-scope all operations to [entity_id].
- Flag timing differences between mobile money confirmation and bank settlement.

NORMALIZATION:
Each provider has a different statement format. Normalize all transactions to
a common schema before matching. Key fields:
- Provider transaction ID (for deduplication)
- Phone number (sender/receiver)
- Transaction type (send, receive, pay, withdraw, fee, reversal)
- Amount and currency
- Fee amount
- Timestamp
- Status (completed, pending, failed, reversed)

MATCHING:
1. Match by provider transaction ID to ledger entries with same reference
2. Match by amount + phone number + date proximity
3. Flag timing differences: mobile money shows confirmed but bank not yet settled
4. Transaction fees need separate journal entries (expense)

OUTPUT:
Produce per-wallet reconciliation report with:
- Transaction summary (inflow, outflow, fees)
- Matched/unmatched counts
- Timing differences
- Balance comparison (statement vs ledger)
- Confidence score
```

---

## Confidence Rules

| Situation | Confidence | Action |
|-----------|------------|--------|
| All transactions matched, no timing differences | ≥ 0.9 | Clean report to Treasury |
| Minor timing differences, all will settle | 0.7–0.9 | Report with timing notes |
| Unmatched transactions with clear explanations | 0.6–0.8 | Report with flagged items |
| Provider API unavailable, using statement import | 0.6–0.7 | Note data source limitation |
| Unable to normalize provider format | < 0.5 | Escalate to Treasury, request alternative |
| Duplicate transactions detected across providers | < 0.5 | Flag for deduplication review |
| Balance mismatch > 10% | < 0.4 | Escalate to Treasury immediately |

---

## Error Handling

| Error | Response |
|-------|----------|
| Provider API unavailable | Fall back to statement import, notify Treasury |
| Statement format not recognized | Request specific export format from user |
| Duplicate transaction detected across providers | Flag both, do not double-count |
| Transaction fee not recorded in ledger | Create fee entry recommendation |
| Balance significantly differs from ledger | Escalate to Treasury with both values |
| Phone number format inconsistency | Normalize, but flag for review |
| Reversed transaction not in ledger | Flag for reversal entry creation |
| Currency mismatch between wallet and ledger | Flag for review, do not auto-match |

---

## Inter-Agent Communication

### Sends to:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `reconciliation_report` | Per-wallet reconciliation summary |
| Treasury Agent | `timing_difference_alert` | Settlement timing issues |
| Treasury Agent | `ingestion_failed` | Provider or format issue |
| Controller Agent | `journal_entries` | Transaction entries via Treasury |

### Receives from:

| Agent | Message Type | Content |
|-------|-------------|---------|
| Treasury Agent | `reconciliation_request` | Wallet, period, statement source |
| Document Agent | `parsed_statement` | Parsed mobile money statement |
| System | `api_transactions` | Provider API transaction data |

---

## Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Provider format normalization | 100% | All supported formats parsed correctly |
| Transaction matching accuracy | ≥ 95% | Correct matches for obvious items |
| Timing difference detection | ≥ 90% | All timing differences identified |
| Fee tracking completeness | 100% | All transaction fees captured |
| Deduplication accuracy | 100% | No double-counted transactions |
| Multi-wallet separation | 100% | Each wallet reconciled independently |
| Processing time | < 15s per 100 transactions | Speed of normalization + matching |

**Golden dataset scenarios:**
1. Wave statement, 50 transactions, all matchable → clean report
2. MTN MoMo statement with 3 timing differences → correctly identified
3. Multi-provider: Wave + Orange Money wallets → reconciled independently
4. Reversed transaction on M-Pesa → flagged for reversal entry
5. Transaction fees not in ledger → fee entry recommended
6. Provider API timeout → graceful fallback to statement import
