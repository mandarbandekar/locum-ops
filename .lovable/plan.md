

# Split Drafts into "Upcoming" and "Ready to Review"

## The Problem
Currently all draft invoices sit in one "Drafts" bucket, but some cover future shifts that haven't happened yet. Users can't meaningfully review or send an invoice for shifts that haven't been worked.

## Proposed Change
Split the current Drafts section into two distinct groups:

1. **Ready to Review** — Draft invoices where `period_end` is in the past (all shifts completed). These are actionable — user should review and send them.
2. **Upcoming** — Draft invoices where `period_end` is today or in the future. These are pre-generated but not yet actionable. Shown in a muted/informational style.

### Visual treatment
- **Ready to Review**: Amber highlight (current draft styling), with "Review & Send" button — this is the action zone
- **Upcoming**: Subtle gray/muted styling, with a note like "These invoices will be ready to review after the shifts are completed"
- Both remain grouped by facility with the existing sub-group pattern

### Summary Strip update
- The "Drafts to Review" card would only count **Ready to Review** invoices
- Add no new card for Upcoming (keeps the strip clean) — or show a small "(+N upcoming)" annotation

### Workflow Hint update
- Change "Review Draft" to "Review & Send" to match the new section name

## Technical Details

### Files to modify:
- **`src/pages/InvoicesPage.tsx`** — Split the `draft` array into `readyToReview` (period_end < today) and `upcoming` (period_end >= today). Render two separate `InvoiceStatusGroup` components. Update summary strip to use `readyToReview` count/total.
- **`src/components/invoice/InvoiceSummaryStrip.tsx`** — Update label from "Drafts to Review" to "Ready to Review"
- **`src/components/invoice/InvoiceWorkflowHint.tsx`** — Update "Review Draft" label

### No database or backend changes needed.

