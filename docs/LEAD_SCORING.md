# Lead Scoring

> Qualifying leads based on fit and engagement.

---

## Scoring Model

### Fit Score (0-50 points)

| Criteria                               | Points |
| -------------------------------------- | ------ |
| Company size 10-100 employees          | +15    |
| Industry: trading, logistics, services | +10    |
| Location: Banjul, Serrekunda           | +10    |
| Revenue GMD 5M-200M                    | +10    |
| Uses QuickBooks/Xero currently         | +5     |

### Engagement Score (0-50 points)

| Action                 | Points |
| ---------------------- | ------ |
| Visited pricing page   | +10    |
| Started signup         | +15    |
| Completed onboarding   | +10    |
| Connected bank account | +10    |
| Used 2+ AI agents      | +5     |

---

## Lead Grades

| Grade    | Score  | Action                 |
| -------- | ------ | ---------------------- |
| A (Hot)  | 80-100 | Sales call within 24h  |
| B (Warm) | 50-79  | Email nurture sequence |
| C (Cool) | 20-49  | Monthly newsletter     |
| D (Cold) | 0-19   | Re-engagement campaign |

---

## Implementation

```typescript
// PostHog person properties
posthog.setPersonProperties({
  fit_score: 35,
  engagement_score: 25,
  lead_grade: "B",
});
```

---

_Last updated: August 2026_
