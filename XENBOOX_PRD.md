# XENBOOX — Product Requirements Document (PRD)

> ⚠️ **WEB ONLY** — Mobile and Desktop are postponed. All development focuses on the web app (`apps/web/`). Do not create mobile or desktop code.
>
> The complete, definitive product specification for Xenboox.
> Single source of truth for all sessions — engineering, YC application, pitching, hiring, and building.
> Version: v1.0 | Last updated: August 2026 | Authors: Founder + Claude (co-founder sessions)

---

## 1. Vision

Xenboox is the first AI-native, full-stack accounting platform for SMEs globally. It combines everything QuickBooks, Xero, Digits, and Pilot do into one product — with an autonomous agent workforce that handles the accounting work so your team doesn't have to.

**The core promise:**

> "Your entire accounting department, running autonomously. Agents do the work. You make the decisions that matter."

**What makes Xenboox different:**

- Not a tool you operate — a workforce that operates itself
- Not built for Silicon Valley startups — built for organizations doing real business
- Not a narrow solution — a complete accounting platform covering every function
- Not Western-first — built natively for how SMEs actually operate: local currencies, tax regimes, mobile money, and cash-heavy workflows
- One surface for now — **web only** (mobile and desktop are postponed)

---

## 2. The Problem

Organizations of every size need accounting. But the current solutions fail them in different ways:

**For SMEs:**

- Can't afford a full-time accountant ($1,500-$3,000/month)
- Accounting firms are expensive and slow
- QuickBooks and Xero require someone to operate them — the owner ends up doing accounting work themselves, badly, late, and stressed

**For corporations and agencies:**

- SAP costs $50,000+ to implement — completely inaccessible
- Sage has weak penetration outside South Africa
- QuickBooks and Xero weren't built for SME needs, mobile money, or cash-heavy operations
- Most organizations use Excel — fragile, error-prone, not auditable
- No platform handles mobile money as a first-class payment rail
- No platform has proper imprest and cash management for cash-heavy operations

**The gap:**
Every serious accounting platform was built for Western markets with Western assumptions. Millions of SMEs and thousands of corporations operate with tools that don't fit how they actually work. Nobody has built the right thing for this market. Xenboox does.

---

## 3. What Xenboox Is Not

- Not a chatbot
- Not a wrapper around QuickBooks or Xero
- Not an AI assistant that helps you do accounting
- Not built only for VC-backed tech startups
- Not a licensed accounting firm
- Not a replacement for a CPA for complex tax situations requiring professional judgment
- **Web-only for now** — mobile and desktop are postponed. All development focuses on the web app (`apps/web/`).

---

## 4. Target Market

### Launch Market

**The Gambia** — small enough to know users personally, test assumptions fast, fix problems before they scale, and prove the model before expanding.

### Expansion Markets (Phase 2)

- Nigeria — 40 million SMEs, largest economy in Africa, sharpest formalization pressure
- Ghana — stable, growing, English-speaking, strong fintech ecosystem
- Senegal — French-speaking West Africa gateway, strong NGO and development sector
- Kenya — most digitally advanced economy in East Africa, M-Pesa infrastructure

### Global Ambition

Xenboox is built for SMEs first but designed for all organizations. The agent architecture, multi-currency support, and modular compliance system make it deployable in any market by adding jurisdiction-specific compliance rules.

### Customer Segments

**Segment 1 — SMEs**

- 1-50 employees
- No dedicated finance team or one part-time bookkeeper
- Currently using Excel, paper, or nothing
- Pain: books never get done properly, no visibility into financial health
- Primary interface: web and mobile

**Segment 2 — Mid-size Organizations**

- 50-200 employees
- Small finance team of 2-5 people
- Currently using Excel or basic accounting software
- Pain: manual processes, reconciliation nightmares, audit stress
- Primary interface: web with desktop for document-heavy workflows

**Segment 3 — Corporations and Agencies**

- 200+ employees
- Full finance department
- Currently using SAP (too expensive), Sage, or Excel
- Pain: no AI-native automation, not built for SME operations, expensive consultants
- Primary interface: web, with multi-entity and branch accounting

**Segment 4 — NGOs and Development Organizations**

- Any size
- Finance officer or small team
- Donor reporting obligations
- Pain: manual donor reports, budget vs actual tracking, audit preparation
- Primary interface: web and mobile

**Segment 5 — Accounting Firms**

- Manages books for multiple clients
- Needs multi-client dashboard
- Pain: switching between client systems, manual work, no unified platform
- Primary interface: web with firm dashboard
- Distribution: each firm brings multiple clients — high leverage acquisition channel

---

## 5. The Product

### 5.1 What Xenboox Does

Xenboox runs an autonomous accounting department for any organization. A workforce of 19 AI agents — organized in a three-tier hierarchy — handles every accounting function continuously. Humans manage and approve. Agents execute.

### 5.2 The Twenty Modules

Xenboox covers every accounting function in one platform:

| #   | Module                      | Description                                                                                           |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | General Ledger              | Foundation of everything. Chart of accounts, journal entries, double-entry enforcement, trial balance |
| 2   | Bank Reconciliation         | Bank statement matching from API feeds, PDF uploads, manual entry                                     |
| 3   | Accounts Payable            | Invoice ingestion, supplier management, payment tracking, aging                                       |
| 4   | Accounts Receivable         | Invoice creation, customer management, payment tracking, aging                                        |
| 5   | Cash and Imprest Management | Daily cash position, petty cash, imprest issuance and retirement                                      |
| 6   | Mobile Money                | Wave, Orange Money, MTN MoMo, M-Pesa, Airtel Money — first-class rails                                |
| 7   | Payroll                     | Salary calculation, PAYE, social security, payslips, contractor payments                              |
| 8   | Invoicing                   | Professional invoice creation, templates, recurring, payment links                                    |
| 9   | Expense Management          | Employee claims, receipt capture, approval workflow, reimbursement                                    |
| 10  | Fixed Assets                | Asset register, depreciation, disposal, physical verification                                         |
| 11  | Inventory                   | Stock tracking, COGS, purchase orders, valuations, alerts                                             |
| 12  | Budgeting                   | Annual budget, monthly tracking, variance analysis, forecasting                                       |
| 13  | Financial Reporting         | P&L, balance sheet, cash flow, trial balance, custom reports                                          |
| 14  | Tax Compliance              | VAT, PAYE filing prep, withholding tax, corporate tax, jurisdiction exports                           |
| 15  | Donor and Grant Reporting   | Budget vs actual by project/donor, donor portal, automated reports                                    |
| 16  | Audit Preparation           | Supporting schedules, voucher management, audit trail, auditor portal                                 |
| 17  | Multi-Entity and Branch     | Multiple entities, inter-company, consolidation, branch reporting                                     |
| 18  | Multi-Currency              | Exchange rates, realized/unrealized FX gains and losses, all currencies                               |
| 19  | Document Management         | Ingestion, OCR, classification, storage, audit trail linking                                          |
| 20  | Analytics and Insights      | Trends, anomaly detection, cash flow forecasting, health scoring                                      |

