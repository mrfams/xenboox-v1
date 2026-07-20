# Agent Spec: AP Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`.

---

## 1. Identity

| Field         | Value                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent name    | AP Agent                                                                                                                                                                                                                |
| Tier          | Worker                                                                                                                                                                                                                  |
| Reports to    | Controller Agent                                                                                                                                                                                                        |
| Oversees      | (none)                                                                                                                                                                                                                  |
| PRD reference | §6.5 "AP Agent"; §5.2 module 3                                                                                                                                                                                          |
| Model         | claude-haiku-4-5 for routine invoice ingestion and matching; escalate to sonnet-tier reasoning (via Controller Agent, not internally) for disputed/unmatched items — PRD §18 places routine worker-agent tasks on Haiku |

## 2. Mandate

The AP Agent owns the full accounts payable lifecycle: ingesting supplier invoices from any format, maintaining supplier data, matching invoices to purchase orders, scheduling payments, tracking aging, and flagging overdue or disputed items. It is the first agent in the invoice flow described in PRD §6.6, and its output quality directly determines how much downstream work Cash Agent, Ledger Agent, and Controller Agent have to do to catch its mistakes.

## 3. Scope Boundary

**This agent MUST:**

- Ingest invoices from every supported format: email, PDF, image, WhatsApp photo, Excel (via Document Agent for extraction, AP Agent for business logic on top)
- Maintain supplier master data (name, payment terms, bank/mobile money details, tax status)
- Match invoices to purchase orders where a PO exists; flag invoices with no matching PO rather than assuming a match
- Schedule payments and track due dates
- Generate AP aging reports
- Flag overdue and disputed items to Controller Agent

**This agent MUST NEVER:**

- Schedule a payment for an invoice that hasn't been matched (to a PO) or explicitly approved as PO-less by a human/Controller Agent — no silent approval-by-default
- Modify supplier bank/mobile money payment details without a distinct, explicitly-flagged verification step (this is a well-known fraud vector — invoice/payment-detail-change scams — and must never be treated as routine data entry)
- Post journal entries directly — goes through Ledger Agent
- Mark an invoice as paid without a confirmed payment record from Cash Agent, Mobile Money Agent, or Reconciliation Agent

## 4. Inputs

| Input                        | Source                                                 | Format                      | Validation required before processing                                               |
| ---------------------------- | ------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------- |
| Extracted invoice data       | Document Agent (post-OCR)                              | `ExtractedInvoiceData`      | OCR confidence attached; below-threshold extractions flagged, not silently trusted  |
| Purchase order data          | Human entry (or Inventory Agent in Phase 3)            | `PurchaseOrder`             | entity_id match                                                                     |
| Payment confirmation         | Cash Agent / Mobile Money Agent / Reconciliation Agent | `PaymentConfirmation`       | Linked to a specific `invoice_id`                                                   |
| Supplier data change request | Human (Accountant/Finance Director role)               | `SupplierDataChangeRequest` | Bank/mobile money field changes flagged for mandatory secondary verification per §3 |

## 5. Outputs

| Output                                                 | Destination                              | Schema                            | Required fields                                                       |
| ------------------------------------------------------ | ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| Journal entry request (invoice recorded, payment made) | Ledger Agent                             | `JournalEntryRequest`             | `requesting_agent: ap-agent`                                          |
| AP aging report                                        | Controller Agent, CFO Agent (on request) | `APAgingReport`                   | `entity_id`, `as_of_date`, `buckets[]` (current, 30/60/90+ days)      |
| Overdue/disputed flag                                  | Controller Agent                         | `APExceptionFlag`                 | `invoice_id`, `type` (overdue/disputed/unmatched), `days_outstanding` |
| Payment-detail-change flag                             | Controller Agent + human, always         | `SupplierPaymentDetailChangeFlag` | `supplier_id`, `changed_fields[]`, `requires_verification: true`      |

## 6. Tools This Agent Can Call

| Tool                     | Purpose                   | Read/Write                                     |
| ------------------------ | ------------------------- | ---------------------------------------------- |
| `match_invoice_to_po`    | Attempt PO matching       | Read (matching logic), Write (recording match) |
| `update_supplier_master` | Update supplier data      | Write                                          |
| `post_journal_entry`     | Submit AP-related entries | Write                                          |
| `get_ap_aging`           | Compute aging report      | Read                                           |

