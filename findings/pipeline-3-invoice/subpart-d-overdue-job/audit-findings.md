# Pipeline 3: Invoice Flow — Sub-Part D — Overdue Job + PDF/Email audit

## `markOverdueInvoices` job (packages/jobs/reminders.ts)

| #   | Severity | Finding                                                                                                                                                                                            | Fix                                                                                                                                          |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | HIGH     | dueDate is compared as TEXT — legacy rows with non-ISO dates (pre-P3-A data) could be marked overdue by pure lexicographic luck or silently never marked.                                          | ISO-date regex guard (`^[0-9]{4}-[0-9]{2}-[0-9]{2}$`) on both AR and AP scans — invalid rows are surfaced for repair, never blindly flipped. |
| D2  | HIGH     | Notifications went **only to owners** — the bookkeeper/accountant who actually runs collections never saw the overdue signal.                                                                      | Finance-capable audience: owner, admin, finance_director, accountant. Same widening for the monthly bank-upload reminder (owner+admin).      |
| D3  | HIGH     | No failure isolation: one entity's notification insert failing aborted the whole scan after statuses were already updated — retries then found nothing new and the notification was lost forever.  | Per-entity (and per-user) try/catch with error logs — one failure never aborts or silently loses the batch.                                  |
| D4  | OK       | Due-today is correctly NOT overdue (`dueDate < today`); paid invoices excluded via status IN pending/partial; late partial payment correctly re-marks overdue next scan.                           | —                                                                                                                                            |
| D5  | NOTE     | Auto-sending dunning emails is intentionally not added — reminders are pull-based (draftReminder/listCollections) to avoid unsolicited customer email; revisit with an entity-level opt-in config. | —                                                                                                                                            |

## PDF / email generation (invoicing.generatePdf / sendInvoiceEmail)

Audited clean: entity-scoped on both sides, clear "Customer has no email address"
error, PDF generated per line from scoped rows, sentAt only after successful send.
Cosmetic: pervasive `?? "GMD"` entity-currency fallback predates this pipeline
(consistent with schema defaults) — not changed here.

## Verification

14 P3 static/unit tests green. Full tsc deferred per session.