---

## 6. The Agent Workforce

### 6.1 Design Principles

**Specialization** — Each agent owns one domain completely. Best in the world at that one thing. Never operates outside its domain.

**Hierarchy** — Three clear tiers mirror a real accounting department: strategic, management, worker. Clear authority at every level. No ambiguity about who decides what.

**Orchestration** — The CFO Agent is strategic only. It never touches individual transactions. It reads summaries from department heads and makes strategic decisions.

**No bottleneck** — Department head agents review their workers' outputs. The CFO Agent reviews department head summaries. 1,000 daily transactions never hit the CFO Agent directly.

**Human escalation** — Every agent knows exactly when to stop and involve a human. Uncertainty gets flagged, not guessed. Material decisions always have a human in the loop.

**Modularity** — Agents map to modules. New module = new or extended agent. Architecture scales with the product.

**Entity scoping** — Every agent always knows which entity it is working in. All database queries are scoped to that entity_id. Data never crosses entity boundaries.

### 6.2 The Three-Tier Hierarchy

```
HUMAN (Owner / Finance Director / Board)
                    |
        ════════════════════════
              CFO AGENT
           Strategic Orchestrator
        ════════════════════════
                    |
    ┌───────────────┼───────────────┬──────────────┐
    |               |               |              |
CONTROLLER      TREASURY       PAYROLL        COMPLIANCE
  AGENT           AGENT        MANAGER          AGENT
(Management)   (Management)    AGENT         (Management)
    |               |        (Management)        |
┌───┴────┐     ┌────┴────┐       |          ┌────┴────┐
Ledger   AP    Recon    Cash  Payroll       Tax     Audit
Agent   Agent  Agent   Agent  Worker       Agent   Agent
        AR     Mobile  Expense Agent
        Agent  Money   Agent
        Asset  Agent
        Agent
        Inventory
        Agent

Platform-wide (Report directly to CFO Agent):
├── Reporting Agent
├── Budget Agent
├── Analytics Agent
└── Document Agent
```

**Total: 19 agents across 3 tiers**

### 6.3 Tier 1 — Strategic Layer

**CFO Agent**
The master orchestrator and the face of Xenboox. The human always talks to the CFO Agent first.

Responsibilities:

- Receives instructions from human owners and finance directors in plain English
- Assigns work to department head agents
- Reviews department head summaries — never individual transactions
- Triggers month-end and year-end close sequences
- Makes final decisions on escalations from department heads
- Produces plain-English executive financial summaries for leadership
- Flags strategic anomalies — unusual trends, cash risk, budget overruns
- Signs off on close only after all department heads confirm their domains are clean
- Communicates with humans as the primary voice of Xenboox
- Never posts journal entries — delegates all execution to lower tiers

### 6.4 Tier 2 — Management Layer

**Controller Agent**
Owns the integrity of the general ledger and all accounting records.

Oversees: Ledger Agent, AP Agent, AR Agent, Asset Agent, Inventory Agent

Responsibilities:

- Reviews all journal entries before final posting
- Enforces double-entry integrity across all postings
- Produces trial balance and confirms to CFO Agent
- Manages month-end close checklist for accounting operations
- Ensures all AP and AR are properly reconciled before close
- Escalates to CFO Agent only when something material needs strategic decision

**Treasury Agent**
Owns all cash, bank, and payment rail management.

Oversees: Reconciliation Agent, Cash Agent, Mobile Money Agent, Expense Agent

Responsibilities:

- Reviews all reconciliations before marking complete
- Monitors daily cash position across all accounts and payment rails
- Manages payment scheduling and cash flow planning
- Alerts CFO Agent when cash position needs strategic attention
- Produces daily treasury position report
- Never closes a reconciliation with unresolved items

**Payroll Manager Agent**
Owns the entire payroll function end to end.

Oversees: Payroll Worker Agent

Responsibilities:

- Reviews payroll calculations before processing
- Confirms statutory deductions are correct for the specific jurisdiction
- Approves payroll journal posting to Controller Agent
- Handles payroll exceptions — new starters, leavers, salary changes, bonuses
- Reports payroll summary to CFO Agent monthly
- Maintains payroll compliance calendar by jurisdiction

**Compliance Agent**
Owns all regulatory, tax, and audit obligations.

Oversees: Tax Agent, Audit Agent

Responsibilities:

- Monitors all filing deadlines across every jurisdiction the organization operates in
- Reviews tax calculations before submission packages are produced
- Manages audit preparation process from start to finish
- Reports compliance status to CFO Agent
- Escalates regulatory risks immediately to CFO Agent and human
- Updates its rule set when tax laws change — monitored by human review
- Runs continuous internal audit through the Audit Agent

### 6.5 Tier 3 — Worker Layer

**Under Controller Agent:**

**Ledger Agent**

- Posts all journal entries from every other agent
- Maintains chart of accounts
- Enforces double-entry — the hard mathematical constraint layer
- Produces trial balance on demand
- Owns opening and closing balance for every period
- No other agent posts directly to the ledger — everything goes through here
- The most critical agent in the system

**AP Agent**

