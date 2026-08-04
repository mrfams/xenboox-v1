# XENBOOX — FOCUSED MVP ROADMAP

> **Goal:** First 20 paying customers (SMEs, NGOs, accounting firms)
> **Constraint:** Ship 4 core agents — defer the other 15
> **Horizon:** 90 days to first paying customer

---

## The Strategic Bet

Xenboox has 19 agents across 3 tiers. This is the right architecture for the **mature product**, but for the MVP it is the wrong priority. The gap between "all 19 agents built" and "first customer delighted" is not more agents — it is:

1. An end-to-end accounting flow that a real business can use
2. Market fit (mobile money, local tax, local bank integrations)
3. A feedback loop with actual users

**This roadmap defers 15 agents and focuses everything on the 4 that matter for a complete accounting loop:**

---

## Phase 1: Core Accounting Loop (Weeks 1-4)

### The 4 Agents to Ship

```
                    ┌──────────────────┐
                    │  CONTROLLER      │  Tier 2 (management)
                    │  (oversees all)  │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                   │
          ▼                  ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│     LEDGER       │ │   AP / AR        │ │  RECONCILIATION  │  Tier 3 (worker)
│  (post entries,  │ │  (invoices,      │ │  (bank matching, │
│   trial balance) │ │   payments)      │ │   close period)  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### What Each Agent Must Do for MVP

#### 1. Ledger Agent (exists at `packages/agents/tier3/ledger-agent/`)

**Current state:** ✅ Full implementation with graph, nodes, tools, prompts
**MVP requirements:**

- [ ] Verifiable: can post a journal entry, run trial balance, audit trail logged
- [ ] Tested with 5 real-world scenarios (opening balances, revenue, expense, AP settlement, AR collection)
- [x] Double-entry validation (debits = credits) at DB level (already done)
- [x] Confidence scoring
- [x] Escalation when confidence < 0.70
- **Gap:** Customer-facing documentation on what it does

#### 2. AP Agent (exists at `packages/agents/tier3/ap-agent/`)

**Current state:** ✅ Full implementation
**MVP requirements:**

- [ ] Verifiable: can ingest an invoice, match to PO, schedule payment
- [ ] Tested with a real supplier workflow (create → approve → pay → reconcile)
- [x] Audio trail on all actions

#### 3. AR Agent (exists at `packages/agents/tier3/ar-agent/`)

**Current state:** ✅ Full implementation
**MVP requirements:**

- [ ] Verifiable: can create invoice, record payment, send reminders
- [ ] Tested with a real customer workflow (invoice → send → receive payment → reconcile)
- [ ] Works with overdue escalation

#### 4. Reconciliation Agent (exists at `packages/agents/tier3/reconciliation-agent/`)

**Current state:** ✅ Full implementation
**MVP requirements:**

- [ ] Verifiable: can match bank transactions to ledger entries, flag unmatched
- [ ] Works with all 3 bank data sources (Plaid → real bank, manual upload, mobile money)
- [ ] Close-period flow: reconcile → flag → approve → close

### Controller Agent (Tier 2 — Oversight)

**Current state:** ✅ Full implementation at `packages/agents/tier2/controller-agent/`
**MVP requirements:**

- [ ] Verifiable: can review worker outputs, aggregate confidence, escalate to CFO
- [ ] Close checklist: run → verify sub-ledgers → confirm to CFO Agent → close period

---

## Phase 2: Market Fit (Weeks 5-8)

### Critical Gaps (from codebase audit)

| Gap                         | Current State                                         | MVP Action                                                                                                    |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Mobile Money**            | Schema exists (`mobile-money.ts`). Agent exists.      | **Validate** with 1 real provider (MTN MoMo or Orange Money). Test with real statement data.                  |
| **Local Tax Jurisdictions** | Schema exists (`jurisdiction.ts`). No specific rules. | Ship with Nigeria (VAT 7.5%, PAYE, WHT) + Ghana (VAT 15%, NHIL, GETFUND). Hardcode first, parameterize later. |
| **Local Bank Integrations** | Plaid integration exists. No Mono/Okra/OnePipe.       | Integrate with **Mono** (Nigeria) and **one simple bank CSV upload** flow. Mono covers 15+ Nigerian banks.    |
| **Multi-Currency**          | Schema supports it.                                   | Ship with NGN + GHS + XOF. Use hardcoded rates first (crawled daily via ECB + CBN).                           |
| **Entity Structure**        | Works: org → entity → user_entity_access              | SME-friendly: single entity auto-created on signup. No multi-entity complexity in MVP.                        |
| **Onboarding Wizard**       | UI exists (`/app/(auth)/register/onboarding/`).       | Trim to 3 steps: (1) Create org, (2) Connect bank/MoMo, (3) First look.                                       |

### Integration Priorities (by customer impact)

1. **Mono API** (bank statements — covers 15+ Nigerian banks) — Week 5
2. **Manual CSV/PDF upload** (generic bank statement import) — Week 5
3. **MTN MoMo** (most-used mobile money in Ghana, Nigeria, Côte d'Ivoire) — Week 6
4. **Nigeria tax rules** (VAT 7.5%, PAYE, WHT, CIT) — Week 6
5. **Ghana tax rules** (VAT 15%, NHIL 2.5%, GETFUND 2.5%, PAYE) — Week 7
6. **Email-to-inbox invoice ingestion** (forwards invoices → documents → AP agent) — Week 7

---

## Phase 3: First 20 Customers (Weeks 8-12)

### Target Segments (ranked by ease of conversion)

| Segment                                | Pain Point                                | Entry                            | Price (monthly) |
| -------------------------------------- | ----------------------------------------- | -------------------------------- | --------------- |
| **Nigerian SME (5-20 employees)**      | Spreadsheets too slow, Sage too expensive | Mono-connected bank + MoMo       | $49-99          |
| **Ghanaian SME (5-20 employees)**      | Same                                      | CSV upload + MoMo                | $49-99          |
| **Accounting firm (2-10 accountants)** | Multiple client books                     | Entity switcher + firm dashboard | $199-499        |
| **NGO/Donor-funded org**               | Donor reporting requirements              | Multi-entity + project tracking  | $99-199         |

### Customer Acquisition Flow

```
1. Founders identify 10 target SMEs through personal network
2. Offer free 90-day pilot + onboarding support
3. Weekly check-ins during pilot (what works, what breaks)
4. Convert pilot → paid at day 60 (not day 90 — urgency)
5. Use case studies from pilots to acquire next 10
```

### Must-Have Features for First Customer

- [ ] **Can post a journal entry** — manual or via agent → shows up in trial balance
- [ ] **Can create an invoice** → send to customer → mark as paid → reconcile with bank
- [ ] **Can see a profit & loss statement** — even if basic
- [ ] **Can see a balance sheet** — even if basic
- [ ] **Can connect one bank account** (Mono or CSV upload)
- [ ] **Can invite another user** (accountant, business partner)
- [ ] **Month-end close** — click to close a period, see the balance-check animation

---

## Scope: 15 Agents to Defer

These agents exist in the codebase but will NOT be shipped in the MVP:

| Agent                 | Reason Deferred                                     | When to Build   |
| --------------------- | --------------------------------------------------- | --------------- |
| Cashier Agent         | Only needed when cash/float > bank                  | Customer demand |
| Mobile Money Agent    | Standalone agent; MoMo handled by Reconciliation    | After MVP       |
| Payroll Manager Agent | Complex, jurisdiction-specific, P2                  | Customer demand |
| Payroll Worker Agent  | Depends on Payroll Manager                          | Customer demand |
| Compliance Agent      | Regulatory, P2                                      | Customer demand |
| Tax Agent             | Depends on local jurisdiction rules                 | Phase 2 (basic) |
| Audit Agent           | Read-only, needs data first                         | Phase 3         |
| Expense Agent         | Nice-to-have, P2                                    | Customer demand |
| Asset Agent           | Depreciation is advanced, P2                        | Customer demand |
| Inventory Agent       | Complex, P3                                         | Customer demand |
| Budget Agent          | Nice-to-have, P2                                    | Customer demand |
| Analytics Agent       | Nice-to-have, P2                                    | Customer demand |
| Budget Agent          | Nice-to-have, P2                                    | Already covered |
| Document Agent        | Ingest pipeline exists — defer advanced features    | Phase 2         |
| Reporting Agent       | Basic reports (P&L, Balance Sheet) done by platform | Keep basic only |

### What about the CFO Agent (Tier 1)?

The CFO Agent is the human-facing chat interface. For MVP:

- **Keep** the chat UI (it's the differentiator)
- **Limit** the CFO Agent to routing to the 4 core agents + providing plain-English summaries
- **Remove** CFO Agent's ability to invoke deferred agents — not callable means not broken

---

## Quick Wins: Things to Fix This Week

From the CEO review, these issues have outsized impact on the first customer:

1. **Pricing page** — Does one exist? If yes, verify it works. If not, build a simple one.
2. **Signup → first data** time — Measure it. Target: < 5 minutes from signup to seeing data.
3. **Error messages** — Every error a user sees must say WHAT, WHY, and HOW TO FIX.
4. **Mobile responsiveness** — Most SME owners use phones for business. Test the dashboard on a mid-range Android.
5. **Loading states** — Ensure every page has a skeleton loading state. 3G is normal in Lagos.

---

## Metrics: How We Know We're Winning

```
Month 1: 3 pilot users on free plan
Month 2: 10 active users, < 5 min signup-to-value
Month 3: 20 paying customers, < 3% monthly churn
Month 4: Case studies from first 5 customers
Month 5: Referral program live, 50% of new signups from referrals
```

## What NOT to Do (guaranteed waste for MVP)

- ❌ Build desktop app (Tauri — already postponed, keep postponed)
- ❌ Build mobile app (Expo — defer until web has 20 paying customers)
- ❌ Build any agent beyond the core 4 (they exist, don't ship them yet)
- ❌ Build multi-entity dashboards (single entity is fine for MVP)
- ❌ Build audit firm dashboard (client-switcher exists, don't optimize it yet)
- ❌ Build consolidation (intercompany, eliminations — P3, not now)
- ❌ Build golden dataset evals (internal tool, doesn't help customers)
- ❌ Perfect the design system (it's good enough. Ship.)

---

## Appendix: Agent Status Inventory

| #   | Agent                    | Tier     | Status   | MVP?                            |
| --- | ------------------------ | -------- | -------- | ------------------------------- |
| 1   | CFO Agent                | Tier 1   | ✅ Built | ✅ KEEP (limited scope)         |
| 2   | Controller Agent         | Tier 2   | ✅ Built | ✅ KEEP                         |
| 3   | Treasury Agent           | Tier 2   | ✅ Built | ❌ DEFER                        |
| 4   | Payroll Manager Agent    | Tier 2   | ✅ Built | ❌ DEFER                        |
| 5   | Compliance Agent         | Tier 2   | ✅ Built | ❌ DEFER                        |
| 6   | **Ledger Agent**         | Tier 3   | ✅ Built | ✅ **SHIP**                     |
| 7   | **AP Agent**             | Tier 3   | ✅ Built | ✅ **SHIP**                     |
| 8   | **AR Agent**             | Tier 3   | ✅ Built | ✅ **SHIP**                     |
| 9   | **Reconciliation Agent** | Tier 3   | ✅ Built | ✅ **SHIP**                     |
| 10  | Cash Agent               | Tier 3   | ✅ Built | ❌ DEFER                        |
| 11  | Mobile Money Agent       | Tier 3   | ✅ Built | ❌ DEFER (basic reconcile only) |
| 12  | Expense Agent            | Tier 3   | ✅ Built | ❌ DEFER                        |
| 13  | Payroll Worker Agent     | Tier 3   | ✅ Built | ❌ DEFER                        |
| 14  | Asset Agent              | Tier 3   | ✅ Built | ❌ DEFER                        |
| 15  | Inventory Agent          | Tier 3   | ✅ Built | ❌ DEFER                        |
| 16  | Tax Agent                | Tier 3   | ✅ Built | ❌ DEFER                        |
| 17  | Audit Agent              | Tier 3   | ✅ Built | ❌ DEFER                        |
| 18  | Reporting Agent          | Platform | ✅ Built | ✅ KEEP (basic only)            |
| 19  | Budget Agent             | Platform | ✅ Built | ❌ DEFER                        |
| 20  | Analytics Agent          | Platform | ✅ Built | ❌ DEFER                        |
| 21  | Document Agent           | Platform | ✅ Built | ✅ KEEP (ingest pipeline)       |

---

_Created: July 28, 2026 | Based on autoplan CEO review of BUILD_PLAN.md and project audit_
