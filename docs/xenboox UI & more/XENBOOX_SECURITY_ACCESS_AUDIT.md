# XENBOOX — Security, Access Control & Audit Trail Spec

> Engineering handoff doc. Companion to XENBOOX_PRD.md, XENBOOX_UI_SPEC.md, XENBOOX_SYSTEM_ARCHITECTURE.md, XENBOOX_ACCOUNTING_RULES_ENGINE.md, XENBOOX_DATA_INGESTION.md.
> This is what makes Xenboox legally and practically trustworthy with someone else's financial data. Every other doc's writes must pass through this layer's constraints. Nothing here is deferrable to "later" — it has to exist before a real business's data touches the system.
> Version: v1.0 | Last updated: July 2026

---

## 1. Purpose and Boundary

This doc owns **who can see/do what, where every byte is protected, and how every action becomes provably explainable after the fact.** It does not own accounting correctness (doc #4) or agent decision logic (doc #3) — it owns the perimeter and the paper trail around all of it.

```
Every request (human or agent) → Auth check → Role/permission check → Entity scope (RLS) → Action executes → Audit trail write
                                                    THIS DOC OWNS THE WHOLE CHAIN
```

---

## 2. Role-Based Access Control — Full Permission Matrix

Ten user types per PRD Section 10, mapped to concrete permissions. This is the authoritative matrix — the `role` enum in `user_entity_access` (Architecture doc Section 2.1) implements exactly this.

| Role                      | Scope                                                               | Can View                                                                    | Can Edit/Post                           | Cannot                                                                                   |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Org Owner**             | All entities in org                                                 | Everything, consolidated                                                    | Billing, entity/user management         | Post journal entries directly, approve own expenses                                      |
| **Org Admin**             | All entities in org                                                 | Everything except billing                                                   | User management                         | Access billing                                                                           |
| **Finance Director**      | Assigned entity(s)                                                  | Full finance dashboard, all reports, agent reasoning                        | Approvals, settings within entity       | Change system settings, add/remove users, access billing                                 |
| **Accountant/Bookkeeper** | Assigned entity, domain-scoped                                      | Their module's transactions, exceptions, documents                          | Their domain's records                  | Other departments without grant, payroll details, own expense approval                   |
| **Payroll Officer**       | Assigned entity, payroll only                                       | Full salary/staff data                                                      | Payroll runs, payslips                  | Anything outside payroll module                                                          |
| **Cashier**               | Assigned entity, cash only                                          | Cash tills, imprest records                                                 | Cash transactions, imprest issue/retire | Anything outside cash module                                                             |
| **Department Manager**    | Assigned entity, department-scoped (`scope_meta.department`)        | Their dept budget, team expense claims                                      | Approve/reject their team's claims      | Anything outside their department                                                        |
| **Employee**              | Assigned entity, self-scoped                                        | Their own claims, reimbursement history                                     | Submit new claims                       | See anything else in the system                                                          |
| **External Auditor**      | Assigned entity, period-locked (`scope_meta.period_lock`)           | Read-only: trial balance, schedules, documents, query log for locked period | Nothing — read-only                     | Post anything, see current period if auditing prior, full payroll without specific grant |
| **External Accountant**   | Multi-client (their own `organization_id` spanning client entities) | Full access equivalent to Finance Director, per client                      | Full, per client                        | Cross-client data leakage (each client entity isolated regardless of same accountant)    |
| **Donor/Funder**          | Assigned entity, project-scoped (`scope_meta.grant_id`)             | Read-only: budget vs actual for their grant/project only                    | Nothing                                 | See any data outside their specific grant                                                |

**Enforcement layers (defense in depth, all three required, not either/or):**

1. Application-layer: `roleCheckMiddleware` on every tRPC procedure (Architecture doc Section 4.2)
2. Database-layer: Postgres RLS policies keyed on `entity_id` AND `role` where applicable (e.g. payroll tables have an additional RLS predicate beyond entity scope)
3. Agent-layer: every agent action carries the `entity_id` it's scoped to and cannot be invoked cross-entity even if instructed to (agent sandboxing detail lives in doc #3, but the constraint originates here)

### 2.1 Special Case — Payroll Data

- Additional RLS predicate beyond standard entity scoping: only `payroll_officer` and `finance_director` roles (plus org owner/admin) can query `staff`, `payroll_runs`, `payslips` tables, even within an entity they otherwise have access to
- `bank_details_encrypted` field (Architecture doc Section 3.4) uses field-level encryption, not just table-level RLS — even a payroll officer's queries decrypt only on authorized read paths, not raw DB access

### 2.2 Special Case — External Auditor Period Lock

- `scope_meta.period_lock` defines the exact end-date the auditor is scoped to
- Any query attempting to return data dated after that period is rejected at the RLS layer, not filtered at the application layer (prevents any API bug from leaking current-period data)

---

## 3. Encryption

| Layer                              | Standard                | Notes                                                                                                                                   |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Data at rest (DB)                  | AES-256                 | Neon PostgreSQL native encryption + field-level encryption for high-sensitivity fields (bank details, national ID numbers if collected) |
| Data at rest (documents, R2)       | AES-256                 | Per Architecture doc Section 7 — private buckets, signed URLs only                                                                      |
| Data at rest (desktop local cache) | AES-256 via Rust crypto | Per PRD Section 7.3 — local SQLite cache never stores unencrypted financial data                                                        |
| Data in transit                    | TLS 1.3                 | All client-server, server-agent, server-integration traffic                                                                             |
| Secrets/API keys                   | Vault/env-managed       | Never in code, never in client bundles, rotated on a defined schedule                                                                   |

**Principle: no financial data leaves any device or service unencrypted, at any point** (PRD Section 19).

---

## 4. Audit Trail — Full Specification

The `audit_trail` table (Architecture doc Section 3.8) is defined at schema level there; this section defines what must be logged, when, and why, satisfying PRD Section 6.7 Layer 4.

### 4.1 What Gets Logged (mandatory, no exceptions)

- Every journal entry post/reversal — what, by which agent or user, confidence score, timestamp
- Every approval queue resolution — approved/rejected, by whom, reasoning if provided
- Every period close and reopen — full before/after state, reason for reopen
- Every role/permission change
- Every document ingestion and classification decision
- Every login and entity-switch event (for security forensics, not just accounting)
- Every agent escalation — what triggered it, which threshold was crossed

### 4.2 What Each Entry Contains

```
actor_type       (agent | user)
actor_id         (specific agent name or user_id)
action           (human-readable + machine action_type)
entity_affected  (which record: journal_entry_id, approval_id, etc.)
before_state     (jsonb snapshot, null for creates)
after_state      (jsonb snapshot)
confidence_score (for agent actions)
timestamp
entity_id        (standard scoping)
```

### 4.3 Immutability

- `audit_trail` rows are append-only — no update, no delete, enforced at the database permission level (the application's DB role should not have UPDATE/DELETE grants on this table, full stop)
- This is what makes "both original and corrected versions of any close are preserved" (PRD Section 8, 14) actually true rather than aspirational

### 4.4 Exportability

- Full audit trail exportable per entity, per period, on demand (PDF/CSV) — required for external auditor engagements and for the Pro-tier accountant review
- External Auditor role (Section 2) gets a **read-only portal view** of this same data, period-locked, rather than a raw export, to prevent bulk exfiltration of data outside their engagement scope

---

## 5. Legal/Trust Mechanisms (implementation of PRD Section 14)

These are product behaviors with legal weight — engineering must treat them as functional requirements, not copy details.

### 5.1 Owner Notification on Close

- On every close completion, a notification (email + in-app) is sent to the Org Owner and Finance Director — this is a **required send**, not a toggleable preference, because it's the legal acknowledgment moment described in PRD Section 14
- The notification content and send event itself is logged to `audit_trail` — proof the notification occurred is as important as the notification itself

### 5.2 ToS Acceptance

- Recorded at signup with timestamp, ToS version hash — if ToS is updated, re-acceptance is required and logged before continued use
- Positions Xenboox as a software tool per the liability framing in PRD Section 14 — this is a legal/product decision already locked, engineering just needs the acceptance event to be provably logged

### 5.3 Pro-Tier Human Review Gate

- For Pro-tier entities, close cannot reach "auto-triggered" status (Rules Engine doc Section 7) without an additional `human_reviewer_id` sign-off recorded — this is a plan-gated business rule that intersects security (who's allowed to be a reviewer) and the close flow (doc #4)

---

## 6. Agent-Specific Security Constraints

(Full agent behavior lives in doc #3 — these are the guardrails that originate from security requirements specifically)

- Every agent invocation carries an `entity_id` set at job dispatch (Architecture doc Section 6) — an agent cannot query or act outside that entity_id under any circumstances, even if a prompt injection or malformed input attempts to redirect it
- Agents authenticate to internal APIs via service-level credentials distinct from any user session — agent actions are never performed "as" a human user, so `audit_trail.actor_type = 'agent'` is always accurate and never spoofable as a user action
- No agent has standing write access to `audit_trail`, `user_entity_access`, or billing tables — these are read-only or entirely inaccessible to the agent layer, regardless of task

---

## 7. Compliance Roadmap (per PRD Section 19)

| Item                 | Target                         | Notes                                                                                            |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| SOC 2 Type II        | Within 12 months of launch     | Audit trail + RLS + encryption above are prerequisites, not separate work                        |
| GDPR                 | For any EU-touching operations | Relevant once Senegal/international donors are in scope                                          |
| Local data residency | As markets require             | Architecture decision to revisit per-market, not an MVP blocker                                  |
| Penetration testing  | Quarterly, post-Series A       | Pre-Series A: at minimum a manual review pass before first paying customer's real data goes live |

---

## 8. Minimum Bar Before First Real Business Uses Xenboox

This is the non-deferrable checklist — everything above is comprehensive, this is what must be true before you let one real org's real financial data into the system:

1. RLS enforced at DB layer for entity scoping (not just app-layer filtering)
2. Role/permission matrix (Section 2) implemented for at minimum: Org Owner, Finance Director, Accountant, Cashier
3. Encryption at rest and in transit live (Section 3)
4. Audit trail writing on every journal entry, approval, and close event (Section 4.1)
5. Owner notification on close functioning and logged (Section 5.1)
6. ToS acceptance flow with logging (Section 5.2)
7. Agent entity-scoping constraint enforced (Section 6) — no agent can cross entity boundaries even under adversarial input

Everything else in this doc (SOC 2, formal pen testing, full ten-role matrix, GDPR) is real and on the roadmap but does not block getting your first beta user onto the real product.

---

## 9. What This Doc Deliberately Does NOT Cover

- Table schemas themselves → **doc #2 (Architecture)**
- Whether a posted number is accounting-correct → **doc #4**
- How documents get classified/parsed (though sender verification for email ingestion is flagged here and implemented there) → **doc #5**
- Agent decision/escalation logic beyond the security guardrails in Section 6 → **doc #3**

---

_Companion to XENBOOX_PRD.md Section 9 (Multi-Tenancy/Roles), Section 14 (Liability), Section 19 (Security)._
_Final doc: Agent Workforce & Orchestration Spec — this is the last one before all four supporting specs exist for the agents to actually operate within._
