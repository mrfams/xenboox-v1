# Session Recording Strategy

> How Xenboox uses session recording for UX improvement.

---

## Tool: PostHog Session Recording

PostHog provides free session recording with heatmaps and rage click detection.

---

## What to Record

### Always Record

- Pricing page sessions
- Onboarding flow sessions
- Checkout/payment sessions
- Error pages

### Never Record

- Settings pages with sensitive data
- API key pages
- Password entry
- Financial data entry (amounts, account numbers)

---

## Privacy Rules

| Rule                  | Implementation            |
| --------------------- | ------------------------- |
| Mask sensitive fields | CSS class `ph-no-capture` |
| Opt-out for EU users  | Respect cookie consent    |
| Retention             | 30 days maximum           |
| Access                | Product team only         |

---

## Analysis Cadence

| Frequency | Focus                            |
| --------- | -------------------------------- |
| Weekly    | Rage clicks, dead clicks, errors |
| Monthly   | Onboarding drop-off analysis     |
| Quarterly | Full UX audit with recordings    |

---

_Last updated: August 2026_
