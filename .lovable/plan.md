

# Restore "Send Invoice via Email" Button

## What Happened
During the recent unified invoice page refactor, the `InvoiceSentPanel` was removed and its functionality merged into `InvoiceEditPanel` + `InvoiceActionBar`. However, the "Send invoice to [Billing Contact] at [Facility] via email" button was not migrated. It previously lived in the Send & Share card of `InvoiceSentPanel` (line 149).

## Plan

Add the send-via-email button back into the **InvoiceActionBar** for non-draft, non-paid statuses (Sent / Overdue / Partial). This keeps it prominent and consistent with the new unified action bar pattern.

| File | Change |
|---|---|
| `src/components/invoice/InvoiceActionBar.tsx` | Add a "Send Email" button in the Sent/Overdue/Partial section that invokes `send-reminder-emails` with `mode: 'payment_reminder'`. Pass `facility` and `billingNameTo` as new props so the button label shows the contact name. |
| `src/pages/InvoiceDetailPage.tsx` | Pass `billingNameTo` prop to `InvoiceActionBar` (already available in the page component) |

The button will use the existing `send-reminder-emails` edge function (payment_reminder mode) which already handles sending invoice reminder emails to billing contacts. This replaces the old placeholder toast with real functionality.

