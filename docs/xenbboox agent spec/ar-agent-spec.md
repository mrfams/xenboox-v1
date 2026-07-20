# Agent Spec: AR Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Agent name    | AR Agent                                                                                                          |
| Tier          | Worker                                                                                                            |
| Reports to    | Controller Agent                                                                                                  |
| Oversees      | (none)                                                                                                            |
| PRD reference | §6.5 "AR Agent"; §5.2 module 4                                                                                    |
| Model         | claude-haiku-4-5 for routine invoicing/payment matching; escalations reasoned by Controller Agent, not internally |

## 2. Mandate

The AR Agent owns the full accounts receivable lifecycle: invoice creation and delivery, customer master data, payment tracking and matching, receipt generation, aging, overdue alerts, and — distinctly from a generic AR module — donor payment tracking for NGO customers (PRD §6.5 explicitly separates this out, and it matters because donor payments often carry project/grant attribution that ordinary customer payments don't).

## 3. Scope Boundary

**This agent MUST:**

- Create and deliver professional invoices to customers
- Maintain customer master data
- Track and match incoming payments to open invoices
- Generate receipts on payment
- Produce AR aging reports
- Alert on overdue invoices
- Track donor payments distinctly, preserving project/grant attribution for NGO customers (feeds Donor and Grant Reporting module, Phase 2)

**This agent MUST NEVER:**

- Match a payment to an invoice on amount alone when multiple open invoices share that amount for the same customer — ambiguous matches escalate, they are not resolved by "most likely" guessing
- Write off an invoice as uncollectable without explicit Controller Agent or human approval
- Post journal entries directly — goes through Ledger Agent
- Drop project/grant attribution when recording a donor payment, even if the payment amount doesn't exactly match an invoiced amount (donors sometimes pay in installments or against budget lines rather than invoices — this must be handled as a distinct case, not force-matched to the invoice model)

## 4. Inputs

| Input                    | Source                                                 | Format                   | Validation required before processing                                  |
| ------------------------ | ------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------- |
| Invoice creation request | Human or triggered by a sale/service event             | `InvoiceCreationRequest` | customer_id valid, entity_id match                                     |
| Payment received         | Cash Agent / Mobile Money Agent / Reconciliation Agent | `PaymentReceived`        | entity_id match, amount > 0                                            |
| Customer data            | Human entry                                            | `CustomerData`           | entity_id match                                                        |
| Donor/grant metadata     | Human entry (NGO segment specific)                     | `DonorPaymentMetadata`   | project_id / grant_id present when customer is flagged as a donor type |

## 5. Outputs

| Output                | Destination                                                    | Schema                | Required fields                                                              |
| --------------------- | -------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| Invoice document      | Customer (via delivery mechanism), stored                      | `Invoice`             | `invoice_id`, `customer_id`, `amount`, `due_date`, `line_items[]`            |
| Journal entry request | Ledger Agent                                                   | `JournalEntryRequest` | `requesting_agent: ar-agent`                                                 |
| AR aging report       | Controller Agent, CFO Agent                                    | `ARAgingReport`       | `entity_id`, `as_of_date`, `buckets[]`                                       |
| Donor payment record  | Donor and Grant Reporting module (Phase 2), Controller Agent   | `DonorPaymentRecord`  | `donor_id`, `project_id`/`grant_id`, `amount`, `linked_invoice_id: nullable` |
| Overdue alert         | Controller Agent, and customer-facing reminder (if configured) | `AROverdueAlert`      | `invoice_id`, `days_overdue`                                                 |

## 6. Tools This Agent Can Call

| Tool                       | Purpose                    | Read/Write |
| -------------------------- | -------------------------- | ---------- |
| `create_invoice`           | Generate and store invoice | Write      |
| `match_payment_to_invoice` | Attempt payment matching   | Read/Write |
| `post_journal_entry`       | Submit AR-related entries  | Write      |
| `get_ar_aging`             | Compute aging report       | Read       |

Contracts: `post_journal_entry` shared. Others not yet written.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                                                                                                          | Enforcement point                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A payment cannot be matched to an invoice if amount + customer_id combination is ambiguous across multiple open invoices without an additional distinguishing signal (reference number, invoice number cited in payment memo) | Application-layer check in `match_payment_to_invoice`                           |
| Invoice write-off requires an explicit approval reference — cannot be self-approved by AR Agent                                                                                                                               | Application-layer check                                                         |
| Donor payment records must always carry `project_id` or `grant_id` when the customer is donor-typed                                                                                                                           | Schema validation — request rejected if missing, not defaulted to null silently |

## 8. Confidence Scoring

- **Payment match confidence** — same composite pattern as other matching agents (amount, timing, reference)
- **Donor attribution confidence** — how confident the mapping of a payment to the correct project/grant is, distinct from the payment-to-invoice match itself, since donor payments may not cleanly map to a single invoice

## 9. Escalation Triggers

| Trigger condition                                                                     | Escalates to                                                       | Escalation type                                                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Payment match confidence < 0.75 (ambiguous multi-invoice match)                       | Controller Agent                                                   | Block (payment recorded as received but not applied to a specific invoice until resolved) |
| Donor payment with unclear project/grant attribution                                  | Controller Agent + relevant program contact (human, if configured) | Block                                                                                     |
| Invoice significantly overdue (entity-configured threshold) with no customer response | Controller Agent                                                   | Flag                                                                                      |
| Write-off request                                                                     | Controller Agent, always                                           | Block until approved                                                                      |

## 10. Failure Modes & Recovery

- **Known failure mode:** partial payments against an invoice being force-matched as "paid in full" due to rounding or fee deductions (common with mobile money — transaction fees sometimes deducted before the merchant receives funds, so received amount is slightly less than invoiced). Mitigation: match logic treats a small negative variance as a distinct "partial due to fees" category rather than either force-matching to full or leaving fully unmatched — but the threshold for "small" needs to be configured, not assumed (see §13).
- **Recovery:** mismatched or incorrectly applied payments corrected via Controller Agent-initiated correction through Ledger Agent.

## 11. Golden Dataset Coverage

Link: `datasets/ar-agent-golden.yaml` (not yet built). Target: standard 28-case floor, with specific coverage for donor/grant attribution scenarios given NGO segment (PRD §4 Segment 4) is a named target market, not an edge feature.

## 12. Cross-Agent Dependencies

- **Upstream:** Cash Agent, Mobile Money Agent, Reconciliation Agent (payment sources)
- **Downstream:** Ledger Agent, Controller Agent, Donor and Grant Reporting module (Phase 2)
- **Flow tests:** "Customer invoice → payment received" flow in `CROSS_AGENT_FLOW_TESTS.md` §3

## 13. Open Questions

- Mobile money fee-deduction variance threshold (§10) — needs real transaction data per rail to set sensibly, not a guessed number.
- Whether donor payment attribution should ever be inferred automatically (e.g. from payment memo text) versus always requiring explicit human-provided metadata — leaning toward requiring explicit metadata for MVP given the stakes of misattributing donor funds, revisit once Donor and Grant Reporting module is built in Phase 2.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Cash/Mobile Money Agents (AR matches and invoices, doesn't execute cash handling)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — 1 of 4 (shared)
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified
