# Feature Spec: Tax Filing Integration

## Goal
Integrate with Gambia GRA for VAT and PAYE return filing.

## Why This Matters
- Legal compliance — must file VAT returns monthly by 15th
- GRA approved e-invoicing in Aug 2026
- Users need to file from the platform

## What We Must Build

### VAT Return Generation
- Auto-calculate VAT from transactions
- Generate VAT return form
- Submit to GRA API

### PAYE Return Generation
- Auto-calculate PAYE from payroll
- Generate PAYE return form
- Submit to GRA API

### Compliance Calendar
- Track filing deadlines
- Send reminders
- Alert on overdue filings

## Acceptance Criteria
- [ ] VAT return auto-generated
- [ ] PAYE return auto-generated
- [ ] GRA API integration
- [ ] Compliance calendar with reminders
- [ ] Filing status tracking
- [ ] Entity scoping verified