- Invoice ingestion from all formats — email, PDF, image, WhatsApp photo, Excel
- Supplier master data management
- Invoice matching to purchase orders
- Payment scheduling and due date tracking
- Cheque preparation tracking
- Mobile money payment recording
- AP aging report generation
- Flags overdue and disputed items to Controller Agent

**AR Agent**

- Invoice creation and professional delivery
- Customer master data management
- Payment tracking and matching to invoices
- Receipt generation
- AR aging report generation
- Overdue invoice alerts
- Donor payment tracking for NGOs

**Asset Agent**

- Asset register maintenance — every asset, location, value, condition, responsible person
- Depreciation calculation — straight line, reducing balance by asset class
- Asset disposal and write-off processing
- Physical verification scheduling and tracking
- Asset journal posting to Ledger Agent

**Inventory Agent**

- Stock level tracking across all locations
- Purchase order management
- Goods received note recording
- Cost of goods sold calculation
- Inventory valuation — FIFO, LIFO, weighted average
- Low stock alerts
- Inventory journal posting to Ledger Agent

**Under Treasury Agent:**

**Reconciliation Agent**

- Bank statement reconciliation from API feeds, PDF uploads, and manual entry
- Matches transactions to ledger entries automatically
- Flags every unmatched item with specific detail
- Never closes a reconciliation with unresolved items
- Produces reconciliation report for Treasury Agent review
- Handles multi-bank, multi-account reconciliation simultaneously

**Cash Agent**

- Daily cash position tracking across all physical cash tills and locations
- Petty cash float management
- Imprest issuance — records who received float, how much, for what purpose, when
- Imprest retirement — matches receipts to float issued, calculates balance due
- Cash discrepancy detection and immediate flagging
- Daily cash reconciliation report
- Critical for cash-heavy operations — built more robustly than any Western platform

**Mobile Money Agent**

- Wave integration and transaction ingestion
- Orange Money integration
- MTN Mobile Money integration
- M-Pesa integration
- Airtel Money integration
- Additional mobile money rails added by market
- Reconciles mobile money statements against ledger entries
- Treats mobile money as first-class payment rail — not an afterthought
- Flags timing differences between mobile money confirmation and bank settlement

**Expense Agent**

- Employee expense claim ingestion from mobile app
- OCR extraction from photographed receipts
- Policy compliance checking — is this claim within policy limits
- Routes to appropriate manager for approval
- Reimbursement tracking
- Expense categorization and posting to Ledger Agent via Controller Agent

**Under Payroll Manager Agent:**

**Payroll Worker Agent**

- Staff database management — salaries, allowances, deductions, bank details
- Monthly payroll calculation for all staff
- PAYE tax deduction calculation by jurisdiction — GRA, FIRS, KRA, GRA-GH
- Social security contribution calculation — SSHFC (Gambia), NSITF (Nigeria), NHIF (Kenya), SSNIT (Ghana)
- Staff loan tracking and monthly deduction
- Payslip generation and secure delivery to each staff member
- Contractor payment management and withholding tax calculation
- Annual end-of-year documentation — P60 equivalents by jurisdiction
- Payroll journal posting to Ledger Agent via Controller and Payroll Manager

**Under Compliance Agent:**

**Tax Agent**

- VAT calculation and return preparation by jurisdiction
- PAYE filing preparation linked to payroll
- Withholding tax calculation on all contractor payments
- Corporate tax preparation package — annual
- Local tax authority format exports — GRA (Gambia), FIRS (Nigeria), GRA (Ghana), KRA (Kenya)
- Tax deadline calendar and advance alerts
- Tax position summary for management

**Audit Agent**

- Runs continuously — not just at year end
- Continuously samples transactions for accuracy against accounting standards
- Runs independent checks against all ledger entries
- Compares agent decisions against the golden dataset eval framework
- Flags inconsistencies or suspicious patterns to Compliance Agent
- Prepares audit packages for external auditors on demand — supporting schedules, vouchers, prior period comparisons
- Manages external auditor portal access
- Responds to auditor queries with evidence from the audit trail
- 24/7 internal audit — a differentiator no competitor offers

**Platform-wide Agents (Report directly to CFO Agent):**

**Reporting Agent**

- P&L statement — monthly, quarterly, annual
- Balance sheet
- Cash flow statement
- Trial balance
- General ledger report
- Custom reports built on request via chat
- Donor and grant reports in required donor formats — USAID, EU, World Bank, AfDB
- Audit preparation package
- Year-end close package
- Plain-English narrative summaries for non-accountant owners and boards
- Board and management reporting packs
- Consolidated group reports for multi-entity organizations

**Budget Agent**

- Annual budget creation and storage
- Monthly budget vs actual comparison for every budget line
- Variance analysis with plain-English explanation of significant variances
- Departmental budget tracking — each department head sees their budget
- Cash flow forecasting based on current revenue and expenditure trajectory
- Budget alerts when lines are approaching or exceeded
- Multi-year budget planning for larger organizations

**Analytics Agent**

- Trend detection across all financial data
- Anomaly detection — unusual transactions, spending pattern shifts, timing irregularities
- Cash flow forecasting — "at current trajectory you have X months of runway"
- Financial health scoring
- Benchmarking against similar organizations in the same market
- Proactive alerts — surfaces insights the human didn't ask for
- Fraud pattern detection flagging to Compliance Agent
- Year-on-year performance comparisons

**Document Agent**

- Document ingestion from all sources — email, upload, scan, mobile photo, desktop folder watch
- OCR extraction from all formats
- Document classification — invoice, receipt, contract, bank statement, payslip, grant letter
- Secure storage with encryption at rest
- Links every document to its corresponding transaction for complete audit trail
- Document retrieval on demand — "show me the invoice for this transaction"
- Retention policy management — keeps documents for required period by jurisdiction
- Coordinates with Tauri desktop app for local file system watching

### 6.6 How Agents Work Together — Example Flow

**Supplier invoice arrives by email:**

1. Document Agent ingests email, OCR extracts invoice data
2. AP Agent receives structured data, matches to purchase order, schedules payment
3. Cash Agent confirms sufficient cash position for payment
4. Mobile Money Agent or Reconciliation Agent records payment when made
5. Ledger Agent posts the complete journal entry
6. Tax Agent checks VAT treatment and records input VAT
7. Controller Agent reviews the complete posting
8. Reporting Agent updates P&L and cash flow in real time
9. Analytics Agent updates supplier spend trends
10. CFO Agent receives summary — no individual transaction review
11. Human notified only if something needs their judgment

