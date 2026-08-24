# Integrations Roadmap

> Priority integrations for Xenboox expansion.

---

## Priority 1: Financial (Immediate)

| Integration | Purpose             | Effort | Status  |
| ----------- | ------------------- | ------ | ------- |
| Plaid       | Bank feeds (US)     | Medium | ✅ Live |
| Mono        | Bank feeds (Africa) | Medium | ✅ Live |
| Stripe      | Payment processing  | Low    | Planned |
| Flutterwave | Payments (Africa)   | Low    | Planned |

## Priority 2: Productivity (Month 3-6)

| Integration      | Purpose           | Effort | Status  |
| ---------------- | ----------------- | ------ | ------- |
| Google Workspace | Calendar, Drive   | Low    | Planned |
| Microsoft 365    | Outlook, OneDrive | Low    | Planned |
| Slack            | Notifications     | Low    | Planned |
| WhatsApp         | Notifications     | Medium | Planned |

## Priority 3: Business (Month 6-12)

| Integration | Purpose         | Effort | Status  |
| ----------- | --------------- | ------ | ------- |
| Shopify     | E-commerce data | Medium | Planned |
| WooCommerce | E-commerce data | Medium | Planned |
| HubSpot     | CRM sync        | Low    | Planned |
| Mailchimp   | Email marketing | Low    | Planned |

---

## Integration Architecture

```
Xenboox Core
  ├── Webhook receiver (inbound events)
  ├── API client (outbound calls)
  ├── Sync engine (data reconciliation)
  └── Queue manager (retry logic)
```

---

_Last updated: August 2026_
