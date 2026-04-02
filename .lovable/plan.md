

# Fix "To Collect" Card: Show Only Awaiting Payment

## Problems

1. **"To Collect" total** combines `draftTotal + outstandingTotal`. It should only show `outstandingTotal` (sent, partial, overdue invoices — money the user is actually owed).

2. **"Invoices to Review" list** includes ALL drafts + unpaid invoices. It should only show drafts where `invoice_date <= today` (ready to review), matching the Invoices page logic. Upcoming drafts and sent invoices shouldn't appear here — sent invoices are already counted in the total, and upcoming drafts aren't actionable yet.

## Changes

### File: `src/pages/DashboardPage.tsx`

**Summary computation (lines 137-191):**
- Add a `readyToReviewInvoices` filter: drafts where `invoice_date <= endOfToday`
- Change `invoiceItems` to only include `readyToReviewInvoices` (not all drafts, not unpaid)
- Keep `outstandingTotal` as-is (it's already correct — sent/partial/overdue)
- Remove `draftTotal` from the return (no longer needed by the card)

### File: `src/components/dashboard/MoneyToCollectCard.tsx`

**Header section:**
- Remove `draftTotal` from props and from `totalCollectable` calculation
- `totalCollectable` = just `outstandingTotal` (money awaiting payment)
- Update the label from "To Collect" to "Awaiting Payment" or keep "To Collect" but now it accurately reflects only sent invoices

**Invoice list section:**
- Rename "Invoices to Review" to "Ready to Review" to clarify these are actionable drafts
- The list will now only contain ready-to-review drafts (filtered in DashboardPage)

### What Users See After

- **"To Collect: $X"** — only money from sent invoices awaiting payment
- **"Ready to Review (N)"** — only today's actionable draft invoices
- No upcoming/future drafts cluttering the dashboard
- Sent invoices still visible via "Go to Invoicing" button

