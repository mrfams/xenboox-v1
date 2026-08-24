# Resend Email Retry Queue

> Handling failed email sends with automatic retry logic.

---

## Current Setup

Resend is used for transactional emails (onboarding, notifications, reports).

### Configuration

```typescript
// lib/email/resend.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
```

---

## Retry Strategy

### Failed Email Types

| Type                                 | Retry Count | Delay            | Max Age |
| ------------------------------------ | ----------- | ---------------- | ------- |
| Transactional (onboarding, receipts) | 3           | 5min, 30min, 2hr | 24hr    |
| Marketing (newsletters)              | 1           | 1hr              | 6hr     |
| System (alerts, reports)             | 2           | 10min, 1hr       | 12hr    |

### Implementation

```typescript
async function sendWithRetry(email: EmailOptions, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(email);
      return { success: true };
    } catch (error) {
      if (attempt === maxRetries) {
        // Log failed email for manual review
        await logFailedEmail(email, error);
        return { success: false, error };
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 5 * 60 * 1000);
    }
  }
}
```

---

## Monitoring

| Metric             | Alert Threshold | Action                      |
| ------------------ | --------------- | --------------------------- |
| Failed emails/hour | > 5             | Check Resend status         |
| Retry queue depth  | > 50            | Investigate delivery issues |
| Bounce rate        | > 2%            | Clean email list            |

---

_Last updated: August 2026_
