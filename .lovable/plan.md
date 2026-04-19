
The user wants the invoice page sections to reorder dynamically based on which have data, while keeping a base priority order. Paid stays at the bottom always.

## Current order (static)
1. Overdue
2. Sent & Awaiting Payment
3. Ready to Review
4. Auto Generated Upcoming
5. Paid

## New behavior
**Base priority** (when populated): Overdue → Ready to Review → Sent & Awaiting Payment → Auto Generated Upcoming
**Always last**: Paid

Sections **with data** float to the top in priority order. Sections **without data** drop below the populated ones (but still above Paid), keeping their relative priority order so the page never looks empty.

Example outcomes:
- Has Ready-to-Review only → Ready to Review (top), then empty Overdue, Awaiting, Upcoming, then Paid
- Has Overdue + Awaiting → Overdue, Awaiting, then empty Ready/Upcoming, then Paid
- Has nothing but Paid → empty sections in default priority, Paid at bottom

## Implementation
**File: `src/pages/InvoicesPage.tsx`**

1. Define each non-paid section as a config object with: `key`, `priority` (1=Overdue, 2=Ready, 3=Awaiting, 4=Upcoming), `hasData` flag, and a render function (the existing `<InvoiceStatusGroup>` JSX block, including its `ref` and `data-tour` wrapper).
2. Sort the array: `hasData` sections first (ordered by priority), then empty sections (ordered by priority).
3. Render the sorted list inside the existing `space-y-4` wrapper, then render the Paid section last (unchanged).
4. Keep the "Ready to Review" amber callout banner above the sections (logic unchanged).
5. Keep `scrollTo` refs working — they remain attached to each section wrapper regardless of position.

No changes needed to `InvoiceStatusGroup`, summary strip, or any other component. Pure reordering inside `InvoicesPage.tsx`.

## Result
The most urgent populated section is always first. Empty sections still appear (so the user sees the structure) but sink below populated ones. Paid is pinned to the bottom.