**The human never touches the invoice.**

### 6.7 The Accuracy Architecture

Xenboox's core technical moat. Built from day one, never retrofitted.

**Layer 1 — Deterministic Rules (Zero AI tolerance)**

- Double-entry must always balance. Period. No exceptions.
- Bank balance must match reconciled ledger. Period.
- Tax figures pass rule-based validator before any output
- Hard mathematical constraints enforced by Ledger Agent
- No agent can override these rules under any circumstances

**Layer 2 — Agent Cross-Checking**

- Worker agents do the work
- Department head agents review before committing
- CFO Agent reviews department head summaries
- No single agent has final authority at any tier
- Disagreements between agents trigger escalation not coin-flip

**Layer 3 — Confidence Threshold System**

- Every agent output carries a confidence score
- Below threshold → flag to appropriate superior agent or human
- Never guess silently on anything material
- Golden dataset of verified correct accounting scenarios
- Every agent output scored against this dataset continuously
- Regression testing before every product deployment

**Layer 4 — Human in the Loop + Full Audit Trail**

- Every decision logged: what, why, which agent, confidence level, timestamp
- Human approves: anything above dollar threshold, CFO Agent escalations, month-end close
- Full audit trail exportable at any time for any period
- Both original and corrected versions of any close are preserved
- External auditors can access read-only audit trail for their engagement period

---

## 7. The Interfaces

### 7.1 Web Platform

Primary interface for Finance Directors, accountants, and business owners on desktop browsers.

Full access to all modules based on user role. Real-time updates. The primary engineering target for MVP.

### 7.2 Mobile App

Primary interface for business owners checking financial position, employees submitting expenses, cashiers recording cash transactions, and department managers approving expenses.

**Mobile-first design principles:**

- Core actions completable in under 3 taps
- Works on low bandwidth — data-efficient API design
- Offline capable — queues actions when disconnected, syncs when connected
- Camera integration for receipt capture
- Push notifications for approvals and alerts
- Available on iOS and Android

**Key mobile use cases:**

- Business owner: check cash position, approve month-end close, chat with CFO Agent
- Employee: photograph receipt, submit expense claim, check reimbursement status
- Cashier: record cash transaction, issue imprest, capture receipt
- Department manager: approve team expense claims, check department budget

### 7.3 Desktop Application

Native Windows and Mac application for organizations with document-heavy workflows — finance teams working with Excel files, local PDFs, scanned invoices, and other locally stored documents.

**Technology:** Tauri (Rust backend + React/Shadcn webview)

**Rust Backend Capabilities:**

- File system watcher — monitors designated folders continuously for new or changed files
- Format detection and routing to correct parser
- PDF extraction — text layer and OCR for scanned documents
- Excel parsing — reads workbook structure, identifies financial tables
- Word document parsing — extracts tables, line items, financial figures from .docx
- CSV and TSV parsing — handles messy non-standard formats
- Image OCR — photographed receipts, handwritten records, scanned documents
- Email export parsing — .eml and .msg formats
- Local SQLite database — encrypted cache of processed documents
- AES-256 encryption at rest for all local financial data
- Cloud sync engine — queues extracted data for cloud agent processing
- Native notifications — "New invoice detected", "Books closed for June"
- Auto-update — silent background updates

**Supported Input Formats:**

- Excel: .xlsx, .xls
- CSV and TSV
- Word: .docx, .doc
- PDF: text-based and scanned
- Images: .jpg, .jpeg, .png, .webp, .tiff
- Email exports: .eml, .msg
- Plain text: .txt

**OCR Strategy:**

- Tesseract — primary, runs locally, no API cost, handles most documents
- Claude Vision API — fallback for complex, low quality, or handwritten documents
- Keeps costs low and data local by default

**Desktop UI:**

- Document Inbox — every detected file with processing status pipeline
- Status: Detected → Processing → Extracted → Synced → Agent Processing → Done
- Full Xenboox dashboard (identical to web)
- Chat interface to CFO Agent
- PDF and document report viewer
- Settings — folder permissions, sync preferences, security

**Critical architecture decision:**
Agents always run in the cloud. The desktop app is the local interface and document bridge only. Agent logic never runs on the client device. This enables silent updates, consistent agent behavior, and prevents the client machine becoming a dependency.

### 7.4 Chat Interface

Available on all surfaces. The human's primary way of interacting with the agent workforce.

The CFO Agent is always the first point of contact. It routes to specialist agents as needed.

**Example interactions:**

- "What was our profit last month?" → Reporting Agent produces, CFO Agent delivers
- "Run payroll for July" → CFO Agent instructs Payroll Manager Agent
- "Why did you categorize this as office supplies?" → Bookkeeping logic explained
- "Show me all unpaid invoices over 30 days" → AR Agent produces list
- "Prepare the VAT return for Q2" → Tax Agent produces, Compliance Agent reviews
- "The June close is wrong, marketing spend is miscategorized" → Recovery flow initiates

### 7.5 Email Delivery

Month-end close reports, VAT filing reminders, budget alerts, and overdue invoice notifications delivered automatically to relevant users. Owner doesn't have to log in — results come to them.

---

## 8. Autonomous Close Flow

1. Agents run continuously throughout the month
2. At month-end, CFO Agent reviews department head summaries
3. Controller Agent confirms: all transactions posted, trial balance balanced, AP and AR reconciled
4. Treasury Agent confirms: bank reconciliation complete, cash reconciliation clean, mobile money reconciled
5. Compliance Agent confirms: all VAT and tax obligations calculated, no filing deadlines missed
6. If all confirmations received and confidence thresholds met → close triggers automatically
7. Reporting Agent produces month-end package — P&L, balance sheet, cash flow, plain-English summary
8. Owner receives notification: "Your books are closed for [Month]. Here's what happened."
9. Owner reviews — if satisfied, does nothing (passive approval)
10. If owner flags anything → CFO Agent initiates recovery flow
11. Full audit trail logged throughout — every decision explainable

