# A/B Testing Strategy

> Systematic experimentation to improve conversion and engagement.

---

## Tool: PostHog Experiments

PostHog provides built-in A/B testing with statistical significance calculations.

---

## Priority Experiments

### High Impact

| Experiment           | Hypothesis                      | Metric          | Duration |
| -------------------- | ------------------------------- | --------------- | -------- |
| Pricing page CTA     | "Start Free" > "Get Started"    | Signup rate     | 2 weeks  |
| Onboarding length    | 3 steps > 5 steps               | Completion rate | 2 weeks  |
| Bank connection flow | Simpler flow → more connections | Connection rate | 2 weeks  |

### Medium Impact

| Experiment          | Hypothesis               | Metric       | Duration |
| ------------------- | ------------------------ | ------------ | -------- |
| Free tier limits    | 100 entries > 50 entries | Upgrade rate | 4 weeks  |
| Email subject lines | Question > Statement     | Open rate    | 1 week   |
| Landing page hero   | Video > Image            | Signup rate  | 2 weeks  |

---

## Experiment Template

```typescript
// PostHog experiment
posthog.experiment({
  name: "pricing-cta-text",
  variants: ["start-free", "get-started"],
  metric: "signup_completed",
  minimum_sample_size: 1000,
  duration_days: 14,
});
```

---

## Results Tracking

| Experiment | Variant A | Variant B | Winner | Confidence |
| ---------- | --------- | --------- | ------ | ---------- |
| —          | —         | —         | —      | —          |

---

_Last updated: August 2026_
