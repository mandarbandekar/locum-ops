

# Improve Invoice Dashboard UX — Guide Users to Auto-Generated Invoices

## Problem
Users may see the "Create Invoice" button and think they need to manually create invoices, missing the auto-generated drafts sitting in Ready to Review or Upcoming sections below.

## Recommended Changes

### 1. De-emphasize "Create Invoice" button
- Change from primary filled button to `variant="outline"` with smaller text
- This signals it's a secondary/advanced action, not the main workflow

### 2. Add a contextual action banner when drafts exist
When there are `readyToReview` invoices, show a prominent banner between the summary strip and the status groups:

> **You have {count} invoices ready to review** — Review and send them to get paid.  [Review Next →]

- Uses amber/highlight background to draw the eye
- "Review Next" button navigates to the first ready-to-review invoice
- Banner disappears when `readyToReview` is empty

### 3. Smart empty-state messaging in "Ready to Review" group
Update the empty message to reinforce the auto-generation model:
> "Invoices are auto-generated from your shifts — no need to create them manually. They'll appear here once shifts are completed."

### 4. Relabel "Create Invoice" to "Create Manual Invoice"
Makes it explicit that this is the exception, not the norm.

## Files to modify

### `src/pages/InvoicesPage.tsx`
- Change "Create Invoice" button to `variant="outline"` and relabel to "Create Manual Invoice"
- Add a contextual banner component between the workflow hint and the status groups when `readyToReview.length > 0`
- Update the "Ready to Review" empty message

### `src/components/invoice/InvoiceEmptyState.tsx`
- No changes needed — it already emphasizes auto-generation well

### No new files, no database changes, no logic changes.

