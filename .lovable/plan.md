# Make "Mark as Paid" easier to find on the invoices dashboard

Today, "Mark as Paid" is a small unlabeled dollar-sign icon button in the actions column of the "Sent & Awaiting Payment" group. Users miss it. Promote it to a clearly labeled primary-style button on each row.

## Change

**`src/components/invoice/InvoiceStatusGroup.tsx`** — actions cell, for rows where `computedStatus` is `sent`, `partial`, or `overdue`:

- Replace the icon-only Tooltip button with a compact labeled button:
  - Outlined primary style (`variant="outline"`, primary border + text, fills primary on hover)
  - Dollar icon + "Mark Paid" label
  - Height matches existing row actions (`h-7`)
- Keep delete and follow-up icon buttons as-is next to it.
- Behavior unchanged — still calls `onMarkAsPaid(inv)` which opens the existing payment dialog (`handleMarkAsPaid` in `InvoicesPage.tsx`).

## Result

```text
Before:  [ $ ] [ ✉ ] [ 🗑 ]      ← all icon-only, same gray color
After:   [ $ Mark Paid ] [ ✉ ] [ 🗑 ]   ← labeled, primary-colored CTA
```

The button now reads as the obvious next step on every awaiting-payment row, while overdue rows still get the follow-up email icon next to it. No changes to the dialog, data model, or other invoice groups.
