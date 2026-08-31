# Security Engineer — Iteration 4: Data Leakage Review
## AI Financial Narratives Feature

**Date:** August 31, 2026  
**Reviewer:** Security Engineer  
**Status:** Complete — 6 findings, 1 Critical, 2 High, 3 Medium

---

## 1. Data Leakage Analysis

### Critical Finding: Entity Name in LLM Prompt

The `entityName` is included in the system prompt after PII redaction:

```typescript
const safeEntityName = redactPii(entityName);
const systemPrompt = `You are a financial analyst for ${safeEntityName}.`;
```

**Problem:** While `redactPii()` handles emails, phone numbers, SSNs, etc., it doesn't handle:
- **Business names** that may reveal sensitive information (e.g., "Acme Corp - Government Contractor")
- **Address information** embedded in entity names
- **Tax identification numbers** that may be part of entity names in some jurisdictions

**Risk Level:** HIGH — Entity names can reveal business relationships, government contracts, or sensitive partnerships.

**Mitigation:**
- Add business name redaction to `redactPii()`
- Consider using generic terms like "your business" instead of entity name
- Log entity name separately from narrative content

### High Finding: Account Names May Reveal Sensitive Relationships

The narrative includes account names like:
- "Revenue from Government Contract X"
- "Expense to Law Firm Y"
- "Payment to Whistleblower Z"

**Problem:** These account names reveal sensitive business relationships that shouldn't be exposed to LLM providers.

**Risk Level:** HIGH — Account names can reveal:
- Government contracts
- Legal proceedings
- Whistleblower payments
- Confidential partnerships

**Mitigation:**
- Redact sensitive account names before sending to LLM
- Use account codes instead of names in narrative context
- Add account name classification (public/sensitive/confidential)

### High Finding: Prior Period Data Exposure

The `priorPeriodData` includes full financial statements from the prior period:

```typescript
priorPeriodData = {
  profitAndLoss: priorPnl,
  balanceSheet: priorBs,
};
```

**Problem:** This doubles the amount of sensitive financial data sent to the LLM, increasing exposure risk.

**Risk Level:** HIGH — Prior period data may contain:
- Seasonal patterns that reveal business type
- Historical financial performance
- Tax calculation details

**Mitigation:**
- Only send change amounts, not full prior period data
- Redact specific amounts, show only percentages
- Limit prior period data to summary level only

### Medium Finding: Narrative May Inadvertently Reveal PII

The LLM may generate narratives that include:
- Customer names from invoice data
- Vendor names from expense data
- Employee names from payroll data

**Problem:** Even though the input data is entity-scoped, the LLM may include names in its response.

**Risk Level:** MEDIUM — LLM responses may contain PII that wasn't in the original prompt.

**Mitigation:**
- Add post-processing to redact PII from LLM responses
- Monitor narrative output for PII patterns
- Log any PII detected in narratives

### Medium Finding: No Data Retention Controls

Generated narratives are stored in the database but there's no data retention policy:

**Problem:** Narratives accumulate indefinitely, increasing exposure risk over time.

**Risk Level:** MEDIUM — Old narratives may contain:
- Outdated financial information
- Historical PII
- Obsolete business relationships

**Mitigation:**
- Implement data retention policy (e.g., 7 years for financial records)
- Add automatic deletion of old narratives
- Archive instead of delete for compliance

### Medium Finding: No Access Controls on Narrative Storage

The `narrative` field in `ReportingState` is stored without specific access controls:

**Problem:** Any user with database access can read all narratives, regardless of entity.

**Risk Level:** MEDIUM — Narrative data may be accessible to unauthorized users.

**Mitigation:**
- Add entity-based access controls to narrative storage
- Implement row-level security for narrative data
- Log all narrative access attempts

---

## 2. Security Recommendations

| Priority | Finding | Fix | Effort |
|----------|---------|-----|--------|
| P0 | Entity name exposure | Redact business names, use generic terms | 2 hours |
| P0 | Account name exposure | Redact sensitive account names | 2 hours |
| P1 | Prior period data exposure | Send only changes, not full data | 1 hour |
| P1 | LLM response PII | Add post-processing redaction | 2 hours |
| P2 | No data retention | Implement retention policy | 4 hours |
| P2 | No access controls | Add entity-based access controls | 4 hours |

---

## 3. Implementation Plan

### Phase 1: Immediate (P0)
1. Enhance `redactPii()` to handle business names
2. Redact sensitive account names before sending to LLM
3. Use generic terms instead of entity name where possible

### Phase 2: Short-term (P1)
1. Modify context builder to send only changes, not full prior period data
2. Add post-processing redaction for LLM responses
3. Implement logging for PII detection

### Phase 3: Medium-term (P2)
1. Implement data retention policy
2. Add entity-based access controls
3. Conduct security audit of narrative storage

---

## 4. Success Criteria

After implementing all fixes:

- [ ] No business names in LLM prompts
- [ ] No sensitive account names in LLM prompts
- [ ] Prior period data limited to changes only
- [ ] LLM responses post-processed for PII
- [ ] Data retention policy implemented
- [ ] Entity-based access controls enforced
- [ ] Security audit passed
