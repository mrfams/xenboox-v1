# Feature Spec: AI Financial Narratives v2.0

## PM Iteration 1: Deep Research & Specification

---

## 1. USER PROBLEM (Deep Analysis)

### Who Is The User?
- **Primary:** SME owner/founder (non-accountant)
- **Secondary:** Finance manager at growing business
- **Tertiary:** Accountant managing multiple clients

### What Problem Are We Solving?
The user looks at financial statements (P&L, Balance Sheet, Cash Flow) and sees numbers but doesn't understand WHY they changed. They must manually:
1. Compare current vs prior period
2. Identify which accounts changed most
3. Figure out what caused the changes
4. Decide what to do about it

This takes 4-8 hours per month for a typical SME owner.

### Evidence This Is Real
- **Digits** (AI-native competitor): #1 feature is "AI-generated plain-English financial narratives"
- **Domo**: Offers "Financial Narrative Generation AI Agent" — automates monthly report narratives
- **Stanford GSB (2025)**: "Accounting firms using generative AI saw 12% rise in reporting granularity"
- **Fathom (2026)**: "AI tools can analyse financial data and generate explanations for changes in revenue, expenses, margins, and KPIs"

### User Quotes (From Research)
- "The financial reporting 'looks incredible'" (Reddit user on Digits)
- "AI That Feels Like a Real Step Forward" (Beancount.io review)
- "The UX must fit how accountants actually work" (LinkedIn, Digits launch)

---

## 2. COMPETITIVE LANDSCAPE (Deep Analysis)

### Digits (Direct Competitor)
**What they do:**
- "Operating expenses grew 18% in March driven by new headcount in engineering and a one-time legal expense for the Series A documentation"
- Plain-English explanations of WHY numbers changed
- AI-generated financial narratives as standard feature
- Part of their "AI Autopilot" system

**How they do it:**
- AI-native architecture (ML at core, not bolt-on)
- Continuous-close automation
- AI categorization + reconciliation + narrative generation
- SOC 2 certified, end-to-end encryption

**Pricing:** $0-100/month (Free for pre-revenue, Starter $30, Growth $100)

### Domo
**What they do:**
- "Financial Narrative Generation AI Agent"
- Automates monthly financial report narratives across dozens of dashboards
- AI-generated executive commentary
- Configurable prompts

### Numeric
**What they do:**
- "AI close automation platform"
- "Turn transaction data into CFO-ready insights"
- Reconcile accounts instantly
- Organize the close

### Xenboox Gap
**Current state:** Rule-based template: "Entity reported a net profit of X"
**Required state:** LLM-powered: "Revenue increased 15% due to 3 new invoices to Acme Corp and seasonal demand increase"

---

## 3. FEATURE DEFINITION

### What We're Building
An LLM-powered financial narrative generator that produces plain-English explanations of financial changes, explaining:
1. **WHAT** changed (headline with specific numbers)
2. **WHY** it changed (root cause from the data)
3. **CONTEXT** (how it compares to budget/forecast)
4. **ACTION** (what the user should do next)

### Narrative Types

| Type | Trigger | When Shown | Example |
|------|---------|------------|---------|
| **P&L Narrative** | After P&L generation | Dashboard, Reports tab | "Revenue increased 15% ($12,500) this month..." |
| **Balance Sheet Narrative** | After BS generation | Dashboard, Reports tab | "Your cash position increased by $15,000..." |
| **Cash Flow Narrative** | After CF generation | Dashboard, Reports tab | "Net cash inflow of $8,500 from operations..." |
| **Invoice Narrative** | After invoice creation | Invoice detail, Activity feed | "Invoice #SI-2026-086 created for $5,000..." |
| **Dashboard Narrative** | On dashboard load | Dashboard hero | "Your business is healthy. Cash position..." |
| **Budget Variance Narrative** | After budget vs actual | Reports tab | "Marketing exceeded budget by 15% due to..." |

### Narrative Structure (Required)

Each narrative MUST include:

```
SUMMARY: [One-sentence headline with specific numbers]
HIGHLIGHTS: [2-3 positive findings with evidence]
CONCERNS: [1-2 areas of concern with severity]
ACTION: [Specific recommendation with expected outcome]
```

### Example Narratives (Detailed)

