# Engineering Critique — Iteration 5: Code Quality Review
## AI Financial Narratives Feature

**Date:** August 31, 2026  
**Reviewer:** Engineering Critique  
**Status:** Complete — 7 findings, 1 Critical, 3 High, 3 Medium

---

## 1. Code Quality Review

### Critical Finding: Function Too Long

The `buildNarrativeContext` function is now over 200 lines long, making it difficult to understand and maintain.

**Problem:** Long functions are harder to test, debug, and modify. They often have multiple responsibilities that should be separated.

**Current Length:** ~250 lines

**Fix Required:**
- Break into smaller, focused functions:
  - `buildPnlContext()`
  - `buildBalanceSheetContext()`
  - `buildPriorPeriodContext()`
  - `buildCashVsNonCashContext()`
- Each function should be <50 lines
- Each function should have a single responsibility

### High Finding: Duplicated Redaction Logic

The `redactPii()` function is called in multiple places:
1. On `entityName` before system prompt
2. On each account name in context
3. On each narrative response field

**Problem:** This creates maintenance overhead and potential inconsistency.

**Fix Required:**
- Create a `redactNarrativeContext()` helper function
- Centralize all redaction logic in one place
- Ensure consistent redaction across all inputs/outputs

### High Finding: No Error Boundaries

The `generateNarrativeLLM` function has a try-catch that falls back to rule-based narrative, but:

1. No logging of which field failed parsing
2. No metrics on parse success rate
3. No alerting on high fallback rates

**Problem:** Silent failures make it hard to detect issues in production.

**Fix Required:**
- Add detailed logging for parse failures
- Track parse success/failure metrics
- Add alerting for high fallback rates (>10%)

### High Finding: Regex Patterns Are Fragile

The narrative parsing uses multiple regex patterns:

```typescript
const summaryMatch = content.match(/SUMMARY:\s*(.+?)(?=\n|$)/i);
const highlightsMatch = content.match(/HIGHLIGHTS:\s*([\s\S]*?)(?=CONCERNS:|ACTION:|$)/i);
```

**Problem:** These patterns can break if the LLM:
- Uses different capitalization
- Adds extra whitespace
- Uses markdown formatting
- Changes the order of sections

**Fix Required:**
- Add more flexible patterns with fallbacks
- Log parsing attempts and failures
- Consider using structured output (JSON mode)

### Medium Finding: No Unit Tests

The narrative generation functions lack unit tests:

**Problem:** Without tests, it's hard to verify:
- Context building produces correct output
- Parsing handles edge cases
- Redaction works correctly
- Fallback behavior is correct

**Fix Required:**
- Add unit tests for `buildNarrativeContext()`
- Add unit tests for narrative parsing
- Add unit tests for redaction
- Add integration tests for end-to-end flow

### Medium Finding: Inconsistent Error Handling

The `nodeGenerateNarrative` function has inconsistent error handling:

```typescript
try {
  // ... complex logic ...
} catch (error) {
  // Fallback to rule-based narrative
}
```

**Problem:** Some errors are caught and handled gracefully, others are not. This makes debugging difficult.

**Fix Required:**
- Define error types and handling strategy
- Add specific error handling for each failure mode
- Ensure all errors are logged with context

### Medium Finding: No Configuration Management

The narrative generation has hardcoded values:
- `maxTokens: 1024`
- `temperature: 0.3`
- `slice(0, 5)` for account limits

**Problem:** These values should be configurable for different use cases.

**Fix Required:**
- Move configuration to environment variables or config file
- Add documentation for each configuration option
- Allow per-entity configuration

---

## 2. Code Quality Recommendations

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| P0 | Function too long | Break into smaller functions | 2 hours |
| P1 | Duplicated redaction | Create centralized redaction helper | 1 hour |
| P1 | No error boundaries | Add detailed logging and metrics | 2 hours |
| P1 | Fragile regex | Add flexible patterns and fallbacks | 2 hours |
| P2 | No unit tests | Add comprehensive test suite | 4 hours |
| P2 | Inconsistent error handling | Define error handling strategy | 2 hours |
| P3 | No configuration management | Extract to config | 1 hour |

---

## 3. Refactoring Plan

### Phase 1: Immediate (P0)
1. Break `buildNarrativeContext` into smaller functions
2. Create centralized redaction helper
3. Add detailed error logging

### Phase 2: Short-term (P1)
1. Improve regex patterns with fallbacks
2. Add metrics for parse success/failure
3. Add alerting for high fallback rates

### Phase 3: Medium-term (P2)
1. Add unit tests for all functions
2. Define error handling strategy
3. Extract configuration to config file

---

## 4. Success Criteria

After implementing all fixes:

- [ ] No function >50 lines
- [ ] Centralized redaction logic
- [ ] Detailed error logging
- [ ] Parse success metrics
- [ ] Unit test coverage >80%
- [ ] Consistent error handling
- [ ] Configuration management
