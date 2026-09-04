# Pipeline 3: Invoice Flow — Sub-Part C — Posted-State UI Surface

**Problem:** P3-B made posting part of invoice creation, but an invoice created
while its fiscal period was closed (or before accounts existed) stays **unposted
with zero UI signal** — and recording a payment then throws a server-side error
the user can't act on ("Invoice is not posted to the ledger"). A silent
unposted invoice = revenue missing from the P&L with no way to notice or fix.

## Fixes

- `invoicing.listInvoices` + `invoicing.getInvoiceDetail` now expose
  `journalEntryId` so the UI can tell posted from unposted.
- New `ar.retryPostInvoice` mutation — re-runs the P3-B posting for an unposted
  invoice and returns plain-English reasons when posting is still impossible
  (closed period, missing AR account, missing line account, etc.).
- Detail panel (`invoice-detail-panel.tsx`):
  - amber "not in the general ledger" banner with a **Post to ledger** button;
  - **Record Payment disabled until the invoice posts** (title explains why) —
    no more surprise server errors mid-flow.
- List (`invoices-view.tsx`): "Not in ledger" amber badge on unposted rows.

## Verification

11 P3 tests green (ledger builders/resolvers, posting wiring, UI surface,
retry reasons). Full tsc deferred per session; region-reviewed.
