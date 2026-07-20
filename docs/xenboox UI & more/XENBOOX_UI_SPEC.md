# XENBOOX — Web App UI/UX Spec (Screen-by-Screen)

> Engineering handoff doc. Companion to XENBOOX_PRD.md.
> Version: v1.0 | Last updated: July 2026

> **Status Key:** ✅ Built — 🏗 In Progress — ⬜ Not Started

---

## 0. Global Components (used across all screens)

**App Shell**

- [x] Left sidebar: 5 nav zones (Home, Money In/Out, Cash, Reports, Books) + entity switcher at top + "More" drawer for secondary modules (Payroll, Tax, Assets, Inventory, Budget, Donor Reporting)
- [x] Top bar: search, notifications bell, CFO Agent chat toggle, user menu
- [x] Right panel (collapsible): CFO Agent chat — persistent, not a popup

**Agent Activity Toast/Feed Item**

- [x] Agent icon/name, one-line action, timestamp, entity tag (if multi-entity)
- [x] Click → expands to source document + reasoning

**Approval Card** (reused everywhere: AP, expenses, close, tax, reopens)

- [x] Header: what happened (1 line)
- [x] Body: why it needs a human (agent's confidence gap / policy trigger)
- [x] Agent recommendation (pre-filled action)
- [x] Actions: [Approve] [Reject] [Ask why] — Ask why opens inline chat thread scoped to this item
- [x] Footer: linked source document thumbnail

**Confidence Badge**

- [x] Green (auto-processed, no action needed) / Amber (flagged, needs review) / Red (blocked, needs human decision)
- [x] Used on every transaction row, every dashboard tile

**Document Viewer (drawer)**

- [x] Opens from any transaction: original doc (PDF/image) side-by-side with extracted fields, OCR confidence per field, edit-and-correct inline

---

## 1. HOME

**Purpose:** Answer "is everything okay?" in 5 seconds, surface what needs the owner's attention, make the agent workforce visible.

**Components (top to bottom):**

1. [ ] Financial Health Score — single number/badge, trend arrow, tap for Analytics Agent breakdown
2. [ ] Cash position strip — total across bank + mobile money + cash tills, next 30-day forecast line
3. [ ] Approval Queue preview — top 3 pending items, "View all (N)" link
4. [ ] Agent Activity Feed — live scroll, last ~20 actions across all agents
5. [ ] CFO Agent chat entry point — prominent input bar: "Ask your CFO Agent anything..."
6. [ ] Close status card — "Books closed through June" / "5 days into July, closing in 12 days" progress bar

**Empty state (new org):** [ ] onboarding progress checklist instead of activity feed.

---

## 2. MONEY IN (Accounts Receivable + Invoicing)

**Screen: Invoices List**

- [ ] Filter tabs: All / Draft / Sent / Paid / Overdue
- [ ] Table columns: Customer, Invoice #, Amount, Due date, Status badge, Confidence badge
- [ ] Bulk actions: send reminders, export
- [ ] [+ New Invoice] → opens invoice builder (template picker, line items, payment link toggle)
- [ ] Row click → invoice detail: timeline (sent → viewed → paid), linked payments, AR Agent notes

**Screen: Customers**

- [ ] Card/list toggle, search, add customer (manual or CSV import)
- [ ] Customer detail: outstanding balance, invoice history, payment terms, donor tag (if NGO)

**Screen: AR Aging**

- [ ] Auto-generated report, 30/60/90 buckets, exportable, drill into any bucket → invoice list

---

## 3. MONEY OUT (Accounts Payable + Expenses)

**Screen: Bills/Invoices Inbox**

- [ ] This IS the Document Inbox filtered to AP — see Section 8 for full spec
- [ ] Status pipeline visible per bill: Detected → Extracted → Matched to PO → Scheduled → Paid
- [ ] Amber badge = needs review (e.g., no PO match found)

**Screen: Payment Scheduling**

- [ ] Calendar/list view of upcoming payments, grouped by due date
- [ ] "Pay now" bulk selector with cash position check inline (Cash Agent warns if insufficient funds)

**Screen: Expense Claims**

- [ ] Queue: employee submissions awaiting manager approval (uses Approval Card pattern)
- [ ] Policy violations flagged inline: "This exceeds the $50 meal limit by $12"
- [ ] Manager view: approve/reject with comment, auto-routes to reimbursement

**Screen: Suppliers**

- [ ] Same pattern as Customers screen, mirrored

---

## 4. CASH

**Screen: Cash Overview**

- [ ] Tiles per rail: Bank accounts, Mobile Money (Wave/Orange/MTN/etc), Physical cash tills
- [ ] Each tile: current balance, last reconciled date, unresolved items count

**Screen: Bank Reconciliation**

- [ ] Split view: bank statement lines (left) vs ledger entries (right)
- [ ] Auto-matched pairs shown collapsed/green; unmatched items expanded, drag-to-match interaction
- [ ] "Never closes with unresolved items" — hard block on marking complete if amber items remain, per PRD Treasury Agent rule

**Screen: Mobile Money**

- [ ] Per-provider tabs (Wave, Orange Money, MTN MoMo, etc.)
- [ ] Statement import button, transaction list, timing-difference flags (mobile confirmed vs bank settled)

**Screen: Cash & Imprest**

- [ ] Mobile-optimized (cashier role primary user)
- [ ] Big-button UI: [Issue Imprest] [Retire Imprest] [Record Cash Transaction]
- [ ] Imprest ledger: who holds float, amount, purpose, outstanding balance, retirement due date
- [ ] Daily cash reconciliation card at top: expected vs counted, discrepancy flagged immediately

---

## 5. REPORTS

**Screen: Reports Home**

- [ ] Standard report cards: P&L, Balance Sheet, Cash Flow, Trial Balance, AR/AP Aging
- [ ] Each card: last generated date, [View] [Export] [Schedule email delivery]
- [ ] "Ask for a custom report" input → routes to Reporting Agent via chat, renders inline as table/chart

**Screen: Report Detail (e.g., P&L)**

- [ ] Every line item is clickable → drills to transactions → drills to source document (explainability chain from Section 6 of PRD, Layer 4 audit trail)
- [ ] Plain-English summary banner at top: "Revenue up 12% vs last month, driven mainly by..."
- [ ] Period selector, comparison toggle (vs prior period / budget)

---

## 6. BOOKS (accountant-facing, role-gated)

**Screen: General Ledger**

- [ ] Standard ledger table, filterable by account, date range
- [ ] Journal entry detail: which agent posted it, confidence score, linked source doc

**Screen: Chart of Accounts**

- [ ] Tree view, add/edit accounts, "Ask CFO Agent to reclassify" shortcut instead of manual bulk edits

**Screen: Manual Journal Entry**

- [ ] Gated to Accountant/Finance Director role
- [ ] Standard debit/credit form, real-time balance validator (hard-blocks unbalanced entries — Layer 1 rule)

---

## 7. CLOSE FLOW (spans Home + dedicated screen)

**Screen: Close Center**

- [ ] Checklist view mirroring PRD Section 8: Controller confirms → Treasury confirms → Compliance confirms → auto-trigger
- [ ] Visual state per department head agent: ✅ clean / ⚠ items pending
- [ ] On close: notification + close package (P&L, balance sheet, cash flow, plain-English summary) rendered inline, downloadable PDF
- [ ] [Reopen this close] button — always visible on past closes, initiates Error Recovery Flow (PRD 8.1)

---

## 8. DOCUMENT INBOX (universal — the ingestion hub)

**This is the single most important AI-native screen. Full spec:**

**Layout:**

- [ ] Universal drop zone at top: drag-and-drop, paste, or click to browse
- [ ] Dedicated email address shown prominently, copyable: "Forward invoices to ap@[entity].xenboox.com"
- [ ] Mobile: camera capture button front and center

**Document list (below drop zone):**

- [ ] Each row: thumbnail, filename/source, detected type (invoice/receipt/bank statement/payslip), status pipeline badge, confidence badge
- [ ] Status pipeline: Detected → Processing → Extracted → Synced → Agent Processing → Done
- [ ] Click any row → Document Viewer drawer (side-by-side original + extracted fields, inline correction)

**Filters:** [ ] by type, by status, by source (email/upload/mobile/desktop-sync), by entity

**Failure state handling (per PRD onboarding failure states):**

- [ ] Unrecognized format → "We couldn't read this automatically. [Enter manually] [Try a different file]"
- [ ] Never a dead-end screen

---

## 9. APPROVAL QUEUE (dedicated screen, not just Home preview)

**Layout:**

- [ ] Single unified list across ALL agents (AP, expenses, close, tax, reopens, anomalies) — sorted by urgency/deadline, not by module
- [ ] Filter by type, by agent, by entity
- [ ] Each item uses the standard Approval Card
- [ ] Bulk approve for low-risk/high-confidence items (e.g., "Approve all 12 routine expense claims under $20")
- [ ] "Ask why" always available — never a black box

---

## 10. SETTINGS

- [ ] Organization: entities, billing, plan
- [ ] Users & roles: role assignment per entity (matrix view for multi-entity orgs)
- [ ] Integrations: connected accounts (bank, mobile money, QuickBooks/Xero), connect new
- [ ] Notification preferences: email/push per event type
- [ ] Compliance calendar: upcoming filing deadlines (read view, managed by Compliance Agent)

---

## 11. ONBOARDING (screens, mapped to PRD Section 13)

1. [ ] Signup — email/OAuth, org name/type/country
2. [ ] Entity setup — business name, industry, fiscal year end, currency
3. [ ] Connect your data — 3 connection cards (bank/mobile money/accounting software) with live progress feedback per card
4. [ ] Historical pull — real-time counter UI: "Processing April 2025... 847 transactions found"
5. [ ] Chart of accounts review — proposed COA shown, one-click confirm or customize
6. [ ] First look — dashboard loads pre-populated, CFO Agent opening message in chat panel

---

## Build Priority (maps to PRD Phase 1 MVP agents)

For MVP, only these screens need to exist:
Home, Money In (basic), Money Out (basic), Cash (bank recon + mobile money + imprest), Reports (P&L/BS/TB), Books (ledger + COA), Close Center, Document Inbox, Approval Queue, Onboarding.

Defer: full Budget/Tax/Payroll/Assets/Inventory/Donor screens to Phase 2/3 per PRD Section 20.

---

_Companion to XENBOOX_PRD.md — Section 7 (Interfaces) and Section 13 (Onboarding)_
