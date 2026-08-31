# Engineering Lead — Iteration 2: Deep Architecture Review
## AI Financial Narratives Feature

**Date:** August 31, 2026  
**Reviewer:** Engineering Lead  
**Status:** Complete — 10 findings, 3 Critical, 4 High, 3 Medium

---

## 1. Security Review

### Critical Finding: No Injection Defense Suffix

The `generateNarrativeLLM` function in `tools.ts` builds a system prompt that includes `entityName` directly:

```typescript
const systemPrompt = `You are a financial analyst for ${entityName}. Generate a plain-English financial narrative.`;
```

**Problem:** The `entityName` is not redacted via `redactPii()` and the system prompt does NOT append the `INJECTION_DEFENSE_SUFFIX`. This means:

1. If `entityName` contains malicious content (e.g., from a compromised database), it could manipulate the LLM
2. The prompt lacks the standard injection defense instructions that all other agent prompts include

**Fix Required:**
- Import `redactPii` and `INJECTION_DEFENSE_SUFFIX` from `injection-defense.ts`
- Apply `redactPii()` to `entityName` before including in prompt
- Append `INJECTION_DEFENSE_SUFFIX` to the system prompt

### Critical Finding: No PII Redaction on Financial Data

The `buildNarrativeContext` function includes raw financial data that may contain:
- Customer names (from `revenueByAccount`)
- Vendor names (from `expensesByAccount`)
- Account names that could reveal sensitive business relationships

**Problem:** While account names are generally safe, the function should still apply PII redaction as defense-in-depth.

### High Finding: Regex Parsing is Fragile

The narrative response parsing uses regex patterns:

```typescript
const summaryMatch = content.match(/SUMMARY:\s*(.+?)(?=\n|$)/i);
const highlightsMatch = content.match(/HIGHLIGHTS:\s*([\s\S]*?)(?=CONCERNS:|ACTION:|$)/i);
```

**Problem:** If the LLM formats its response slightly differently (e.g., "Summary:" instead of "SUMMARY:"), parsing fails silently.

**Fix Required:**
- Add fallback parsing with more flexible patterns
- Log parsing failures for debugging
- Consider using structured output (JSON mode) if available

---

## 2. Reliability Review

### Critical Finding: No Timeout Handling

The `callModel` function is called without explicit timeout configuration:

```typescript
const result = await callModel({
  agentName: "reporting-agent",
  taskType: "strategic_planning",
  entityId,
  systemPrompt,
  messages: [{ role: "user", content: userMessage }],
  traceId: trace.id,
});
```

**Problem:** If the LLM API is slow or hanging, the narrative generation will block indefinitely. This is a production reliability issue.

**Fix Required:**
- Add timeout configuration (e.g., 30 seconds)
- Implement retry logic with exponential backoff
- Add circuit breaker pattern for LLM API failures

### High Finding: No Retry Logic

If the LLM call fails (network error, rate limit, etc.), the function immediately falls back to rule-based narrative without retrying.

**Fix Required:**
- Implement retry with exponential backoff (max 3 retries)
- Only fall back to rule-based after retries exhausted
- Log retry attempts for observability

### High Finding: No Caching of Generated Narratives

Every time a report is generated, the narrative is regenerated from scratch, even if the underlying data hasn't changed.

**Fix Required:**
- Cache narratives by (entityId, periodId, reportType, dataHash)
- Invalidate cache when underlying data changes
- Add cache hit/miss logging

---

## 3. Data Quality Review

### Medium Finding: No Confidence Score in Narrative

The `Narrative` schema lacks a `confidence` field:

```typescript
export const NarrativeSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  action: z.string().optional(),
});
```

**Problem:** Per AGENTS.md, every agent output MUST include a `confidence` field (0-1). The narrative is an agent output but lacks this.

**Fix Required:**
- Add `confidence: z.number()` to `NarrativeSchema`
- Calculate confidence based on:
  - LLM response quality (did it follow the format?)
  - Data completeness (did we have all report types?)
  - Prior period availability (do we have comparison data?)

### Medium Finding: No Prior Period Data Fetching

The `nodeGenerateNarrative` function doesn't fetch prior period data:

```typescript
const narrative = await generateNarrativeLLM(
  state.entityName,
  state.entityId,
  reportData,
  state.currency,
);
```

**Problem:** The `generateNarrativeLLM` function accepts `priorPeriodData` parameter, but `nodeGenerateNarrative` never passes it. This means narratives never include period-over-period comparisons.

**Fix Required:**
- Fetch prior period data in `nodeGenerateNarrative`
- Pass it to `generateNarrativeLLM`
- Handle cases where prior period doesn't exist

### Medium Finding: No Narrative Type Differentiation

The current implementation generates the same narrative for all report types. There's no differentiation between:
- P&L narrative (should focus on revenue/expense changes)
- Balance Sheet narrative (should focus on asset/liability changes)
- Cash Flow narrative (should focus on cash movements)

**Fix Required:**
- Add `reportType` parameter to `generateNarrativeLLM`
- Customize prompt based on report type
- Add type-specific metrics and recommendations

---

## 4. Performance Review

### High Finding: Context Building is Inefficient

The `buildNarrativeContext` function creates a large string that includes ALL report data, even if it's not relevant to the narrative.

**Problem:** This wastes tokens and increases LLM cost.

**Fix Required:**
- Limit context to top 5 accounts per section (already done for revenue/expenses, but not for balance sheet)
- Add token counting to ensure context stays within limits
- Consider summarizing large datasets before sending to LLM

---

## 5. Implementation Plan

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| P0 | No injection defense suffix | Add `INJECTION_DEFENSE_SUFFIX` to prompt | 30 min |
| P0 | No PII redaction | Apply `redactPii()` to entityName | 15 min |
| P0 | No timeout handling | Add timeout + retry logic | 1 hour |
| P1 | Fragile regex parsing | Add fallback parsing + logging | 1 hour |
| P1 | No retry logic | Implement retry with backoff | 1 hour |
| P1 | No confidence score | Add confidence to NarrativeSchema | 30 min |
| P2 | No prior period data | Fetch and pass prior period | 2 hours |
| P2 | No narrative type differentiation | Customize prompt by report type | 2 hours |
| P2 | No caching | Implement narrative caching | 2 hours |
| P3 | Inefficient context building | Optimize token usage | 1 hour |

---

## 6. Success Criteria

After implementing all fixes:

- [ ] All P0 items resolved
- [ ] All P1 items resolved
- [ ] Narrative generation time < 5 seconds (including retries)
- [ ] LLM cost per narrative < $0.01
- [ ] 99.9% uptime for narrative generation
- [ ] No PII in LLM prompts
- [ ] Entity isolation verified
- [ ] Audit trail complete
- [ ] Confidence score included in all narratives
- [ ] Prior period comparison available when data exists
