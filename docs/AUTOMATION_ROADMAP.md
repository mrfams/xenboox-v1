# Automation Roadmap

> Future automation features for Xenboox.

---

## Phase 1: OCR (Month 3-6)

### Receipt/Invoice OCR

- Upload receipt photo → extract data automatically
- Match to existing transactions
- Categorize based on merchant/description

### Implementation

- Use Claude Vision API for image processing
- Extract: vendor, date, amount, items, tax
- Match to bank transactions by amount + date

---

## Phase 2: Communication (Month 6-9)

### WhatsApp Integration

- Send invoice notifications via WhatsApp
- Receive payment confirmations
- Automated follow-ups for overdue invoices

### Slack Integration

- Daily financial summary to Slack channel
- Alert on unusual transactions
- Approval notifications

---

## Phase 3: Scheduling (Month 9-12)

### Calendar Sync

- Sync tax deadlines to Google Calendar
- Sync payment due dates
- Sync payroll schedule

---

## Priority Matrix

| Feature                | Impact | Effort | Priority |
| ---------------------- | ------ | ------ | -------- |
| Receipt OCR            | High   | Medium | P1       |
| WhatsApp notifications | High   | Medium | P1       |
| Slack notifications    | Medium | Low    | P2       |
| Calendar sync          | Low    | Low    | P3       |

---

_Last updated: August 2026_
