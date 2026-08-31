# Feature Spec: Accruals Automation

## Goal
Automatically detect and record accruals for unbilled expenses and deferred revenue.

## Why This Matters
- Month-end close requires accruals
- Manual accruals are error-prone
- Accruals are essential for accurate financial statements

## What We Must Build

### Accrual Detection
- Rule-based detection of recurring expenses
- AI-powered detection of unusual patterns
- Threshold-based alerts

### Accrual Recording
- Auto-generate accrual journal entries
- Reverse accruals in next period
- Audit trail for all accruals

### Accrual Types
- Unbilled expenses (received but not invoiced)
- Deferred revenue (invoiced but not earned)
- Prepaid expenses (paid in advance)
- Accrued liabilities (owed but not paid)

## Acceptance Criteria
- [ ] Accrual detection rules configured
- [ ] Auto-generate accrual entries
- [ ] Reverse accruals in next period
- [ ] Audit trail for all accruals
- [ ] Manual override available
- [ ] Entity scoping verified
