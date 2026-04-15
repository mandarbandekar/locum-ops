

## Plan: Add "Mark as Paid" Quick Action to Invoice Dashboard

### What it does
Adds a "Mark as Paid" button to each invoice row in the "Sent & Awaiting Payment" and "Overdue" sections of the Invoices page. Tapping it opens the existing `RecordPaymentDialog` pre-filled with the balance due. After recording, the invoice status updates to `paid` and moves to the Paid section.

### Changes

**1. `src/components/invoice/InvoiceStatusGroup.tsx`**
- Add an optional `onMarkAsPaid` callback prop: `(invoice: InvoiceWithStatus) => void`
- In `InvoiceTable`, add a new action column button (DollarSign icon, "Mark as Paid") next to the delete button for invoices where `computedStatus` is `sent`, `partial`, or `overdue`
- Pass `onMarkAsPaid` through to `InvoiceTable` and `FacilitySubGroup`

**2. `src/pages/InvoicesPage.tsx`**
- Import `RecordPaymentDialog` from `@/components/invoice/RecordPaymentDialog`
- Add state: `markAsPaidTarget` (the invoice being paid) and `paymentDialogOpen`
- Create `handleMarkAsPaid(invoice)` that sets the target and opens the dialog
- Create `handleRecordPayment(payment)` that:
  1. Calls `addPayment({ invoice_id, ...payment })`
  2. Computes new balance (`balance_due - payment.amount`)
  3. Calls `updateInvoice()` with `balance_due`, `status: 'paid'` (if full payment) or `status: 'partial'`, and `paid_at`
  4. Calls `addActivity()` to log the payment
  5. Shows toast confirmation
- Pass `onMarkAsPaid` to the Overdue and Sent & Awaiting `InvoiceStatusGroup` components
- Render `RecordPaymentDialog` at the bottom of the page

### Files modified
- `src/components/invoice/InvoiceStatusGroup.tsx` — add Mark as Paid button per row
- `src/pages/InvoicesPage.tsx` — wire up dialog and payment logic