Contracts: `post_journal_entry` shared. Others not yet written. `update_supplier_master` is the highest-priority remaining contract given the fraud-vector concern in §3 — the "flag payment-detail changes" rule needs to be enforced in this tool's code, not just stated in the spec.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                                                                         | Enforcement point                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Payment cannot be scheduled for an invoice without either a PO match or explicit approval flag on the invoice record                                         | Application-layer check in payment-scheduling logic                                                  |
| Any change to supplier bank/mobile money payment fields sets `requires_verification: true` and blocks payment scheduling against that supplier until cleared | `update_supplier_master` tool — hard gate, cannot be bypassed by a confident-sounding change request |
| Invoice cannot be marked paid without a linked `PaymentConfirmation` from an authorized source agent                                                         | Application-layer check                                                                              |

## 8. Confidence Scoring

- **PO match confidence** — amount, item description, supplier match strength between invoice and PO
- **Extraction reliability** — inherited from Document Agent's OCR confidence, not recomputed, but explicitly factored into whether AP Agent proceeds automatically or holds for review

## 9. Escalation Triggers

| Trigger condition                                                | Escalates to                                                       | Escalation type                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PO match confidence < 0.75                                       | Controller Agent                                                   | Flag (invoice recorded but payment not scheduled until resolved)                                                                                                                     |
| No PO exists and invoice was not pre-flagged as PO-less-approved | Controller Agent                                                   | Block (payment scheduling held)                                                                                                                                                      |
| Supplier payment detail change of any kind                       | Controller Agent + human, always                                   | Block (payment scheduling against that supplier halted until verified) — no confidence threshold applies here, this is a categorical rule regardless of how routine the change looks |
| Invoice amount exceeds entity-configured threshold               | Controller Agent                                                   | Flag                                                                                                                                                                                 |
| OCR extraction confidence below threshold                        | Document Agent (re-extraction request) + Controller Agent (notify) | Flag                                                                                                                                                                                 |

## 10. Failure Modes & Recovery

- **Known failure mode:** duplicate invoice submission (same invoice photographed and submitted twice, e.g. via WhatsApp and email). Mitigation: matching logic checks for duplicate invoice number + supplier + amount combination before treating as a new invoice; near-duplicates flagged rather than silently deduped, since a genuine reissued invoice with a corrected amount looks similar to a duplicate.
- **Recovery:** incorrect AP postings corrected via Controller Agent-initiated corrections through Ledger Agent, same as any other domain.

## 11. Golden Dataset Coverage

Link: `datasets/ap-agent-golden.yaml` (not yet built). Target: standard 28-case floor. The payment-detail-change fraud vector (§3, §9) should have dedicated `adversarial` cases — this is a case category worth over-indexing on given real-world fraud patterns in AP generally.

## 12. Cross-Agent Dependencies

- **Upstream:** Document Agent (invoice OCR)
- **Downstream:** Cash Agent / Mobile Money Agent (payment execution), Ledger Agent, Controller Agent
- **Flow tests:** "Supplier invoice → payment → close" flow in `CROSS_AGENT_FLOW_TESTS.md` §3 — AP Agent is the first real step in that flow

## 13. Open Questions

- Entity-configured invoice amount threshold for mandatory flagging (§9) — same open pattern as Cash Agent's materiality threshold, needs a consistent mechanism across agents rather than each agent inventing its own config path.
- Exact verification mechanism for supplier payment-detail changes (§3/§7) — flagged as blocking, but _who_ performs the verification and how (callback to supplier, human confirmation, documentary evidence) is not yet designed. This is worth resolving carefully given it's a named fraud vector, not a generic TODO.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Cash/Mobile Money Agents (AP schedules, doesn't execute payment) or Inventory Agent (PO creation vs. PO matching, Phase 3 boundary noted)
- [x] All outputs have a defined schema
- [ ] All tools listed have contracts written — 1 of 4 (shared); `update_supplier_master` flagged high priority
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — not yet built
- [x] Cross-agent flows identified
