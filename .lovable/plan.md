

# Sort All Invoice Groups in Ascending Date Order

## What changes
Update the main `allInvoices` sort in `src/pages/InvoicesPage.tsx` (line 44) from **descending** (newest first) to **ascending** (earliest date first). This ensures that across all status groups (Overdue, Awaiting Payment, Ready to Review, Upcoming, Paid), the invoice closest to its closing/due date appears at the top.

The `allDrafts` sort on line 72 is already ascending — no change needed there.

## File to modify

### `src/pages/InvoicesPage.tsx` — line 44
Change the sort comparator from `b - a` (descending) to `a - b` (ascending):

```
// Before
.sort((a, b) => new Date(b.invoice_date || b.period_end).getTime() - new Date(a.invoice_date || a.period_end).getTime());

// After
.sort((a, b) => new Date(a.invoice_date || a.period_end).getTime() - new Date(b.invoice_date || b.period_end).getTime());
```

This is a one-line change. No other files affected.

