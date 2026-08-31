# Feature Spec: Bank Auto-Matching

## Goal
Automatically match bank transactions to invoices and bills using fuzzy matching.

## Why This Matters
- Bank reconciliation is the #1 daily task
- Manual matching is time-consuming
- Auto-matching saves hours of work

## What We Must Build

### Matching Algorithm
- Fuzzy matching on amount, date, reference
- Confidence scoring for each match
- Auto-match above 90% confidence
- Flag uncertain matches for human review

### Match Types
- Invoice payment → Invoice
- Vendor payment → Bill
- Bank transfer → Journal entry
- Mobile money → Transaction

### Learning Loop
- Learn from user corrections
- Improve matching over time
- Remember preferred matches

## Acceptance Criteria
- [ ] Fuzzy matching algorithm
- [ ] Confidence scoring
- [ ] Auto-match above 90%
- [ ] Flag uncertain matches
- [ ] Learning from corrections
- [ ] Entity scoping verified
