# Retention Tracking

> Measuring and improving user retention across the Xenboox lifecycle.

---

## Retention Curves

### Definition

The percentage of users who return to the product after N days since signup.

### Targets

| Cohort              | Day 1 | Day 7 | Day 30 | Day 90 |
| ------------------- | ----- | ----- | ------ | ------ |
| Target              | 80%   | 50%   | 40%    | 30%    |
| Industry avg (SaaS) | 70%   | 40%   | 25%    | 15%    |
| Current             | —     | —     | —      | —      |

### How to Read

- **Steep drop in D1-D7:** Onboarding problem
- **Drop in D7-D30:** Value realization problem
- **Drop in D30-D90:** Engagement/feature depth problem

---

## Retention by Plan

| Plan     | D30 Target | D90 Target | Strategy                        |
| -------- | ---------- | ---------- | ------------------------------- |
| Free     | 30%        | 20%        | Drive activation → upgrade      |
| Starter  | 50%        | 40%        | Drive feature adoption → expand |
| Business | 60%        | 50%        | Drive multi-entity → enterprise |

---

## Retention by Feature Usage

| Feature Used         | D30 Retention | Insight                       |
| -------------------- | ------------- | ----------------------------- |
| Bank connection      | +20%          | Data integration = stickiness |
| 3+ AI agents         | +25%          | Multi-agent = deeper value    |
| Reports generated    | +15%          | Reporting = decision-making   |
| Team members invited | +30%          | Collaboration = lock-in       |
| None of above        | < 15%         | At-risk segment               |

---

## Churn Prevention

### Early Warning Signals

| Signal                             | Action                   |
| ---------------------------------- | ------------------------ |
| No login in 7 days                 | Send re-engagement email |
| No AI interaction in 14 days       | Trigger in-app nudge     |
| Support ticket unresolved > 3 days | Escalate to success team |
| Usage drop > 50%                   | Personal outreach        |

### Win-Back Campaign

| Timing            | Channel  | Message                               |
| ----------------- | -------- | ------------------------------------- |
| Day 1 after churn | Email    | "We miss you — here's what's new"     |
| Day 7             | Email    | "Your data is safe — come back"       |
| Day 30            | Email    | "Special offer: 50% off for 3 months" |
| Day 90            | LinkedIn | Personal outreach from founder        |

---

## Tracking Implementation

```typescript
// PostHog retention
posthog.retention({
  period: "day",
  events: [
    { name: "signup_completed", label: "Signup" },
    { name: "feature_used", label: "Feature Use" },
    { name: "ai_interaction_completed", label: "AI Interaction" },
  ],
});

// Custom retention query
SELECT
  DATE_TRUNC('week', created_at) AS cohort,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN last_active_at > created_at + INTERVAL '1 day' THEN user_id END) AS d1,
  COUNT(DISTINCT CASE WHEN last_active_at > created_at + INTERVAL '7 days' THEN user_id END) AS d7,
  COUNT(DISTINCT CASE WHEN last_active_at > created_at + INTERVAL '30 days' THEN user_id END) AS d30
FROM users
GROUP BY 1;
```

---

_Last updated: August 2026_