### Error Recovery Flow

**How owner flags:**

- Dashboard "Reopen this close" button
- Reply to close notification email
- Chat: "The June close is wrong"

**What happens:**

1. CFO Agent reopens the period
2. Asks owner to describe the issue in plain English
3. Identifies scope — which transactions, which agents involved
4. Classifies error type:
   - Simple correction: recategorize, repost, re-close (under 10 minutes)
   - Missing data: re-pull from integration or request document upload, re-close
   - Cascading error: identifies all affected periods, proposes correction sequence, requests owner approval before beginning, corrects root cause, re-closes all affected periods in sequence
5. Every version of every close preserved in audit trail
6. Owner notified when correction is complete

**How far back can owner reopen:**

- Last 3 months: immediate, fast recovery
- 3-12 months: available, agent flags downstream effects
- Beyond 12 months: available with honest scope assessment from CFO Agent before beginning

---

## 9. Multi-Tenancy and Organization Architecture

### 9.1 The Three-Layer Model

```
LAYER 1 — PLATFORM
Xenboox itself. One instance. Serves all organizations.

LAYER 2 — ORGANIZATION
The legal entity or firm using Xenboox.
Billing lives here. Users belong here.

LAYER 3 — ENTITY
Individual companies, subsidiaries, or clients
within an organization. All financial data lives here.
```

### 9.2 Database Architecture

Every financial record carries an entity_id. All agent queries are scoped to the current entity_id. Row-level security enforced at the database layer — not just application layer.

```
organizations
    id, name, type, plan, billing

entities
    id, organization_id, name, type,
    currency, country, fiscal_year_end

users
    id, organization_id, name, email

user_entity_access
    user_id, entity_id, role
    (many-to-many — one user can access multiple entities with different roles)
```

### 9.3 Use Cases

**Corporation with subsidiaries:**

```
Organization: Fatima Holdings Group
    ├── Entity: Fatima Holdings Ltd (Parent)
    ├── Entity: Fatima Logistics Ltd
    ├── Entity: Fatima Properties Ltd
    └── Entity: Fatima Foods Ltd
```

Finance Director sees all entities and consolidated group view. Each entity has completely separate books. CFO Agent runs consolidated reporting on demand.

**Accounting firm:**

```
Organization: Koroma & Associates
    ├── Entity: Gamtel (Client)
    ├── Entity: Trust Bank Gambia (Client)
    ├── Entity: ActionAid Gambia (Client)
    └── Entity: Kairaba Shopping Center (Client)
```

Accountant logs in once, sees client dashboard, switches between clients. Each client's data completely isolated. Clients can also log in independently.

**Simple SME:**

```
Organization: Lamin's Trading Co.
    └── Entity: Lamin's Trading Co.
```

Single entity. No complexity needed.

### 9.4 Organization-Level Roles

**Organization Owner**

- Creates and manages all entities
- Manages billing
- Manages all users across all entities
- Sees consolidated reports across all entities
- Cannot be removed by anyone else

**Organization Admin**

- Manages users across all entities
- Sees all entities
- Cannot manage billing

### 9.5 Entity-Level Roles

Users can have different roles in different entities:

| Role                | Access                                            |
| ------------------- | ------------------------------------------------- |
| Finance Director    | Full finance access for this entity               |
| Accountant          | Domain-scoped access (AP, AR, etc.)               |
| Payroll Officer     | Payroll module only — salary data strictly scoped |
| Cashier             | Cash module only                                  |
| Department Manager  | Their department budget + expense approvals       |
| Employee            | Expense submission only                           |
| External Auditor    | Read-only, period-locked, auditor portal          |
| External Accountant | Full access, multi-client dashboard               |
| Donor/Funder        | Read-only, project-scoped donor portal            |

### 9.6 Consolidated View

For corporations with subsidiaries, Finance Directors see:

```
Viewing: [Fatima Holdings Group ▼]
         ├── Consolidated Group ← eliminates inter-company transactions
         ├── Fatima Holdings Ltd
         ├── Fatima Logistics Ltd
         ├── Fatima Properties Ltd
         └── Fatima Foods Ltd
```

Controller Agent handles consolidation:

- Eliminates inter-company transactions
- Converts subsidiary financials to parent reporting currency
- Produces consolidated P&L, balance sheet, cash flow
- Handles minority interests

### 9.7 Accounting Firm Client Switcher

```
Koroma & Associates — Client Dashboard

Active Clients (4)
├── Gamtel .............. Books current ✓
├── Trust Bank Gambia ... 3 items need review ⚠
├── ActionAid Gambia .... Month-end close due 📅
└── Kairaba Shopping .... Overdue invoices 🔴

[+ Add New Client]
```

---

## 10. The Ten User Types

### Level 1 — Platform Owner

**Account Owner / Business Owner**
Signs up, pays, has full access. Not necessarily an accountant. Primary chat partner with CFO Agent.

Sees: Executive dashboard, CFO Agent chat, approval queue, all reports, settings and billing
Cannot: Post journal entries directly, approve own expenses, override compliance without audit trail

### Level 2 — Finance Leadership

**Finance Director / CFO (Human)**
Senior finance professional inside larger organizations.

Sees: Full finance dashboard, agent activity feed, all approval queues with agent reasoning, all reports, budget vs actual, compliance calendar
Cannot: Change system settings without Account Owner, add/remove users, access billing

### Level 3 — Finance Team

**Accountant / Bookkeeper**
Day-to-day finance team. Works alongside agents, reviews outputs, handles exceptions.

Sees: Domain-specific dashboard, transaction feeds for their area, exception queue, document inbox, their module reports
Cannot: Access other departments without permission, approve own expenses, see payroll details

**Payroll Officer**
Specifically manages payroll. Sees all salary information. Strictly scoped role.

**Cashier / Cash Manager**
Manages physical cash and imprest. Mobile-first role for field cash recording.

### Level 4 — Operational Users

**Employee (Expense Claimant)**
Submits expense claims only. Simplest possible interface.

Sees: Expense submission screen, claim status tracker, reimbursement history
Cannot: See anything else in the system

