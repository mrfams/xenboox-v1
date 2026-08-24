# Retention Email Templates

> Post-onboarding email sequence to keep users engaged and drive activation.

---

## Email 1: Welcome (Day 0)

**Subject:** Welcome to Xenboox — your AI accounting team is ready

**Body:**
Hi {{firstName}},

Welcome to Xenboox. Your 19 AI agents are ready to work.

**Next step:** Connect your bank account to see the AI categorize your first transactions.

{{cta: Connect Bank Account}}

Questions? Reply to this email — a real human reads every response.

— The Xenboox Team

---

## Email 2: First Value (Day 2)

**Subject:** Did you see what the AI did with your transactions?

**Body:**
Hi {{firstName}},

The AI has categorized {{transactionCount}} transactions since you connected your bank. Here's a preview:

{{aiInsightSummary}}

**See the full breakdown:** {{cta: View Dashboard}}

— The Xenboox Team

---

## Email 3: Feature Highlight (Day 5)

**Subject:** You're only using 1 of 19 agents

**Body:**
Hi {{firstName}},

You've been using the CFO Agent. But you have 18 more agents ready to help:

- **Payroll Agent** — Process payslips with confidence scores
- **Compliance Agent** — Never miss a filing deadline
- **Treasury Agent** — Real-time cash flow forecasting

{{cta: Explore All Agents}}

— The Xenboox Team

---

## Email 4: Social Proof (Day 10)

**Subject:** How Seagull Logistics cut month-end close from 3 weeks to 4 days

**Body:**
Hi {{firstName}},

Fatoumata Ceesay, CFO of Seagull Logistics, had the same challenge you do — month-end close took too long.

With Xenboox, she closed her first month in 4 days. The close checklist alone was worth the subscription.

{{cta: See How It Works}}

— The Xenboox Team

---

## Email 5: Upgrade Prompt (Day 14)

**Subject:** You've used {{usagePercent}}% of your free tier this month

**Body:**
Hi {{firstName}},

You're getting a lot of value from Xenboox. Your free tier includes:

- 1 entity
- 50 journal entries/month
- Basic reports

**Upgrade to Starter ($29/mo)** for unlimited entries, all 19 agents, and full AP/AR.

{{cta: Upgrade to Starter}}

No credit card required to stay on free. Cancel anytime.

— The Xenboox Team

---

## Email 6: Re-engagement (Day 30, inactive users)

**Subject:** We noticed you haven't been around

**Body:**
Hi {{firstName}},

It's been a while since you logged into Xenboox. Everything is waiting for you:

- {{pendingInvoices}} invoices pending
- {{uncategorizedTransactions}} transactions to categorize
- Month-end close is {{daysUntilClose}} days away

{{cta: Pick Up Where You Left Off}}

If you have feedback on what's not working, reply to this email. We read every response.

— The Xenboox Team

---

## Sending Rules

| Email             | Trigger          | Delay     | Skip If                |
| ----------------- | ---------------- | --------- | ---------------------- |
| Welcome           | Signup           | Immediate | Never                  |
| First Value       | Bank connected   | Day 2     | No bank connected      |
| Feature Highlight | Day 5            | Day 5     | Already used 3+ agents |
| Social Proof      | Day 10           | Day 10    | Already on paid plan   |
| Upgrade Prompt    | Day 14           | Day 14    | Already on paid plan   |
| Re-engagement     | 30 days inactive | Day 30    | Active in last 7 days  |

---

_Last updated: August 2026_
