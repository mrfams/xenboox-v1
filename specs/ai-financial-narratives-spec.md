# Feature Spec: AI Financial Narratives

## Goal
Replace the current rule-based narrative generator with an LLM-powered system that produces plain-English explanations of financial changes — explaining WHY numbers changed, not just WHAT changed.

## User Problem
**User:** SME owner/founder
**Context:** Looking at P&L, Balance Sheet, or Cash Flow Statement
**Pain:** Numbers show WHAT happened but not WHY. User must manually figure out what caused changes.
**Impact:** User can't make informed decisions without understanding root causes.
**Current solution:** Rule-based templates: "Entity reported a net profit of X" — no explanation.
**Evidence:** Digits' #1 differentiator is AI narratives. Users say it saves 4-8 hours/month.

## What Digits Does (Competitive Benchmark)
- "Operating expenses grew 18% in March driven by new headcount in engineering and a one-time legal expense for the Series A documentation"
- "Revenue increased 15% due to 3 new invoices to Acme Corp and seasonal demand increase"
- "Your accounts receivable aging shows 3 invoices totaling $15,000 are overdue by 30+ days"

## What We Must Build

### Narrative Types

| Type | Trigger | Output |
|------|---------|--------|
| **P&L Narrative** | After P&L generation | Explains revenue/expense changes vs prior period |
| **Balance Sheet Narrative** | After BS generation | Explains asset/liability/equity changes |
| **Cash Flow Narrative** | After CF generation | Explains cash inflows/outflows |
| **Invoice Narrative** | After invoice creation | "Your first invoice for $500 to Acme Corp" |
| **Dashboard Narrative** | On dashboard load | AI summary of current financial health |
| **Budget Variance Narrative** | After budget vs actual | Explains why budget was exceeded/met |

### Narrative Structure

Each narrative must include:
1. **Headline:** One-sentence summary of the key change
2. **Explanation:** WHY the change happened (root cause)
3. **Context:** How this compares to budget/forecast/industry
4. **Action:** What the user should do next

### Example Narratives

**P&L Narrative:**
> **Revenue increased 15% ($12,500) this month.**
> This was driven by 3 new invoices to Acme Corp ($8,000) and a seasonal demand increase ($4,500). Operating expenses decreased 8% ($3,200) primarily due to lower marketing spend. Your net profit margin improved from 12% to 15%, putting you ahead of your monthly budget by $2,000.
> **Recommendation:** Consider reinvesting the surplus into marketing to sustain the growth trajectory.

**Balance Sheet Narrative:**
> **Your cash position increased by $15,000 to $45,000.**
> This reflects strong collections from outstanding invoices — 8 customers paid $22,000 total, partially offset by $7,000 in vendor payments. Accounts receivable decreased by $10,000, indicating healthy collection activity. Your current ratio improved from 1.8 to 2.1.
> **Recommendation:** Your cash reserves are healthy. Consider paying the $5,000 overdue bill to Vendor X to maintain good relationships.

**Invoice Narrative:**
> **Invoice #SI-2026-086 created for $5,000 to Beta Inc.**
> This is Beta Inc's 3rd invoice this quarter. Their payment history shows an average of 12 days to pay. The invoice is due on September 15, 2026.

## Technical Architecture

### Current State
- `generateNarrative()` in `packages/agents/platform/reporting-agent/tools.ts`
- Rule-based template: "Entity reported a net profit of X"
- No LLM integration
- No comparison to prior periods
- No actionable recommendations

### Required Changes

| File | Change | Priority |
|------|--------|----------|
| `packages/agents/platform/reporting-agent/tools.ts` | Upgrade `generateNarrative()` to use LLM | P0 |
| `packages/agents/core/llm/agent-llm.ts` | Add narrative generation prompt | P0 |
| `packages/db/schema/` | Add `narratives` table | P0 |
| `apps/web/components/finance/` | Add NarrativeDisplay component | P0 |
| `packages/agents/platform/reporting-agent/nodes.ts` | Store narratives in DB | P0 |

### LLM Prompt Design

```
You are a financial analyst explaining {entityName}'s financial performance.

Given this financial data:
{reportData}

Generate a plain-English narrative that:
1. Explains WHAT changed (headline)
2. Explains WHY it changed (root cause from the data)
3. Provides CONTEXT (how it compares to budget/forecast)
4. Recommends an ACTION (what the user should do)

Rules:
- Use specific numbers, not vague terms
- Reference specific accounts, vendors, customers
- Keep it under 200 words
- Use professional but accessible tone
- Never expose raw data without explanation
- Never make assumptions not supported by the data
```

## Acceptance Criteria

- [ ] P&L narrative explains revenue/expense changes with specific numbers
- [ ] Balance Sheet narrative explains asset/liability changes
- [ ] Cash Flow narrative explains cash movements
- [ ] Invoice narrative appears after invoice creation
- [ ] Dashboard narrative shows AI summary on load
- [ ] Budget variance narrative explains why budget was exceeded
- [ ] Narratives stored in database for historical reference
- [ ] Narratives respect entity scoping (no cross-entity data)
- [ ] Narratives don't leak sensitive data
- [ ] Narratives generated in <5 seconds
- [ ] Narratives fallback gracefully if LLM fails
- [ ] Narratives are auditable (logged to LangFuse)

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Narrative generation time | 0ms (template) | <5s (LLM) | LangFuse trace |
| User satisfaction | Unknown | >4.0/5 | In-app survey |
| Feature adoption | 0% | >80% | Users who see narratives |
| Time saved | 0 hrs/month | 4-8 hrs/month | User survey |

## Out of Scope
- Multi-turn conversation about narratives
- Narrative editing/customization
- Narrative export to PDF
- Narrative sharing via email
