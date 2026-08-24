# User Segmentation

> How Xenboox segments users for targeted marketing, product decisions, and support.

---

## Segmentation Dimensions

### 1. By Company Size

| Segment    | Employees | Revenue      | Plan              |
| ---------- | --------- | ------------ | ----------------- |
| Solo       | 1-5       | < GMD 5M     | Free / Starter    |
| Small      | 5-20      | GMD 5M-50M   | Starter           |
| Medium     | 20-100    | GMD 50M-200M | Business          |
| Enterprise | 100+      | GMD 200M+    | Business (custom) |

### 2. By Industry

| Segment               | Characteristics             | Priority |
| --------------------- | --------------------------- | -------- |
| Trading/Import-Export | Multi-currency, high volume | High     |
| Professional Services | Invoicing, time tracking    | High     |
| FMCG/Distribution     | Inventory, recurring bills  | Medium   |
| Healthcare            | Payroll, compliance         | Medium   |
| Agriculture           | Seasonal, mobile money      | Medium   |
| NGO/Donor-funded      | Reporting, budget tracking  | Medium   |

### 3. By Usage Level

| Segment       | Definition              | Action                      |
| ------------- | ----------------------- | --------------------------- |
| Power Users   | 3+ agents, daily active | Upsell, case study          |
| Regular Users | 2 agents, weekly active | Nurture, feature highlights |
| Light Users   | 1 agent, monthly active | Re-engagement               |
| Dormant       | No login in 30 days     | Win-back campaign           |
| Churned       | Cancelled subscription  | Feedback survey             |

### 4. By Geography

| Segment       | Location     | Characteristics                  |
| ------------- | ------------ | -------------------------------- |
| Banjul        | Capital      | Most businesses, highest density |
| Serrekunda    | Largest city | FMCG, retail                     |
| Brikama       | West Coast   | Agriculture, manufacturing       |
| Other regions | Rural        | Mobile money heavy               |

---

## Segment-Based Actions

### Marketing

| Segment          | Channel           | Message                                  |
| ---------------- | ----------------- | ---------------------------------------- |
| Solo founders    | LinkedIn, content | "AI accounting without the accountant"   |
| CFOs             | LinkedIn, events  | "Close your books in 4 days"             |
| Accounting firms | Direct, partners  | "Manage 40+ entities from one dashboard" |
| NGOs             | Donor networks    | "Automate donor reporting"               |

### Product

| Segment              | Feature Priority             |
| -------------------- | ---------------------------- |
| Multi-currency users | Exchange rate automation     |
| Payroll-heavy        | Statutory compliance         |
| Donor-funded         | Budget vs actual reporting   |
| High-volume          | Batch operations, API access |

### Support

| Segment    | SLA               |
| ---------- | ----------------- |
| Enterprise | 4-hour response   |
| Business   | 1-day response    |
| Starter    | 2-day response    |
| Free       | Community support |

---

## Tracking

```typescript
// PostHog user properties
posthog.setPersonProperties({
  company_size: "small",
  industry: "trading",
  geography: "banjul",
  usage_level: "regular",
  plan: "starter",
  entities_count: 3,
  agents_used: ["cfo", "payroll", "compliance"],
});
```

---

_Last updated: August 2026_
