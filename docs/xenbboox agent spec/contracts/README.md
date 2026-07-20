# Tool Contracts — Xenboox Agent Workforce

Every tool an agent can call gets one contract. Tools are where deterministic rules (PRD §6.7 Layer 1) actually live in code — never trust the model to enforce them via prompt instruction.

## Contract Inventory

| Contract                         | Agent(s)                                                   | Read/Write | Status      | Notes                                                            |
| -------------------------------- | ---------------------------------------------------------- | ---------- | ----------- | ---------------------------------------------------------------- |
| `post_journal_entry`             | Ledger Agent                                               | Write      | **Written** | Existing at `../post-journal-entry-contract.md`                  |
| `get_trial_balance`              | Ledger Agent, Controller Agent, Reporting Agent, CFO Agent | Read       | **Written** | Existing at `../get-trial-balance-contract.md`                   |
| `approve_reconciliation_close`   | Treasury Agent                                             | Write      | **Written** | See `./approve-reconciliation-close-contract.md`                 |
| `approve_payment_schedule`       | Treasury Agent                                             | Write      | **Written** | See `./approve-payment-schedule-contract.md`                     |
| `update_supplier_master`         | AP Agent                                                   | Write      | **Written** | See `./update-supplier-master-contract.md`                       |
| `record_match`                   | Reconciliation Agent                                       | Write      | **Written** | See `./record-match-contract.md`                                 |
| `run_ocr_extraction`             | Document Agent                                             | Read/Write | **Written** | See `./run-ocr-extraction-contract.md`                           |
| `get_consolidated_cash_position` | Treasury Agent                                             | Read       | **Written** | See `./get-consolidated-cash-position-contract.md`               |
| `match_invoice_to_po`            | AP Agent                                                   | Read/Write | **Pending** | Listed in AP Agent spec §6; contract not yet written             |
| `flag_unmatched_item`            | Reconciliation Agent                                       | Write      | **Pending** | Listed in Reconciliation Agent spec §6; contract not yet written |
| `get_ledger_entries_by_period`   | Reconciliation Agent                                       | Read       | **Pending** | Listed in Reconciliation Agent spec §6; contract not yet written |
| `get_bank_statement_data`        | Reconciliation Agent                                       | Read       | **Pending** | Listed in Reconciliation Agent spec §6; contract not yet written |
| `store_document`                 | Document Agent                                             | Write      | **Pending** | Listed in Document Agent spec §6; contract not yet written       |
| `link_document_to_transaction`   | Document Agent                                             | Write      | **Pending** | Listed in Document Agent spec §6; contract not yet written       |
| `retrieve_document`              | Document Agent                                             | Read       | **Pending** | Listed in Document Agent spec §6; contract not yet written       |
| `get_ap_aging`                   | AP Agent                                                   | Read       | **Pending** | Listed in AP Agent spec §6; contract not yet written             |

## Status Key

| Status      | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| **Written** | Contract document exists and is complete                          |
| **Pending** | Referenced in an agent spec but contract document not yet written |

## Related Documents

- [Tool Contract Template](../TOOL_CONTRACT_TEMPLATE.md) — template all contracts follow
- [Agent Specs](../) — agent definitions that reference these tools

---

_Last updated: July 20, 2026_