**Department Manager (Budget Holder)**
Non-finance manager who owns a departmental budget.

Sees: Department budget dashboard, team expense claims pending approval, department spending trends
Cannot: See anything outside their department

### Level 5 — External Users

**External Auditor**
Read-only access to specific period. Interacts with Audit Agent only.

Sees: Auditor portal — period-locked, read-only, documents, trial balance, schedules, query log
Cannot: Post anything, see current period if auditing prior, access full payroll detail without specific grant

**External Accountant / Accounting Firm**
Full access equivalent to Finance Director. Multi-client dashboard.

**Donor / Funder**
Read-only access to their specific grant or project. Donor portal. Automated report delivery.

---

## 11. Data Integrations

### Web Platform Integrations

- **QuickBooks Online** — via OAuth through Merge.dev
- **Xero** — via OAuth through Merge.dev
- **Shopify** — payout reconciliation, order data, refunds
- **Amazon Seller Central** — payout reconciliation, fees, settlements
- **Plaid** — bank feed access (primary for markets where available)
- **Direct bank PDF upload** — for banks without API access (common in Africa)
- **Mobile money** — Wave, Orange Money, MTN MoMo, M-Pesa, Airtel Money (statement import and where APIs exist)
- **Email forwarding** — invoices sent to dedicated Xenboox address
- **File upload** — PDF, Excel, CSV, Word, image

### Desktop Application Integrations

All web integrations plus:

- **Local file system** — automatic folder watching for all document formats
- **Microsoft Excel** — direct file reading without upload
- **Email clients** — local .eml and .msg export reading

### Integration Priority for MVP

1. Bank PDF statement upload (most universal for emerging markets)
2. Mobile money statement import — Wave first (dominant in Gambia)
3. Email invoice ingestion
4. Excel/CSV file upload
5. QuickBooks/Xero via Merge.dev (for organizations already on these)
6. Plaid where available
7. Shopify (for e-commerce segment)

---

## 12. Multi-Currency

Available on all tiers. No currency limits. Restricting currencies per tier would break the product for businesses receiving unexpected foreign payments.

**Exchange rate source:**

- Primary: European Central Bank rates — free, reliable, widely accepted
- Fallback: Open Exchange Rates API
- Rates pulled daily at market close
- Rate used: transaction date rate, not payout date
- All rates stored with timestamp — fully auditable

**Transaction recording:**
Every foreign currency transaction stored with three values:

- Original amount and currency: £450 GBP
- Exchange rate used: 1.27
- Base currency equivalent: $571.50

**Realized vs unrealized gains and losses:**

- Unrealized: sale made, payment not yet received, rate moves → balance sheet, not P&L
- Realized: payment received and converted → hits P&L as foreign exchange gain or loss
- Bookkeeping Agent posts these entries automatically
- Reporting Agent includes plain-English FX summary in close report

**Owner sees:**
"Currency movements added $234 to your profit this month — GMD strengthened against USD."

---

## 13. Onboarding Flow

Target: first meaningful value within 12 minutes of signup.

**First value moment:** Transactions appearing in the system, categorized correctly, in real time. Not the close — the moment they see the agents starting work.

**Step 1 — Signup (2 minutes)**

- Email + password or Google OAuth
- Organization name, type, country
- How they currently manage books — routes to correct setup path

**Step 2 — Entity setup (1 minute)**

- Business name, industry, fiscal year end
- Base currency
- For accounting firms: invite first client

**Step 3 — Connect your data (5 minutes)**
Three connection cards shown in sequence based on what they have:

- Connect bank — PDF upload or API feed
- Connect mobile money — statement import
- Connect accounting software (if applicable) — QuickBooks or Xero OAuth
- Or: Upload your Excel files

Progress shown in real time. Each connection triggers immediate feedback: "Bank statement uploaded. Processing 847 transactions..."

**Step 4 — Historical data pull (background)**

- All available history pulled automatically — no paywall, no limits
- Free because it's a prerequisite for accurate work, not a feature
- Visual shows transactions appearing: "Processing April 2025..."
- Beyond 12 months: CFO Agent asks permission before beginning — "I found data going back to 2022. Shall I reconstruct those years? It may take up to 24 hours."

**Step 5 — Chart of accounts setup (3 minutes)**

- Xenboox proposes standard chart of accounts based on business type and country
- Owner reviews and confirms — no accounting knowledge required
- Pre-built templates for each segment and market
- Can customize any time via chat

**Step 6 — First look (done)**

- Dashboard loads with transactions already categorized
- CFO Agent sends first message: "I've reviewed your records. Here's what I found..."
- Flags anything needing attention immediately

**Failure states:**

- Bank upload fails → manual transaction entry offered
- Mobile money statement format not recognized → agent asks for different export format
- QuickBooks OAuth fails → CSV export path offered
- Never leave user on broken screen — every failure has a clear alternative path

---

## 14. Liability and Legal Positioning

### Core Position

Xenboox is a financial software tool, not a licensed accounting firm. Industry standard — QuickBooks, Xero, Pilot all operate identically.

### Protection Layers

**ToS** — Platform automates accounting workflows. Outputs should be reviewed by a qualified accountant for tax filing, audit, or regulatory submission. Xenboox is not liable for decisions made based on platform outputs.

**Owner notification on close** — Creates legal acknowledgment moment. Owner was informed, had opportunity to review, decision to act on outputs was theirs. Never remove this notification.

**Audit trail** — Every decision logged and explainable. If something goes wrong, exact cause is traceable. Both original and corrected versions of any close preserved.

**Pro tier human review** — Qualified accountants review before close on highest tier. Stronger accuracy guarantee. Justifies premium pricing.

### YC Answer on Liability

"We have four layers of accuracy architecture that make errors extremely rare. Our audit trail means we can identify exactly what happened and why. Our ToS positions us as a software tool — the same standard the entire accounting software industry operates on. Our owner notification creates a legal acknowledgment moment. And our Pro tier includes human accountant review for clients who need the strongest guarantee."

---

## 15. Pricing

### Philosophy

Price to value, not cost. Organizations currently pay $500-$3,000/month for bookkeepers, accounting firms, or finance staff. Xenboox must be obviously cheaper while delivering equal or better output.