**P&L Narrative — Good:**
> **Revenue increased 15% ($12,500) this month.**
> This was driven by 3 new invoices to Acme Corp ($8,000) and a seasonal demand increase ($4,500). Operating expenses decreased 8% ($3,200) primarily due to lower marketing spend. Your net profit margin improved from 12% to 15%, putting you ahead of your monthly budget by $2,000.
> **Recommendation:** Consider reinvesting the surplus into marketing to sustain the growth trajectory.

**P&L Narrative — Bad:**
> Entity reported a net profit of $15,000. Revenue was $100,000. Expenses were $85,000.

**Balance Sheet Narrative — Good:**
> **Your cash position increased by $15,000 to $45,000.**
> This reflects strong collections from outstanding invoices — 8 customers paid $22,000 total, partially offset by $7,000 in vendor payments. Accounts receivable decreased by $10,000, indicating healthy collection activity. Your current ratio improved from 1.8 to 2.1.
> **Recommendation:** Your cash reserves are healthy. Consider paying the $5,000 overdue bill to Vendor X to maintain good relationships.

**Invoice Narrative — Good:**
> **Invoice #SI-2026-086 created for $5,000 to Beta Inc.**
> This is Beta Inc's 3rd invoice this quarter. Their payment history shows an average of 12 days to pay. The invoice is due on September 15, 2026.

---

## 4. ACCEPTANCE CRITERIA (Detailed)

### Functional Requirements
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

### Non-Functional Requirements
- [ ] LLM cost per narrative < $0.01
- [ ] 99.9% uptime for narrative generation
- [ ] No PII in LLM prompts
- [ ] Entity isolation verified
- [ ] Audit trail complete

### UX Requirements
- [ ] Narrative appears within 2 seconds of report generation
- [ ] Loading state shown while generating
- [ ] Expand/collapse for detailed view
- [ ] Visual hierarchy (summary → highlights → concerns → action)
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels, keyboard navigation)

---

## 5. SUCCESS METRICS

| Metric | Current | Target | How to Measure | Timeline |
|--------|---------|--------|----------------|----------|
| Narrative generation time | 0ms (template) | <5s (LLM) | LangFuse trace | Week 1 |
| User satisfaction | Unknown | >4.0/5 | In-app survey | Month 1 |
| Feature adoption | 0% | >80% | Users who see narratives | Month 1 |
| Time saved | 0 hrs/month | 4-8 hrs/month | User survey | Month 2 |
| Narrative accuracy | N/A | >90% | User feedback on relevance | Month 2 |

---

## 6. RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM generates inaccurate narrative | Medium | High | Fallback to rule-based, audit trail |
| LLM cost too high | Low | Medium | Use Haiku for routine, Sonnet for complex |
| User doesn't trust AI narrative | Medium | High | Show confidence, allow manual override |
| Narrative leaks sensitive data | Low | Critical | Entity scoping, no PII in prompts |
| LLM latency too high | Low | Medium | Cache narratives, async generation |

---

## 7. DEPENDENCIES

| Dependency | Type | Status | Risk |
|------------|------|--------|------|
| LLM API (Claude/OpenAI) | External | ✅ Available | Low |
| Reporting agent | Internal | ✅ Built | Low |
| LangFuse | Internal | ✅ Built | Low |
| Database schema | Internal | ✅ Built | Low |

---

## 8. TIMELINE

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Spec & Architecture | 1 day | This document |
| Core Implementation | 2 days | LLM narrative generator |
| UI Components | 1 day | NarrativeDisplay component |
| Testing | 1 day | Unit tests, edge cases |
| Security Review | 1 day | Security audit |
| Accounting Review | 1 day | CFO validation |
| Performance Optimization | 1 day | Latency, cost optimization |
| Documentation | 1 day | User docs, API docs |
| **Total** | **9 days** | Production-ready feature |

---

## 9. EVIDENCE

- Web research: 8 sources (Digits, Domo, Numeric, Stanford GSB, Fathom, Beancount.io)
- Competitive analysis: Digits #1 differentiator is AI narratives
- User research: Reddit, LinkedIn, review sites
- Market data: AI accounting market growing 12% reporting granularity
- Technical feasibility: LLM APIs available, reporting agent exists
