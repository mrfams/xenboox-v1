# Pipeline 2: Bank Connection → Transaction Import → Categorization — Engineering Audit

## Employee #3 (Engineering Lead) — Deep Audit

### 🔴 Critical Issues

| #   | Issue                                               | Location               | Impact                                                                               |
| --- | --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| 1   | **`listRules` N+1 queries**                         | `banking.ts` listRules | Each rule calls `countRuleMatches` individually. 10 rules = 10 DB queries.           |
| 2   | **`autoCategorize` + `batchCategorize` duplicated** | `banking.ts`           | Same 60-line categorization logic copy-pasted. DRY violation, maintenance nightmare. |
| 3   | **`getCashPosition` running balance starts at 0**   | `banking.ts`           | Doesn't account for initial account balance. Running balance is wrong.               |

### ⚠️ Medium Issues

| #   | Issue                                                                          | Impact                                 |
| --- | ------------------------------------------------------------------------------ | -------------------------------------- |
| 4   | No rate limit on `syncTransactions` mutation                                   | User could spam sync button            |
| 5   | Demo transactions category set to "Uncategorized" instead of template category | AI categorization has to re-categorize |
| 6   | `paginatePlaidSync` re-queries ALL entity transactions per page                | Should narrow query scope              |

### ✅ What's Solid

- Cursor-based incremental Plaid sync
- Batch dedup (single query, not N+1)
- Modified/removed transaction handling
- Bidirectional reconciliation linking
- Error classification in UI
- Statement upload with balance equation validation
- Connection deletion with audit trail
