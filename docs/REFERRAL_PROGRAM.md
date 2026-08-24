# Referral Program

> Incentivizing existing users to bring new customers to Xenboox.

---

## Program Structure

### Referrer Rewards

| Referral Count | Reward                           |
| -------------- | -------------------------------- |
| 1st referral   | 1 month free on current plan     |
| 3rd referral   | 3 months free                    |
| 5th referral   | 6 months free                    |
| 10th referral  | 1 year free + "Ambassador" badge |

### Referee Rewards

| Reward        | Details                                   |
| ------------- | ----------------------------------------- |
| Sign up       | 14-day extended trial (vs 7-day standard) |
| First payment | 25% off first month                       |
| Annual plan   | Additional 10% off annual pricing         |

---

## How It Works

1. **Referrer shares** their unique referral link (from Settings → Referrals)
2. **Referee signs up** using the link
3. **Referee completes** onboarding (bank connection)
4. **Both get rewarded** — referrer gets credit, referee gets extended trial

---

## Tracking

```typescript
// Referral event
track("referral_completed", {
  referrerUserId: "abc",
  refereeUserId: "def",
  referralCode: "FATOU-C3E5",
  source: "email", // email, linkedin, direct
});
```

### PostHog Properties

- `referral_count`: Total referrals by user
- `referral_conversions`: Referrals that converted to paid
- `referral_revenue`: Revenue from referred users

---

## Anti-Fraud

| Rule                    | Enforcement                    |
| ----------------------- | ------------------------------ |
| Self-referral blocked   | Same email domain              |
| Minimum trial period    | Referee must be active 14 days |
| Maximum referrals/month | 10 per user                    |
| Fake accounts           | Email verification required    |

---

## Marketing the Program

### In-Product

- Referral link in Settings → Referrals
- "Refer a friend" prompt after positive NPS score (9-10)
- Badge on dashboard: "You've referred 3 friends!"

### Email

- Post-onboarding: "Love Xenboox? Share it with a friend"
- Monthly: "Your referral status" update
- Milestone: "You've earned 3 months free!"

### Content

- Blog post: "How referral programs work"
- Social proof: "100+ businesses referred Xenboox this month"

---

## Success Metrics

| Metric                     | Target                        | Measurement      |
| -------------------------- | ----------------------------- | ---------------- |
| Referral rate              | 15% of users refer at least 1 | Monthly          |
| Referral conversion        | 30% of referred users upgrade | Monthly          |
| Revenue from referrals     | 20% of new MRR                | Monthly          |
| Referral program awareness | 50% of users know about it    | Quarterly survey |

---

_Last updated: August 2026_
