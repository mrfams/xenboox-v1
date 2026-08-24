# CRM Setup

> Customer relationship management for Xenboox sales and support.

---

## Recommended: HubSpot Free Tier

### Why HubSpot Free

- Free for up to 1,000,000 contacts
- Email tracking and notifications
- Meeting scheduling
- Forms and live chat
- Basic reporting

### Setup Steps

1. Create account at hubspot.com
2. Connect domain for email tracking
3. Import existing contacts (if any)
4. Set up deal pipeline:
   - Lead → Qualified → Demo → Proposal → Closed Won/Lost

---

## Deal Pipeline

| Stage       | Definition             | Conversion Target |
| ----------- | ---------------------- | ----------------- |
| Lead        | New inquiry or sign-up | 30% → Qualified   |
| Qualified   | Meets ICP criteria     | 50% → Demo        |
| Demo        | Product demonstration  | 60% → Proposal    |
| Proposal    | Pricing sent           | 70% → Closed Won  |
| Closed Won  | Customer               | —                 |
| Closed Lost | Lost prospect          | —                 |

---

## Contact Properties

| Property     | Type     | Purpose                  |
| ------------ | -------- | ------------------------ |
| Company Size | Dropdown | Segment by ICP           |
| Industry     | Dropdown | Segment by vertical      |
| Current Tool | Text     | Competitive intelligence |
| Budget       | Number   | Qualify leads            |
| Timeline     | Dropdown | Urgency assessment       |

---

## Automation Rules

| Trigger            | Action                |
| ------------------ | --------------------- |
| New sign-up        | Create contact + deal |
| Deal stage change  | Send notification     |
| No activity 7 days | Reminder email        |
| Deal closed won    | Send onboarding email |

---

## Integration with Xenboox

- Sync PostHog events to HubSpot
- Track activation funnel in HubSpot
- Use HubSpot forms for lead capture
- Connect HubSpot chat widget to support

---

_Last updated: August 2026_