### Tiers

| Plan    | Price      | Entities          | Users     | Key Features                                                                          |
| ------- | ---------- | ----------------- | --------- | ------------------------------------------------------------------------------------- |
| Free    | $0         | 1                 | 2         | Core modules, 100 transactions/month, basic reports                                   |
| Starter | $19/month  | 1                 | 5         | All modules, 500 transactions, mobile app, email delivery                             |
| Growth  | $39/month  | 5                 | 15        | Everything + multi-entity, desktop app, donor reporting, budget module                |
| Pro     | $99/month  | Unlimited         | Unlimited | Everything + human accountant review, audit preparation, API access, priority support |
| Firm    | $149/month | Unlimited clients | Unlimited | Everything Pro + firm dashboard, client switcher, white-label option                  |

### Free Tier Philosophy

Free tier exists to:

- Build user base in markets where $19/month is a real barrier
- Generate word of mouth
- Capture data and insights from The Gambia launch
- Create switching costs before charging

Free tier is genuinely useful — not crippled. Limited by transaction volume and user count, not by crippling feature removal.

### Trial

14-day free trial of Growth plan. No credit card required. Full close withheld until paid — prevents "one close and cancel" abuse while demonstrating full value.

### Long-Term Revenue

- Overage fees above transaction limits
- Add-on modules for specialized verticals
- API access for developers building on Xenboox data
- White-label for accounting firms
- Anonymized financial benchmarking data (long-term)

---

## 16. Competitive Landscape

### The Gap

Every serious competitor was built for Western markets targeting VC-backed tech startups. No competitor has built a full-stack, AI-native accounting platform for SMEs with mobile money as a first-class rail, cash and imprest management, local tax compliance, and donor reporting. This market is genuinely open.

### Competitors

| Competitor | Strength                       | Weakness vs Xenboox                                                |
| ---------- | ------------------------------ | ------------------------------------------------------------------ |
| QuickBooks | Market dominance, integrations | Tool not workforce, not built for SMEs, no mobile money, no agents |
| Xero       | Clean UX, global               | Same as QuickBooks — operator required, not SME-native             |
| Sage       | SME presence                   | Expensive, legacy architecture, no AI agents                       |
| Pilot      | Human + AI hybrid              | US only, QuickBooks dependent, VC startups only, $299+             |
| Digits     | AI-native                      | US only, startup focused, $250+                                    |
| Zeni       | AI + humans                    | US only, $549+, VC startups only                                   |
| Wave       | Free bookkeeping               | No AI agents, limited features, shutting down international        |

### Xenboox Differentiators

1. **Agentic workforce not tool** — agents do the work, humans manage
2. **SME-native** — mobile money, cash/imprest, local tax, local currencies built in
3. **Full stack** — 20 modules, not a narrow solution
4. **Every surface** — web, mobile, desktop
5. **Every organization size** — SME to corporation on one platform
6. **Universal document ingestion** — Excel, PDF, Word, images, email — any format
7. **Donor portal** — built for NGOs, no competitor has this properly
8. **24/7 internal audit** — Audit Agent runs continuously, not just at year end
9. **Price** — $19 entry vs $250-$549 for nearest AI-native competitors
10. **Free tier** — genuine value, not crippled

### Competitive Position Statement

"Xenboox is the first AI-native, full-stack accounting platform built for SMEs. Where QuickBooks requires a human operator, Xenboox deploys an autonomous agent workforce. Where Western competitors ignore mobile money, cash operations, and SME tax compliance, Xenboox was built natively for how SMEs actually operate. And where competitors charge $250-$549/month targeting Silicon Valley startups, Xenboox starts at $19/month for the organizations that need it most."

---

## 17. Distribution Strategy

### Phase 1 — The Gambia Launch

- Direct outreach to SMEs, NGOs, and corporations in Banjul and Greater Banjul Area
- Founder's personal network — the unfair advantage of knowing the market
- Accounting firms — each firm brings multiple clients
- NGO networks — development sector has tight community, word spreads fast
- Government adjacent bodies — committees, agencies, parastatals

### Phase 2 — West Africa Expansion

- Nigeria: fintech communities, SME associations, accounting firm networks
- Ghana: business associations, NGO sector, growing startup ecosystem
- Senegal: French language support, development sector, OHADA accounting standard compliance

### Long-Term

- Accounting firm partnerships — each firm is a distribution multiplier
- API ecosystem — developers building on Xenboox
- Referral program — finance directors recommend to peers
- Content marketing — accounting education for SMEs

---

## 18. Tech Stack (Locked)

### Web Platform

```
Frontend          Next.js 15 + TypeScript
UI Components     Shadcn/ui + Tailwind
API Layer         tRPC
Auth              Auth.js v5
Database          Neon PostgreSQL
ORM               Drizzle ORM
Agent Framework   LangGraph (JS)
LLM               Frontier & open-source frontier models (model-agnostic layer)
Job Queue         Trigger.dev
Banking Data      Plaid (where available) + PDF upload
Integrations      Merge.dev (QuickBooks + Xero)
E-commerce        Shopify API + Amazon SP-API
Storage           Cloudflare R2
Email             Resend
Deployment        Vercel
Observability     LangFuse
```

### Mobile Application

```
Framework         React Native (Expo)
Language          TypeScript
UI                React Native Paper + NativeWind (Tailwind for RN)
Navigation        Expo Router
State             Zustand + tRPC (shared API layer)
Auth              Expo Auth Session (shares Auth.js v5 backend)
Local Storage     SQLite via expo-sqlite
Camera/OCR        expo-camera + Claude Vision API (fallback)
Push Notifications Expo Notifications
Deployment        iOS (App Store) + Android (Google Play)
```

### Desktop Application

```
Shell             Tauri
Backend           Rust
Frontend          React + Shadcn/Tailwind (shared with web)
Local Database    SQLite via sqlx
Document Parsing  Rust (all formats)
OCR               Tesseract (local) + Claude Vision API (fallback)
Encryption        AES-256 via Rust crypto
File Watching     Rust notify crate
Deployment        Windows (.msi) + Mac (.dmg)
```

