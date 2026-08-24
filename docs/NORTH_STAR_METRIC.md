# North Star Metric

> The single metric that best captures the value Xenboox delivers to customers.

---

## Definition

**Weekly Active AI Interactions (WAAI)**

> The number of unique AI agent actions (categorizations, reconciliations, reports generated, recommendations approved) per week across all active entities.

### Why This Metric?

1. **Measures value delivery** — Every AI interaction means work the human didn't have to do
2. **Predicts retention** — Users who interact with AI weekly are 5x more likely to stay
3. **Drives revenue** — More interactions = more value = willingness to upgrade
4. **Actionable** — Team can directly influence it through agent quality and UX

---

## Components

| Component               | Definition                      | Example  |
| ----------------------- | ------------------------------- | -------- |
| Auto-categorization     | AI categorizes a transaction    | 150/week |
| Reconciliation match    | AI matches bank feed to ledger  | 40/week  |
| Report generation       | AI generates a financial report | 5/week   |
| Recommendation approved | Human approves an AI suggestion | 20/week  |
| Insight surfaced        | AI proactively alerts the user  | 8/week   |

**WAAI = Auto-categorizations + Reconciliations + Reports + Approvals + Insights**

---

## Supporting Metrics (Inputs)

| Metric                       | Definition                             | Target         |
| ---------------------------- | -------------------------------------- | -------------- |
| Weekly Active Entities (WAE) | Entities with ≥1 AI interaction/week   | Growth         |
| AI Confidence Score          | Avg confidence across all interactions | > 0.85         |
| Human Approval Rate          | % of AI recommendations approved       | > 90%          |
| Time Saved per Entity        | Hours saved vs manual process          | > 10 hrs/month |
| Feature Adoption             | % of entities using 3+ agent types     | > 60%          |

---

## Tracking

```typescript
// Example PostHog event
track("ai_interaction", {
  agent_type: "auto_categorize",
  entity_id: entityId,
  confidence: 0.92,
  was_approved: true,
  time_saved_seconds: 45,
});
```

---

## Review Cadence

- **Weekly**: WAAI trend, component breakdown
- **Monthly**: WAE, confidence scores, approval rate
- **Quarterly**: Time saved, feature adoption, revenue correlation

---

_Last updated: August 2026_
