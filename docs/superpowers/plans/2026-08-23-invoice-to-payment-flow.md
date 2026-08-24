# Invoice-to-Payment End-to-End Flow Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task.

**Goal:** Wire the complete "create invoice → send to client → client pays → auto-reconcile" flow so every step is accessible from the UI.

**Architecture:** The backend is 90% complete — `ar.createInvoice`, `ar.createPayment`, `invoicing.sendInvoiceEmail`, `paymentLinks.create/recordPayment` all exist. The gap is the **UI wiring**: the invoice list page has no action buttons, no invoice detail panel, no "Record Payment" dialog, and no "Create Payment Link" flow. This plan bridges that gap.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Shadcn/ui, Lucide icons, Tailwind CSS

**Spec:** This plan is self-contained based on codebase analysis.

---

## What Already Exists (DON'T rebuild)

| Capability                  | Backend                      | Frontend                 |
| --------------------------- | ---------------------------- | ------------------------ |
| Create invoice with lines   | `ar.createInvoice`           | `CreateInvoiceDialog` ✅ |
| Send invoice email with PDF | `invoicing.sendInvoiceEmail` | ❌ Not wired in UI       |
| Generate payment link       | `paymentLinks.create`        | ❌ Not wired in UI       |
| Customer payment page       | `/pay/[token]`               | ✅ Complete              |
| Record payment (internal)   | `ar.createPayment`           | ❌ No dialog             |
| Record payment (public)     | `paymentLinks.recordPayment` | ✅ Complete              |
| Invoice list with filters   | `invoicing.listInvoices`     | ✅ DataTable exists      |
| Invoice detail              | `invoicing.getInvoiceDetail` | ❌ No detail panel       |
| Collection reminders        | `ar.draftReminder`           | ❌ Not wired             |
| Payment received email      | `sendPaymentReceivedEmail`   | ✅ Auto on payment       |

---

## File List

| File                                                           | Action     | Purpose                                           |
| -------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| `apps/web/components/finance/invoice-detail-panel.tsx`         | **Create** | Slide-over panel showing invoice detail + actions |
| `apps/web/components/dashboard/record-payment-dialog.tsx`      | **Create** | Dialog to record a payment against an invoice     |
| `apps/web/components/dashboard/create-payment-link-dialog.tsx` | **Create** | Dialog to generate + copy payment link            |
| `apps/web/app/dashboard/operations/invoices/page.tsx`          | **Modify** | Wire detail panel, add action buttons per row     |
| `apps/web/components/finance/invoices-view.tsx`                | **Modify** | Wire send/payment-link buttons                    |

---

## Task 1: Invoice Detail Panel

**Files:**

- Create: `apps/web/components/finance/invoice-detail-panel.tsx`

**Interfaces:**

- Consumes: `trpc.invoicing.getInvoiceDetail` (exists)
- Produces: `<InvoiceDetailPanel invoiceId onClose />` component

**Steps:**

- [ ] **Step 1:** Create `invoice-detail-panel.tsx` — a slide-over panel (right side, 480px wide) that shows:
  - Invoice header (number, date, due date, status badge)
  - Customer info (name, email)
  - Line items table (description, qty, unit price, amount)
  - Totals (subtotal, tax, total, paid, balance)
  - Payment history (list of payments with date, amount, method)
  - Action buttons: Send Invoice, Create Payment Link, Record Payment, Download PDF

- [ ] **Step 2:** Wire the panel into `invoices/page.tsx` — clicking a row opens the detail panel instead of the AI assistant

- [ ] **Step 3:** Commit

---

## Task 2: Record Payment Dialog

**Files:**

- Create: `apps/web/components/dashboard/record-payment-dialog.tsx`

**Interfaces:**

- Consumes: `trpc.ar.createPayment` (exists)
- Produces: `<RecordPaymentDialog invoiceId onClose onPaymentRecorded />` component

**Steps:**

- [ ] **Step 1:** Create `record-payment-dialog.tsx` — modal dialog with:
  - Invoice summary (number, customer, balance due)
  - Amount field (pre-filled with full balance)
  - Payment method selector (bank_transfer, cash, mobile_money, check, card)
  - Payment date (default today)
  - Reference number (optional)
  - Notes (optional)
  - Submit button → calls `ar.createPayment`
  - Success state with checkmark animation

- [ ] **Step 2:** Wire into invoice detail panel — "Record Payment" button opens this dialog

- [ ] **Step 3:** Commit

---

## Task 3: Create Payment Link Dialog

**Files:**

- Create: `apps/web/components/dashboard/create-payment-link-dialog.tsx`

**Interfaces:**

- Consumes: `trpc.paymentLinks.create` (exists)
- Produces: `<CreatePaymentLinkDialog invoiceId onClose />` component

**Steps:**

- [ ] **Step 1:** Create `create-payment-link-dialog.tsx` — modal dialog with:
  - Invoice summary (number, customer, balance)
  - Expiry selector (7, 14, 30, 60, 90 days)
  - Payment methods checkboxes (card, bank_transfer, mobile_money)
  - "Generate Link" button → calls `paymentLinks.create`
  - Result: copyable payment URL with copy button
  - "Open in new tab" link to `/pay/[token]`
  - QR code preview (optional — nice-to-have)

- [ ] **Step 2:** Wire into invoice detail panel — "Create Payment Link" button opens this dialog

- [ ] **Step 3:** Commit

---

## Task 4: Wire Invoice List Actions

**Files:**

- Modify: `apps/web/app/dashboard/operations/invoices/page.tsx`

**Interfaces:**

- Consumes: `InvoiceDetailPanel`, `RecordPaymentDialog`, `CreatePaymentLinkDialog`
- Produces: Updated invoice list with working action buttons

**Steps:**

- [ ] **Step 1:** Add state for detail panel, record payment dialog, payment link dialog
- [ ] **Step 2:** Replace `handleRowClick` to open detail panel (instead of AI assistant)
- [ ] **Step 3:** Add action dropdown per row: View, Send, Record Payment, Create Payment Link, Download PDF
- [ ] **Step 4:** Add toast notifications for send/payment-link success
- [ ] **Step 5:** Commit

---

## Task 5: Wire Invoices View Actions

**Files:**

- Modify: `apps/web/components/finance/invoices-view.tsx`

**Interfaces:**

- Consumes: Same dialogs as Task 4
- Produces: Working Send + Payment Link buttons in the `InvoiceRow` component

**Steps:**

- [ ] **Step 1:** Wire the Send button to call `invoicing.sendInvoiceEmail` with confirmation
- [ ] **Step 2:** Wire the View button to open the detail panel
- [ ] **Step 3:** Add "Create Payment Link" button for unpaid invoices
- [ ] **Step 4:** Commit

---

## Verification

After all tasks:

1. Open `/dashboard/operations/invoices`
2. Create an invoice → see it in the list
3. Click row → detail panel opens with full info
4. Click "Send Invoice" → email sent, toast confirmation
5. Click "Create Payment Link" → link generated, copy works
6. Open link in incognito → payment page loads
7. Complete payment → invoice status updates to paid
8. Click "Record Payment" → manual payment recorded
9. Run `pnpm typecheck --filter=web` → zero errors
