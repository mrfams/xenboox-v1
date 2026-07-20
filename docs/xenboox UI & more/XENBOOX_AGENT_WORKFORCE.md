# XENBOOX — Agent Workforce & Orchestration Spec

> Engineering handoff doc. Companion to XENBOOX_PRD.md, XENBOOX_UI_SPEC.md, XENBOOX_SYSTEM_ARCHITECTURE.md, XENBOOX_ACCOUNTING_RULES_ENGINE.md, XENBOOX_DATA_INGESTION.md, XENBOOX_SECURITY_ACCESS_AUDIT.md.
> This is the brain — the actual "accounting department." It decides what to do with ingested data (doc #5), using validated calculations (doc #4), writing to the schema (doc #2), within the guardrails (doc #6). This doc is last because it's the only one that needs all four others to have something real to orchestrate.
> Version: v1.0 | Last updated: July 2026

---

## 1. Purpose and Boundary

This doc owns **judgment**: which agent does what, when to escalate, how confident is confident enough, how agents talk to each other. It does not calculate accounting math (doc #4 does that — agents call into it) and does not decide raw data validity (doc #5 does that — agents receive already-structured input). Agents are consumers of the other four specs, not reimplementations of them.

```
Agent receives structured input (doc #5 output)
        │
        ▼
Agent applies judgment: what does this mean, what should happen
        │
        ▼
Agent calls Rules Engine (doc #4) to validate/calculate
        │
        ▼
Agent writes result via Architecture's DB layer (doc #2), scoped per Security constraints (doc #6)
        │
        ▼
Confidence check → auto-complete OR escalate (this doc's core logic)
```

---

## 2. LangGraph Architecture Mapping

Per PRD Section 6.2, the three-tier hierarchy maps directly to a LangGraph graph structure:

```
CFO Agent            = root orchestrator node, holds routing logic to 4 department-head subgraphs
Controller/Treasury/
Payroll Mgr/Compliance = 4 subgraph entry nodes, each owns a set of worker-agent nodes
Worker agents          = leaf nodes, each a focused tool-calling agent with narrow scope
Platform-wide agents   = separate subgraphs invoked directly by CFO Agent (Reporting, Budget,
                          Analytics, Document) — not nested under a department head
```

- Each tier is a distinct LangGraph subgraph, not one flat graph — this mirrors PRD's "no bottleneck" principle structurally: worker-to-CFO communication is never direct, it must pass through the department head subgraph boundary
- State passed between tiers is a **summary object**, not raw transaction data — department heads compress before passing up, enforced by schema (Section 5 below), not by convention

---

## 3. Agent Roster — Inputs, Outputs, Calls

For each agent: what triggers it, what it reads, what it calls into (docs #4/#5), what it writes, what makes it escalate. MVP agents (11, per PRD Section 20) marked **[MVP]**.

### Tier 1 — Strategic

**CFO Agent [MVP]**

- Trigger: human chat message, scheduled close sequence, department head escalation
- Reads: department head summaries only, never raw transactions
- Calls: routes to department heads/platform agents, never calls Rules Engine directly (has nothing to calculate — it's a router + communicator)
- Writes: `agent_actions` (its own routing decisions), chat responses, executive summaries
- Escalates to human: strategic anomalies, close sign-off, any department head escalation it can't resolve by routing to another department head

### Tier 2 — Management

**Controller Agent [MVP]**

- Trigger: any worker-agent output under its oversight (Ledger, AP, AR, Asset, Inventory)
- Reads: worker outputs, `ledger_periods` status
- Calls: `checkCloseReadiness()` (Rules Engine, doc #4 Section 7) for its portion of close conditions
- Writes: reviewed/approved journal entries move from pending to confirmed state, trial balance confirmations
- Escalates to CFO Agent: material discrepancies, close blockers Controller can't resolve itself

**Treasury Agent [MVP]**

- Trigger: Reconciliation/Cash/Mobile Money/Expense agent output
- Reads: bank/mobile money/cash transaction states
- Calls: `matchReconciliation()` (Rules Engine) results review
- Writes: daily treasury position report, reconciliation completion confirmation
- Escalates to CFO Agent: cash risk, unresolved reconciliation items past a time threshold
- **Hard rule inherited from Rules Engine:** never marks reconciliation complete with unresolved items — this isn't Treasury Agent's judgment call, it's a Rules Engine gate it cannot override

**Payroll Manager Agent** _(Phase 2)_

- Trigger: Payroll Worker Agent monthly calculation output
- Calls: statutory deduction validation (jurisdiction rules, doc #4 territory once payroll rules are added there)
- Escalates to CFO Agent: payroll exceptions requiring policy judgment (new starters, disputed deductions)

**Compliance Agent** _(Phase 2)_

- Trigger: filing deadline calendar, Tax/Audit agent output
- Escalates to CFO Agent and human: regulatory risk, immediately — no batching, per PRD

### Tier 3 — Workers (under Controller)

**Ledger Agent [MVP]**

- Trigger: any agent needing to post a journal entry
- Calls: `postJournalEntry()` — **every** posting in the system goes through this one agent, per PRD "no other agent posts directly to the ledger"
- This agent is the enforcement point that makes the Rules Engine's Layer 1 constraints actually load-bearing in practice, not just theoretically available
- Escalates: Rules Engine validation failure (should be rare/impossible if upstream agents are well-behaved, but this is the backstop)

**AP Agent [MVP]**

- Trigger: `documents` row with `detected_type = invoice/bill` reaching `agent_processing` status (doc #5 output)
- Calls: supplier matching logic, PO matching, hands final entry to Ledger Agent
- Escalates to Controller Agent: no PO match found, supplier not recognized, amount anomaly vs history

**AR Agent [MVP]**

- Trigger: invoice creation request (human or scheduled recurring), payment received on bank/mobile money feed
- Calls: customer matching, hands final entry to Ledger Agent
- Escalates to Controller Agent: payment doesn't match any open invoice within tolerance

**Asset Agent** _(Phase 3)_ — calls `calculateDepreciation()`, escalates on disposal/write-off decisions
**Inventory Agent** _(Phase 3)_ — calls COGS/valuation functions, escalates on stock discrepancies beyond tolerance

### Tier 3 — Workers (under Treasury)

**Reconciliation Agent [MVP]**

- Trigger: new `bank_transactions`/`mobile_money_transactions` rows
- Calls: `matchReconciliation()` (Rules Engine)
- Escalates to Treasury Agent: unmatched items past a defined age, ambiguous multi-candidate matches

**Cash Agent [MVP]**

- Trigger: cash transaction entry (cashier-submitted), daily reconciliation schedule
- Calls: imprest math validation (Rules Engine Section 4.2)
- Escalates to Treasury Agent: discrepancy beyond tolerance, overdue imprest retirement

**Mobile Money Agent [MVP]**

- Trigger: mobile money statement ingestion (doc #5 output) or API feed event
- Calls: `matchReconciliation()` with mobile-money-specific tolerance window
- Escalates to Treasury Agent: timing differences beyond the settlement-lag window

**Expense Agent** _(Phase 2)_ — policy compliance checking against configured limits, routes to Department Manager for approval, escalates policy violations

### Tier 3 — Workers (under Payroll Manager) _(Phase 2)_

**Payroll Worker Agent** — calculates gross/net/statutory deductions per jurisdiction rules, escalates exceptions to Payroll Manager Agent

### Tier 3 — Workers (under Compliance) _(Phase 2)_

**Tax Agent** — VAT/PAYE/withholding calculation, jurisdiction export formatting
**Audit Agent** — continuous sampling against golden dataset (Rules Engine doc Section 10), independent cross-check of Ledger Agent outputs — deliberately runs its calculations independently rather than trusting Ledger Agent's math, so it can catch systemic errors, not just flagged ones

### Platform-wide (report directly to CFO Agent)

**Reporting Agent [MVP]**

- Trigger: scheduled report generation, on-demand chat request, close sequence
- Reads: ledger state via `report_snapshots` generation queries
- Writes: `report_snapshots`, plain-English summaries
- Does not escalate in the traditional sense — its "escalation" is simply surfacing a report; CFO Agent decides what to do with it

**Budget Agent** _(Phase 2)_ — variance analysis, escalates budget overruns to relevant Department Manager + CFO Agent
**Analytics Agent** _(Phase 2)_ — anomaly/fraud pattern detection, escalates suspicious patterns to Compliance Agent per PRD
**Document Agent [MVP]** — this is the agent-layer counterpart to doc #5's pipeline; it's the agent that receives `synced` status documents and routes them to the correct downstream worker agent (AP/AR/Reconciliation) based on `detected_type`

---

## 4. Confidence Threshold System (implements Rules Engine Layer 3, PRD Section 6.7)

### 4.1 Scoring

- Every agent output (not just document extraction, per doc #5 — this extends to every _decision_, e.g. "this is the right supplier match") carries a `confidence_score` 0.0–1.0
- Score derives from: model's own calibrated confidence, plus deterministic signals where available (e.g. exact amount match = high confidence boost, fuzzy name match = lower)

### 4.2 Thresholds (starting defaults, tunable per entity/module post-launch)

```
≥ 0.90  → auto-complete, log to agent_actions, visible in activity feed only
0.70–0.89 → auto-complete but flagged amber, appears in a "recently auto-approved, review if needed" view
< 0.70  → does not auto-complete, routes to approvals table, blocks until human or superior agent resolves
```

- Dollar-threshold override: regardless of confidence score, any transaction above a configurable dollar amount requires human approval — this is the "Dollar threshold for human approval" item flagged as undecided in PRD Section 21; engine supports the config, actual number is a business decision to set from beta feedback, not an engineering blocker
- **CFO Agent escalations and month-end close sign-off always require human approval regardless of confidence score** — no confidence level bypasses this, per PRD Section 6.7 Layer 4

### 4.3 Never Guess Silently

- Below-threshold outputs are never written as if they were confident — the `approvals` row makes the uncertainty visible and blocking, not a soft warning buried in a log

---

## 5. Agent-to-Agent Communication

### 5.1 Summary Object Schema (worker → department head → CFO)

```
{
  agent_name, entity_id, period_or_date_range,
  items_processed: count,
  items_auto_completed: count,
  items_flagged: count,
  items_escalated: count,
  material_flags: [ { summary, confidence, link_to_detail } ],
  status: 'clean' | 'attention_needed' | 'blocked'
}
```

- This is what "1,000 daily transactions never hit the CFO Agent directly" (PRD Section 6.1) means concretely — the CFO Agent's context window only ever contains objects shaped like this, never raw transaction lists
- Department heads are responsible for compression; if a department head's summary starts exceeding a reasonable size (i.e., too many material_flags), that's itself a signal something systemic is wrong, worth its own monitoring alert

### 5.2 Disagreement Handling

- Per PRD Section 6.7 Layer 2: disagreements between agents trigger escalation, not a coin-flip or silent pick
- Example: Reconciliation Agent finds a match Treasury Agent's review disputes → does not auto-resolve by re-running, escalates to CFO Agent with both positions stated, CFO Agent either decides or (more likely, since it's not itself expert in reconciliation) surfaces to human with both agent positions shown

---

## 6. Human Escalation Patterns

Maps directly to the Approval Card UI pattern (UI spec Section 0) — every escalation type below produces one of these cards.

| Escalation type                            | Raised by                         | Goes to                                                                             |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| Low-confidence match/categorization        | Worker agent                      | Department head first, human if department head also uncertain                      |
| Above dollar threshold                     | Any posting agent                 | Direct to human approval queue                                                      |
| Reconciliation unresolved past age limit   | Reconciliation/Mobile Money Agent | Treasury Agent → human if unresolved further                                        |
| Close readiness blocked                    | Controller/Treasury/Compliance    | CFO Agent → human                                                                   |
| Strategic anomaly (cash risk, trend break) | Analytics Agent                   | CFO Agent → human directly (bypasses department heads, since this is cross-cutting) |
| Fraud pattern                              | Analytics Agent                   | Compliance Agent → human, always, no auto-resolution path ever                      |
| Agent disagreement                         | Either disagreeing agent          | Next tier up → human if unresolved at CFO Agent level                               |

---

## 7. Model Assignment (per PRD Section 18, locked)

```
claude-haiku-4-5   → Worker-tier routine tasks: transaction categorization, simple matching,
                      OCR field extraction assist, routine reconciliation matching
claude-sonnet-4-6  → Management-tier and above: reconciliation judgment calls, anomaly detection,
                      report generation/narrative, all CFO Agent reasoning, disagreement resolution
```

- This split is a cost-discipline decision already locked — do not upgrade worker-tier tasks to Sonnet without a measured accuracy problem justifying it, and do not downgrade CFO Agent reasoning to Haiku under any circumstances (strategic judgment quality matters more than cost at that tier)

---

## 8. Testing — Golden Dataset Integration

- Every agent's decisions are scored against the golden dataset (Rules Engine doc Section 10) — this is Audit Agent's job in production, but in **pre-production testing**, every agent in this roster needs its own test suite: known input → expected decision/confidence/escalation behavior
- Regression suite runs before every deploy touching agent logic — a change to AP Agent's matching logic must not silently change Ledger Agent's posting behavior; agents are tested individually and as full chains (document → AP Agent → Ledger Agent → Controller Agent)

---

## 9. MVP Build Scope (reiterating PRD Section 20, now with full spec behind it)

11 agents for MVP: CFO, Controller, Treasury, Ledger, Reconciliation, Cash, Mobile Money, AP, AR, Reporting, Document.

**What "done" looks like for MVP agent workforce:** one real entity's documents flow from Document Inbox (doc #5) → Document Agent classifies → correct worker agent (AP/AR/Reconciliation/Cash/Mobile Money) processes → Ledger Agent posts via Rules Engine (doc #4) → Controller/Treasury confirm → close readiness check passes → Reporting Agent produces close package → CFO Agent notifies owner — without you manually intervening at any step for a normal transaction.

---

## 10. What This Doc Deliberately Does NOT Cover

- Accounting math itself → **doc #4**
- How raw documents become structured input → **doc #5**
- Schema/table definitions → **doc #2**
- Permission enforcement, encryption, audit log schema → **doc #6** (this doc only defines the guardrails agents must respect, not how they're enforced)

---

## 11. All Six Docs — Final Map

```
1. UI/UX Spec                    — what the human sees and does
2. System Architecture           — the schema and pipes everything runs through
3. Agent Workforce (this doc)    — the judgment layer, the "department"
4. Accounting Rules Engine       — the math and validation every agent must obey
5. Data Ingestion & Integrations — how external data becomes structured input
6. Security, Access & Audit      — who can do what, and the provable record of everything
```

Every one of these six references the others by number rather than duplicating content — hand all six to your build agents together so cross-references resolve, not one at a time in isolation.

---

_Companion to XENBOOX_PRD.md Section 6 (The Agent Workforce) in full._
_This is the sixth and final document in the initial spec set._
