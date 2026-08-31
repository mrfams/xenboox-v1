# Engineering Lead — Iteration 7: Edge Case Stress Tests
## AI Financial Narratives Feature

**Date:** August 31, 2026  
**Reviewer:** Engineering Lead  
**Status:** Complete — 8 findings, 2 Critical, 3 High, 3 Medium

---

## 1. Edge Case Analysis

### Critical Finding: Zero Revenue/Expenses

**Scenario:** Entity has $0 revenue and $0 expenses for the period.

**Current Behavior:**
- `buildPnlContext()` generates:
  ```
  Revenue: $0
  Expenses: $0
  Net Profit: $0
  Profit Margin: NaN% (division by zero)
  ```

**Problem:** `NaN%` is shown to the user, which is confusing and unprofessional.

**Fix Required:**
- Check for zero revenue before calculating margin
- Show "N/A" or omit margin when revenue is zero
- Handle zero revenue/expenses gracefully in narrative

### Critical Finding: Extremely Large Numbers

**Scenario:** Entity has $1,000,000,000 in revenue.

**Current Behavior:**
- `toLocaleString()` formats as "1,000,000,000"
- LLM receives: "Revenue: $1,000,000,000"

**Problem:** 
- Very large numbers may confuse the LLM
- Narrative may produce inaccurate comparisons
- Token usage increases with large numbers

**Fix Required:**
- Abbreviate large numbers (e.g., "$1B", "$1.5M")
- Add scale context to LLM prompt
- Validate LLM output for large number accuracy

### High Finding: Negative Revenue

**Scenario:** Entity has negative revenue (e.g., from returns or adjustments).

**Current Behavior:**
- `buildPnlContext()` shows: "Revenue: $-5,000"

**Problem:** Negative revenue is confusing and may cause LLM to generate inaccurate narratives.

**Fix Required:**
- Handle negative revenue specially
- Explain the reason (returns, adjustments, etc.)
- Add context for negative values

### High Finding: Missing Account Names

**Scenario:** Account has empty or null name.

**Current Behavior:**
- `redactPii(acc.accountName)` receives empty string
- Output: "  - () (1001): $5,000"

**Problem:** Empty account names look unprofessional and confuse users.

**Fix Required:**
- Default to "Unknown Account" for empty names
- Log missing account names for data quality
- Skip accounts with missing names

### High Finding: Unicode in Account Names

**Scenario:** Account names contain Unicode characters (e.g., "Ñoño Store", "Café Revenue").

**Current Behavior:**
- `redactPii()` may not handle Unicode correctly
- LLM may misinterpret Unicode characters

**Problem:** Unicode characters may cause:
- Encoding issues in LLM prompt
- Incorrect narrative generation
- Security vulnerabilities

**Fix Required:**
- Test Unicode handling in `redactPii()`
- Ensure LLM receives properly encoded text
- Add Unicode validation

### Medium Finding: Concurrent Narrative Generation

**Scenario:** Multiple users request narratives simultaneously.

**Current Behavior:**
- Each request triggers separate LLM call
- No rate limiting or queuing

**Problem:** 
- LLM API may rate limit
- Costs increase with concurrent requests
- No deduplication of identical requests

**Fix Required:**
- Add rate limiting for LLM calls
- Implement request queuing
- Add deduplication for identical requests

### Medium Finding: LLM Response Truncation

**Scenario:** LLM response is truncated due to token limits.

**Current Behavior:**
- Regex parsing fails to find sections
- Falls back to rule-based narrative

**Problem:** Truncated responses may contain valuable information that's lost.

**Fix Required:**
- Add response length validation
- Handle truncated responses gracefully
- Log truncation events

### Medium Finding: Special Characters in Entity Name

**Scenario:** Entity name contains special characters (e.g., "O'Brien & Sons", "AT&T").

**Current Behavior:**
- `redactPii()` may not handle special characters
- LLM prompt may break due to special characters

**Problem:** Special characters can:
- Break prompt formatting
- Cause injection vulnerabilities
- Confuse the LLM

**Fix Required:**
- Sanitize entity names before including in prompt
- Escape special characters
- Test with various entity name formats

---

## 2. Edge Case Test Matrix

| Test Case | Input | Expected Output | Status |
|-----------|-------|-----------------|--------|
| Zero revenue | revenue: 0 | "No revenue recorded" | ❌ |
| Zero expenses | expenses: 0 | "No expenses recorded" | ❌ |
| Large numbers | revenue: 1,000,000,000 | "$1B" | ❌ |
| Negative revenue | revenue: -5000 | "Net returns of $5,000" | ❌ |
| Empty account name | accountName: "" | "Unknown Account" | ❌ |
| Unicode name | accountName: "Ñoño" | Properly handled | ❌ |
| Concurrent requests | 10 simultaneous | Rate limited | ❌ |
| Truncated response | Response cut off | Graceful fallback | ❌ |
| Special chars in name | "O'Brien" | Sanitized | ❌ |

---

## 3. Implementation Recommendations

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| P0 | Zero revenue/expenses | Add zero checks | 1 hour |
| P0 | Large numbers | Abbreviate numbers | 2 hours |
| P1 | Negative revenue | Handle negative values | 2 hours |
| P1 | Missing account names | Default to "Unknown" | 1 hour |
| P1 | Unicode handling | Test and fix Unicode | 2 hours |
| P2 | Concurrent requests | Add rate limiting | 4 hours |
| P2 | Truncated responses | Handle truncation | 2 hours |
| P3 | Special characters | Sanitize names | 2 hours |

---

## 4. Success Criteria

After implementing all fixes:

- [ ] Zero revenue/expenses handled gracefully
- [ ] Large numbers abbreviated
- [ ] Negative revenue explained
- [ ] Missing account names defaulted
- [ ] Unicode characters handled correctly
- [ ] Concurrent requests rate limited
- [ ] Truncated responses handled gracefully
- [ ] Special characters sanitized
