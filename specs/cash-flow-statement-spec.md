# Feature Spec: Cash Flow Statement

## Goal
Implement SYSCOHADA-compliant Cash Flow Statement using the indirect method.

## Why This Matters
- SYSCOHADA requires Cash Flow Statement for all companies
- IFRS requires it (IAS 7)
- Users need to understand cash movements
- Regulatory compliance for 17 OHADA countries

## Cash Flow Statement Structure

### Operating Activities (Indirect Method)
- Net Income
- Adjustments for non-cash items (depreciation, amortization)
- Changes in working capital (AR, AP, inventory)
- Cash from operations

### Investing Activities
- Purchase of fixed assets
- Sale of fixed assets
- Investments
- Cash from investing

### Financing Activities
- Borrowings
- Repayments
- Equity injections
- Dividends
- Cash from financing

### Net Change in Cash
- Opening cash balance
- Net change
- Closing cash balance

## What We Must Build

### Data Source
- Journal entries with account classifications
- Prior period balances for comparison
- Cash and bank account balances

### Generation Logic
- Indirect method from net income
- Adjust for non-cash items
- Calculate working capital changes
- Classify investing/financing activities

### UI Component
- Cash Flow Statement table
- Period selector
- Export to PDF/Excel
- AI narrative explanation

## Acceptance Criteria
- [ ] Cash Flow Statement generated from journal entries
- [ ] Operating, Investing, Financing sections correct
- [ ] Net change matches actual cash movement
- [ ] Period selector works
- [ ] Export functionality
- [ ] AI narrative explains cash movements
- [ ] SYSCOHADA-compliant format
- [ ] Entity scoping verified
