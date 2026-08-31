# Feature Spec: Onboarding Wizard Fix

## Goal
Replace the broken onboarding with a 3-step guided setup that gets users to their first invoice in under 5 minutes.

## User Problem
**User:** New SME owner who just signed up
**Context:** Landed on empty dashboard, confused about what to do
**Pain:** No guidance, no structure, no "aha moment"
**Impact:** Users leave immediately — activation rate unknown but likely <20%
**Current solution:** Broken/missing onboarding wizard

## 3-Step Onboarding Framework

### Step 1: Business Setup (30 seconds)
- Business name
- Industry (dropdown: Trading, Services, Retail, Manufacturing, Other)
- Currency (dropdown: GMD, USD, NGN, KES, GHS)
- Tax ID (optional)

### Step 2: AI Generates Chart of Accounts (10 seconds)
- AI generates industry-specific chart of accounts
- User sees preview: "Here's your accounting structure"
- User can customize or accept defaults

### Step 3: Create First Invoice (2 minutes)
- Pre-filled customer name (from industry defaults)
- Pre-filled line items (from industry defaults)
- User clicks "Create" → Invoice created
- AI narrative appears: "Your first invoice for $X to [Customer]"

## What We Must Build

### Onboarding Page
- `/onboarding` route with 3-step wizard
- Progress indicator (Step 1 of 3)
- Back/Next buttons
- Skip option (but tracked)

### Step Components
- `BusinessSetupStep` — Business info form
- `ChartOfAccountsStep` — AI-generated COA preview
- `FirstInvoiceStep` — Pre-filled invoice creation

### Onboarding Guard
- Check if user has completed onboarding
- Redirect to `/onboarding` if not
- Mark as complete after Step 3

## Acceptance Criteria
- [ ] 3-step wizard with progress indicator
- [ ] Business info form with validation
- [ ] AI generates chart of accounts
- [ ] Pre-filled invoice creation
- [ ] Onboarding guard redirects new users
- [ ] Completion tracked in analytics
- [ ] Skip option available
- [ ] Mobile responsive

## Success Metrics
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Onboarding completion | Unknown | >70% | Users who complete all 3 steps |
| Time to first invoice | Unknown | <5 min | Time from signup to create_invoice |
| Activation rate | Unknown | >60% | Users who reach 100% within 7 days |
