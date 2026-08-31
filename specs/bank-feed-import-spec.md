# Feature Spec: Bank Feed Import

## Goal
Allow users to import bank transactions via CSV/PDF upload with AI-powered categorization.

## Why This Matters
- Core value proposition — users can't enter transactions manually forever
- Bank reconciliation is the #1 daily task
- AI categorization saves hours of manual work

## What We Must Build

### Import Methods
- CSV upload (most common)
- PDF upload (bank statements)
- Manual entry (for small businesses)

### AI Categorization
- Auto-categorize transactions based on description
- Learn from user corrections
- Suggest categories with confidence scores

### Import Flow
1. User uploads CSV/PDF
2. AI parses and categorizes transactions
3. User reviews and approves
4. Transactions posted to ledger

## Acceptance Criteria
- [ ] CSV upload with drag-and-drop
- [ ] PDF upload with OCR
- [ ] AI categorization with confidence scores
- [ ] User review before posting
- [ ] Learning from corrections
- [ ] Entity scoping verified
- [ ] Error handling for malformed files
