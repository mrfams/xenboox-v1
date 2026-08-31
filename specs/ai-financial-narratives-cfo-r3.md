# CFO/Finance Domain Expert — Iteration 3: Accounting Accuracy Review
## AI Financial Narratives Feature

**Date:** August 31, 2026  
**Reviewer:** CFO/Finance Domain Expert  
**Status:** Complete — 8 findings, 2 Critical, 3 High, 3 Medium

---

## 1. Accounting Accuracy Review

### Critical Finding: Revenue Recognition Timing

The narrative generator uses `revenueByAccount` from the P&L, which includes all posted journal entries for the period. However, it doesn't distinguish between:

1. **Accrued revenue** (earned but not yet invoiced)
2. **Deferred revenue** (invoiced but not yet earned)
3. **Cash-basis revenue** (collected cash)

**Problem:** The narrative may incorrectly state "Revenue increased" when the increase is actually due to timing differences in revenue recognition, not actual business performance.

**Example:**
- January: Invoiced $10,000 for services to be delivered in February
- February: Delivered services, recognized $10,000 revenue
- Narrative says: "Revenue increased 100% from January to February"
- Reality: Revenue is flat; timing of recognition shifted

**Fix Required:**
- Add revenue recognition method context to the narrative prompt
- Warn users when revenue changes may be due to timing, not performance
- Include accrual/deferred amounts in the context

### Critical Finding: Expense Matching Principle

The narrative generator includes all expenses in the period, but doesn't consider the **matching principle** — expenses should be matched to the revenue they helped generate.

**Problem:** The narrative may incorrectly attribute expense changes to cost control when they're actually due to timing.

**Example:**
- Marketing spend in January ($5,000) generates sales in February ($20,000)
- Narrative says: "Marketing expenses decreased 60% in February — great cost control!"
- Reality: Marketing spend shifted to January; February looks artificially efficient

**Fix Required:**
- Add expense timing context to the narrative
- Consider accruals and prepayments when analyzing expense trends
- Warn about timing-related changes

### High Finding: No Currency Conversion Context

The narrative generator uses `currency` parameter but doesn't handle multi-currency scenarios:

```typescript
parts.push(`Revenue: ${currency} ${pnl.revenue.toLocaleString()}`);
```

**Problem:** If the entity has transactions in multiple currencies, the P&L may include converted amounts at different rates, distorting the narrative.

**Fix Required:**
- Add currency conversion context
- Warn about FX impact on revenue/expense trends
- Consider showing amounts in both local and reporting currency

### High Finding: No Depreciation Amortization Context

The narrative generator includes depreciation as an expense but doesn't explain its impact:

```typescript
parts.push(`Expenses by account:`);
for (const acc of pnl.expensesByAccount.slice(0, 5)) {
  parts.push(`  - ${acc.accountName} (${acc.accountCode}): ${currency} ${acc.amount.toLocaleString()}`);
}
```

**Problem:** Depreciation is a non-cash expense that can significantly impact net profit but doesn't affect cash flow. The narrative may incorrectly suggest the business is less profitable than it actually is in cash terms.

**Fix Required:**
- Separate cash and non-cash expenses in the narrative
- Explain depreciation impact on profitability vs cash flow
- Add cash flow context when discussing profitability

### High Finding: No Tax Implications

The narrative generator doesn't consider tax implications of financial changes:

**Problem:** A business may show increased profit but also increased tax liability. The narrative may suggest reinvesting surplus without considering tax obligations.

**Fix Required:**
- Add tax context to the narrative
- Consider deferred tax assets/liabilities
- Warn about tax implications of recommendations

### Medium Finding: No Industry Benchmarking

The narrative generator doesn't compare results to industry benchmarks:

**Problem:** A 10% profit margin may be excellent for a restaurant but poor for a software company. The narrative may incorrectly assess performance without industry context.

**Fix Required:**
- Add optional industry benchmark data
- Compare key metrics to industry averages
- Provide context about what's "normal" for the industry

### Medium Finding: No Seasonality Context

The narrative generator doesn't consider seasonal patterns:

**Problem:** A retail business may show increased revenue in December due to holiday shopping, not business growth. The narrative may overstate performance.

**Fix Required:**
- Add seasonality context when historical data is available
- Compare to same period last year, not just prior month
- Warn about seasonal effects on trends

### Medium Finding: No Cash Conversion Cycle

The narrative generator doesn't analyze the cash conversion cycle:

**Problem:** A business may show increased profit but also increased accounts receivable, meaning cash isn't being collected. The narrative may suggest the business is healthier than it actually is in cash terms.

**Fix Required:**
- Add cash conversion cycle metrics
- Analyze days sales outstanding (DSO), days payable outstanding (DPO)
- Warn about cash flow vs profitability disconnect

---

## 2. Implementation Recommendations

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| P0 | Revenue recognition timing | Add timing context to prompt | 2 hours |
| P0 | Expense matching principle | Add matching context to prompt | 2 hours |
| P1 | No currency conversion context | Add FX impact analysis | 1 hour |
| P1 | No depreciation context | Separate cash/non-cash expenses | 1 hour |
| P1 | No tax implications | Add tax context to narrative | 2 hours |
| P2 | No industry benchmarking | Add benchmark data | 4 hours |
| P2 | No seasonality context | Add year-over-year comparison | 2 hours |
| P2 | No cash conversion cycle | Add DSO/DPO analysis | 2 hours |

---

## 3. Updated LLM Prompt Recommendations

The current prompt should be enhanced with accounting-specific instructions:

```
Additional Accounting Rules:
1. Distinguish between cash-basis and accrual-basis revenue
2. Consider revenue recognition timing when analyzing trends
3. Apply matching principle for expense analysis
4. Separate cash and non-cash expenses (depreciation, amortization)
5. Consider tax implications of recommendations
6. Compare to same period last year for seasonality
7. Analyze cash conversion cycle (DSO, DPO)
8. Warn about timing-related changes vs actual performance changes
```

---

## 4. Success Criteria

After implementing all fixes:

- [ ] Narratives distinguish between timing and performance changes
- [ ] Narratives include cash vs non-cash expense analysis
- [ ] Narratives consider tax implications
- [ ] Narratives compare to same period last year
- [ ] Narratives analyze cash conversion cycle
- [ ] Narratives provide industry context when available
- [ ] Narratives warn about seasonal effects
