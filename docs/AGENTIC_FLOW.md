# Xenboox Agentic Flow

## 3-Tier Hierarchy

```mermaid
flowchart TD
    Human["👤 Human User"]

    subgraph Tier1["Tier 1 — Strategic"]
        CFO["🧠 CFO Agent<br/>Sonnet 4.6<br/>chat, question, close_trigger"]
    end

    subgraph Tier2["Tier 2 — Management (Department Heads)"]
        Controller["📊 Controller Agent<br/>Sonnet 4.6<br/>GL Integrity"]
        Treasury["💰 Treasury Agent<br/>Sonnet 4.6<br/>Cash & Banking"]
        PayrollMgr["👔 Payroll Manager<br/>Sonnet 4.6<br/>Payroll"]
        Compliance["⚖️ Compliance Agent<br/>Sonnet 4.6<br/>Tax & Audit"]
    end

    subgraph Tier3a["Tier 3 — Controller Dept Workers"]
        Ledger["📒 Ledger Agent*<br/>Sonnet 4.6<br/>GL Posting (Single Point of Entry)"]
        AP["📥 AP Agent<br/>Sonnet 4.6<br/>process_ap_invoice"]
        AR["📤 AR Agent<br/>Haiku+Sonnet<br/>ar_aging, match_payment"]
        Asset["🏦 Asset Agent<br/>depreciation, asset_register"]
        Inventory["📦 Inventory Agent<br/>cogs, inventory_summary"]
    end

    subgraph Tier3b["Tier 3 — Treasury Dept Workers"]
        Recon["🔄 Reconciliation Agent<br/>Sonnet 4.6<br/>bank_reconciliation"]
        Cash["💵 Cash Agent<br/>Haiku+Sonnet<br/>cash_count, imprest"]
        MobileMoney["📱 Mobile Money Agent<br/>Sonnet 4.6<br/>mm_reconcile, mm_ingest"]
        Expense["🧾 Expense Agent<br/>submit_expense, approve_expense"]
    end

    subgraph Tier3c["Tier 3 — Payroll Dept Workers"]
        PayrollWorker["⚙️ Payroll Worker<br/>calculate_paye, generate_payslip"]
    end

    subgraph Tier3d["Tier 3 — Compliance Dept Workers"]
        Audit["🔍 Audit Agent<br/>audit_sampling, anomaly_detection"]
        Tax["🏛️ Tax Agent<br/>tax_review, filing_status"]
    end

    subgraph Platform["Platform (Cross-Cutting)"]
        Reporting["📈 Reporting Agent<br/>report, narrative"]
        Document["📄 Document Agent<br/>Sonnet 4.6 + Haiku<br/>ingest, classify, extract"]
        Budget["📉 Budget Agent<br/>variance_analysis, forecast"]
        Analytics["📊 Analytics Agent<br/>ratios, kpi_dashboard, trends"]
    end

    %% Communication flows
    Human -->|instructions| CFO
    CFO -->|orchestrate| Controller
    CFO -->|orchestrate| Treasury
    CFO -->|orchestrate| PayrollMgr
    CFO -->|orchestrate| Compliance

    Controller -->|validate & dispatch| Ledger
    Controller -->|dispatch| AP
    Controller -->|dispatch| AR
    Controller -->|dispatch| Asset
    Controller -->|dispatch| Inventory

    Treasury -->|dispatch| Recon
    Treasury -->|dispatch| Cash
    Treasury -->|dispatch| MobileMoney
    Treasury -->|dispatch| Expense

    PayrollMgr -->|dispatch| PayrollWorker

    Compliance -->|dispatch| Audit
    Compliance -->|dispatch| Tax

    CFO -.->|use| Reporting
    CFO -.->|use| Document
    CFO -.->|use| Budget
    CFO -.->|use| Analytics

    Ledger -->|post to GL| Controller
    AP -->|journal entries| Controller
    AR -->|payment match| Controller
    Recon -->|reconciliation report| Treasury
    Cash -->|cash report| Treasury
    Expense -->|expense report| Treasury
    Audit -->|audit findings| Compliance
    PayrollWorker -->|payroll complete| PayrollMgr

    style CFO fill:#4F46E5,color:#fff
    style Controller fill:#7C3AED,color:#fff
    style Treasury fill:#059669,color:#fff
    style PayrollMgr fill:#D97706,color:#fff
    style Compliance fill:#DC2626,color:#fff
    style Ledger fill:#1E40AF,color:#fff,stroke:#fff,stroke-width:3px
    style Platform fill:#6B7280,color:#fff
```

---

## Communication Rules

```mermaid
flowchart LR
    subgraph Rules["Hard Rules"]
        R1["1. CFO is the ONLY agent<br/>that talks to humans"]
        R2["2. Workers NEVER talk<br/>to each other directly"]
        R3["3. Workers report to<br/>their department head"]
        R4["4. Department heads report<br/>to CFO Agent"]
        R5["5. Ledger Agent is the ONLY<br/>agent that posts to GL"]
    end
```

