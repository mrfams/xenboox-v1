# Activation Funnel

> Tracking the user journey from signup to value realization.

---

## Funnel Stages

```
Visitor → Signup → Onboarding → Bank Connected → First AI Interaction → First Report → Paid
```

### Stage Definitions

| Stage                      | Definition                    | Target Conversion           |
| -------------------------- | ----------------------------- | --------------------------- |
| **Visitor**                | Lands on website              | —                           |
| **Signup**                 | Creates account               | 5% of visitors              |
| **Onboarding Complete**    | Finishes wizard               | 70% of signups              |
| **Bank Connected**         | Links bank account            | 50% of onboarding complete  |
| **First AI Interaction**   | Approves/uses AI suggestion   | 80% of bank connected       |
| **First Report Generated** | Runs P&L, Balance Sheet, etc. | 60% of first AI interaction |
| **Paid**                   | Upgrades from free tier       | 20% of first report         |

---

## Key Metrics per Stage

### Signup

- **Source breakdown:** Organic, LinkedIn, partner referral, paid
- **Time to signup:** < 2 minutes from landing page
- **Drop-off points:** Pricing page, registration form

### Onboarding

- **Steps completed:** Welcome → CoA → Bank → Team → AI Preferences
- **Time to complete:** < 3 minutes target
- **Skip rate:** < 30%
- **Drop-off points:** Bank connection (friction), team invite (confusion)

### Activation (Bank Connected → First AI Interaction)

- **Time to first value:** < 24 hours
- **AI confidence score:** > 0.8 average
- **Approval rate:** > 90%
- **Drop-off points:** Low confidence, irrelevant suggestions

### Monetization (First Report → Paid)

- **Time to upgrade:** < 14 days
- **Trigger:** Usage limits, feature needs, team growth
- **Drop-off points:** Price sensitivity, missing features

---

## Tracking Implementation

```typescript
// PostHog funnel
posthog.capture("funnel_step", {
  step: "onboarding_complete",
  entityId: "abc",
  duration_seconds: 145,
  steps_completed: 5,
  skipped_steps: 0,
});

// PostHog funnel analysis
posthog.analyzeFunnel({
  steps: [
    "signup_completed",
    "onboarding_completed",
    "bank_connection_completed",
    "ai_interaction_completed",
    "report_generated",
    "subscription_created",
  ],
  period: "month",
});
```

---

## Optimization Priorities

| Priority | Stage                | Current | Target | Action                       |
| -------- | -------------------- | ------- | ------ | ---------------------------- |
| 1        | Bank Connected       | —       | 50%    | Simplify connection flow     |
| 2        | First AI Interaction | —       | 80%    | Improve suggestion relevance |
| 3        | Paid Conversion      | —       | 20%    | Optimize upgrade prompts     |
| 4        | Onboarding Complete  | —       | 70%    | Reduce steps, add progress   |

---

## Cohort Analysis

Track activation by cohort to measure improvement:

| Cohort  | Signup → Onboarding | Onboarding → Bank | Bank → AI | AI → Report | Report → Paid |
| ------- | ------------------- | ----------------- | --------- | ----------- | ------------- |
| Month 1 |                     |                   |           |             |               |
| Month 2 |                     |                   |           |             |               |
| Month 3 |                     |                   |           |             |               |

---

_Last updated: August 2026_