### Model Cost Strategy

- claude-haiku-4-5 — transaction categorization, simple matching, routine worker agent tasks
- claude-sonnet-4-6 — reconciliation, anomaly detection, report generation, complex reasoning, all management and strategic agent decisions

### Key Stack Decisions

- **LangGraph over CrewAI** — stateful graph maps perfectly to three-tier hierarchy. Native human-in-the-loop matches approval flow.
- **LangFuse over LangSmith** — open source, self-hostable, better cost at scale
- **Merge.dev** — one API for QuickBooks and Xero, saves weeks of integration work
- **Trigger.dev** — agent workflows are long-running. API routes timeout. Non-negotiable.
- **Tauri over Electron** — lean Rust core, lower memory, better security model
- **Agents in cloud always** — desktop app is local interface only, agent logic never on device

### Future Stack

- Go backend — when specific measured performance bottlenecks require it
- Eino — Go-native agent framework, revisit with Go backend
- Cloudflare Durable Objects — real-time dashboard state at scale

---

## 19. Security and Compliance

### Data Security

- AES-256 encryption at rest for all financial data
- TLS 1.3 for all data in transit
- Row-level security in PostgreSQL — entity isolation at database layer
- Desktop app: AES-256 local encryption, scoped file system permissions
- No financial data leaves device unencrypted

### Access Control

- Role-based access control — strict, no exceptions
- Entity-level scoping — users only see their permitted entities
- Payroll data additionally scoped — only Payroll Officer and Finance Director
- External auditors: read-only, period-locked, no current data access
- All access logged in audit trail

### Compliance Roadmap

- SOC 2 Type II — target within 12 months of launch
- GDPR compliance for any EU-touching operations
- Local data residency options as markets require
- Regular penetration testing — quarterly target post-Series A

### Liability Protection

- ToS positions Xenboox as software tool, not licensed firm
- Owner notification on close creates legal acknowledgment
- Full audit trail for every decision
- Pro tier includes human accountant review

---

## 20. Build Phases

### Phase 1 — MVP (Launch in Gambia)

Build this, nothing more, before first user:

**Must have:**

- Auth, organization and entity setup, user roles
- General Ledger and Chart of Accounts
- Bank reconciliation — PDF statement upload
- Mobile money — Wave statement import
- AP and AR basic flows
- Cash and Imprest management
- Month-end close — autonomous trigger
- Basic financial reporting — P&L, balance sheet, trial balance
- Email delivery of close report
- Basic dashboard
- CFO Agent chat interface
- Document upload and OCR extraction
- Multi-currency with daily exchange rates

**Agent workforce for MVP:**

- CFO Agent (orchestrator)
- Controller Agent (management)
- Treasury Agent (management)
- Ledger Agent (worker)
- Reconciliation Agent (worker)
- Cash Agent (worker)
- Mobile Money Agent (worker)
- AP Agent (worker)
- AR Agent (worker)
- Reporting Agent (platform)
- Document Agent (platform)

11 agents for MVP. Full 19-agent workforce in Phase 2.

### Phase 2 — Depth (3-6 months post launch)

- Payroll module + Payroll Manager Agent + Payroll Worker Agent
- Tax compliance + Tax Agent + Compliance Agent
- Audit preparation + Audit Agent
- Expense management + Expense Agent
- Invoicing module
- Fixed assets + Asset Agent
- Budget module + Budget Agent
- Analytics + Analytics Agent
- Mobile app (iOS and Android)
- Donor and grant reporting
- Auditor portal
- Donor portal

### Phase 3 — Scale (6-12 months post launch)

- Desktop application (Tauri)
- Inventory module + Inventory Agent
- Multi-entity and consolidation
- Accounting firm dashboard and client switcher
- Nigeria tax compliance (FIRS)
- Ghana tax compliance (GRA-GH)
- API for third-party integrations
- White-label for accounting firms
- Advanced analytics and benchmarking

---

## 21. What Is Still Undecided

- **First beta user** — not yet acquired. Priority before or immediately after first working demo.
- **CPA/accountant partner network** — needed for Pro tier human review. Not yet sourced.
- **Dollar threshold for human approval** — what transaction amount triggers mandatory owner sign-off. Determined from beta user feedback.
- **OHADA compliance** — accounting standard used across Francophone West Africa. Required for Senegal expansion. Not yet researched in detail.
- **YC application** — all answers ready from this document. Not yet written.
- **Mobile money API access** — Wave, Orange Money API availability and terms for The Gambia. Needs direct outreach to providers.

---

## 22. Founder Insight (YC Unfair Advantage)

The founder has direct, lived-in domain knowledge of SME accounting pain:

- Helped family member manage treasurer responsibilities for a Gambian town development committee
- Hands-on experience with invoice reconciliation, imprest management, and period-end close
- Ground-level understanding of how SMEs actually handle cash, mobile money, and manual reconciliation
- This is not academic knowledge — it is operational insight no Silicon Valley competitor has

This directly informed the product: the Cash and Imprest module, mobile money as a first-class rail, the plain-English summary for non-accountant owners, the four-layer accuracy architecture, and the understanding that SMEs need accounting infrastructure built for them — not Western tools retrofitted.

---

## 23. Why Now

- LLM capability crossed a threshold in 2024-2025 making reliable autonomous multi-step financial workflows possible for the first time
- Agent infrastructure matured — tool use, memory, multi-agent coordination production-ready
- Inference costs have dropped — deploying a specialized agent workforce per organization is economically viable at $19/month price points
- Formalization pressure is increasing globally — tax enforcement tightening, donor accountability requirements growing, bank loan requirements demanding proper financial statements
- Mobile money infrastructure is mature across emerging markets — providers like Wave, M-Pesa, and MTN MoMo have tens of millions of users across Africa
- No serious AI-native competitor is targeting SME accounting globally — the market is wide open
- Bench shut down December 2024 — created massive trust damage in AI accounting broadly, opening for a reliability-first product that takes accuracy seriously

---

_Document version: v1.0 — Complete Platform PRD_
_Last updated: July 2026_
_Company: Xenboox_
_Authors: Founder + Claude (co-founder sessions)_
_Next session: YC Application_