---

## Confidence-Based Escalation

```mermaid
flowchart LR
    Start["Agent Action"] --> Check{"Confidence?"}
    Check -->|≥ 0.7| Proceed["✅ Proceed normally"]
    Check -->|0.4 – 0.7| EscalateSup["⚠️ Escalate to supervisor"]
    Check -->|< 0.4| EscalateHuman["🛑 Escalate to human"]
```

---

## Month-End Close Flow

```mermaid
sequenceDiagram
    participant H as Human
    participant CFO as CFO Agent
    participant C as Controller
    participant T as Treasury
    participant P as Payroll Mgr
    participant Comp as Compliance
    participant L as Ledger Agent

    H->>CFO: Trigger month-end close
    CFO->>C: Fan out: close_checklist
    CFO->>T: Fan out: daily_report
    CFO->>P: Fan out: process_payroll
    CFO->>Comp: Fan out: filing_status

    par Parallel Execution
        C->>C: Run workers (AP, AR, Asset, Inventory)
        T->>T: Run workers (Recon, Cash, MobileMoney, Expense)
        P->>P: Run PayrollWorker
        Comp->>Comp: Run Audit, Tax
    end

    C-->>CFO: close_confirmation (clean/has_items/blocked)
    T-->>CFO: close_confirmation
    P-->>CFO: close_confirmation
    Comp-->>CFO: close_confirmation

    alt All clean (confidence ≥ 0.7)
        CFO->>H: Present for approval
        H->>CFO: Approved
        CFO->>L: Post final entries
        L-->>CFO: Posted
        CFO->>CFO: Trigger Reporting Agent
        CFO->>H: Month-end complete ✅
    else Any blocked or low confidence
        CFO->>H: Escalate for review ⚠️
    end
```

---

## Invoice Processing Flow (Example)

```mermaid
flowchart LR
    Doc["📄 Document Agent<br/>Ingest PDF"] --> AP["📥 AP Agent<br/>Match PO"]
    AP --> Controller["📊 Controller Agent<br/>Validate double-entry"]
    Controller --> Ledger["📒 Ledger Agent<br/>Post to GL"]
    Ledger --> Controller
    Controller --> CFO["🧠 CFO Agent<br/>Report to human"]
    CFO --> Human["👤 Human"]
```

---

## Observability Stack

```mermaid
flowchart TD
    Agent["Every Agent Action"] --> LangFuse["LangFuse<br/>Traces with confidence metadata"]
    Agent --> AgentActivity["agent_activity table<br/>tier, agent_id, confidence, trace_id"]
    Agent --> AuditLog["audit_log table<br/>SHA-256 hash chain, append-only"]

    LangFuse --> Dashboard["Admin Dashboard<br/>/admin/agent-monitor"]
    AgentActivity --> Dashboard
    AuditLog --> ActivityPage["/dashboard/activity<br/>Tiered visibility (owner/admin/member)"]
```

---

## State Machine: Month-End Close

```mermaid
stateDiagram-v2
    [*] --> not_started
    not_started --> collecting_confirmations: CFO triggers close
    collecting_confirmations --> awaiting_human_approval: All depts clean (≥0.7)
    collecting_confirmations --> [*]: Any blocked / <0.7 → escalate to human
    awaiting_human_approval --> approved: Human approves
    awaiting_human_approval --> [*]: Human rejects
    approved --> closing: Ledger posts entries
    closing --> closed: All posted
    closed --> reopened: Human flags error
    reopened --> collecting_confirmations: Re-run close
```

---

## Department → Agent Mapping

| Department          | Tier 2 Head           | Tier 3 Workers                                                      |
| ------------------- | --------------------- | ------------------------------------------------------------------- |
| **controller**      | Controller Agent      | Ledger Agent\*, AP Agent, AR Agent, Asset Agent, Inventory Agent    |
| **treasury**        | Treasury Agent        | Reconciliation Agent, Cash Agent, Mobile Money Agent, Expense Agent |
| **payroll_manager** | Payroll Manager Agent | Payroll Worker Agent                                                |
| **compliance**      | Compliance Agent      | Audit Agent, Tax Agent                                              |

_\* The Ledger Agent is a special Tier 3 worker that reports to the Controller Agent but is NOT part of any department — it is the single point of entry to the GL._

---

## Model Assignment

| Tier                | Model              | Purpose                                |
| ------------------- | ------------------ | -------------------------------------- |
| Tier 1 (CFO)        | Sonnet 4.6         | Strategic decisions, human interaction |
| Tier 2 (Dept Heads) | Sonnet 4.6         | Management, quality gates              |
| Tier 3 (Workers)    | Haiku / Sonnet mix | Execution, sub-ledger operations       |
| Platform            | Sonnet 4.6         | Shared services                        |

---

_View this file in a Mermaid-compatible renderer (GitHub, VS Code with Mermaid plugin, or https://mermaid.live) to see the diagrams._
