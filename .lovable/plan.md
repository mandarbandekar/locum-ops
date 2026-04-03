

# Show Anticipated Income for 3 Months Ahead

## Problem
The Monthly Revenue chart only shows "Anticipated Income" (draft invoices + uninvoiced shifts) for the current month. Future months with scheduled shifts appear empty.

## Fix
**One change in `src/pages/ReportsPage.tsx`** (lines 109-125):

Replace the `isCurrentMonth` check with a check that allows anticipated income for the current month and up to 3 months into the future:

```typescript
// Change from:
const isCurrentMonth = format(month, 'yyyy-MM') === format(now, 'yyyy-MM');
let anticipated = 0;
if (isCurrentMonth) { ... }

// Change to:
const isCurrentOrFuture = month >= startOfMonth(now) && month <= endOfMonth(addMonths(now, 3));
let anticipated = 0;
if (isCurrentOrFuture) { ... }
```

This means:
- **Past months**: Show only Collected + Outstanding (as today)
- **Current month + next 3 months**: Show Collected + Outstanding + Anticipated (draft invoices + uninvoiced shifts)
- **Beyond 3 months**: No anticipated income shown

Also update the `isCurrentMonth` field in the return object to reflect the new range for any chart styling that references it.

## Scope
- **1 file**, ~5 lines changed
- No new dependencies or DB changes

