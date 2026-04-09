

# Fix: Spotlight Tour Not Highlighting Sidebar Items Properly

## Problem

When the sidebar is in collapsed/icon mode (3rem wide), the tour targets sidebar items that appear as tiny icons in the corner instead of full navigation labels. The current code only expands collapsed *groups* within the sidebar — it doesn't expand the sidebar itself.

## Root Cause

The sidebar uses `collapsible="icon"` which shrinks to icons only. The `SpotlightTour` component doesn't check or control the sidebar's open/collapsed state — it only looks for Radix collapsible groups.

## Fix

### `src/components/SpotlightTour.tsx`

1. Import `useSidebar` from the sidebar component
2. Before highlighting a sidebar step (steps 5–9, targeting `[data-tour="facilities"]` through `[data-tour="tax"]`), check if the sidebar is collapsed
3. If collapsed, call `setOpen(true)` to expand it, then wait for the animation before measuring the target rect
4. Store the original sidebar state so we can restore it when the tour ends or moves back to dashboard steps

### Detection logic

- Sidebar items can be identified by checking if the target selector starts with `[data-tour="facilities"]`, `[data-tour="schedule"]`, `[data-tour="invoices"]`, `[data-tour="business"]`, or `[data-tour="tax"]` — or more simply, check if the target element lives inside the `[data-sidebar="sidebar"]` container
- When the step's target element is inside the sidebar and `state === 'collapsed'`, expand the sidebar before measuring

### Restore behavior

- When the tour closes (finish/skip), restore the sidebar to its previous state if it was changed
- Use a ref to track whether the tour expanded the sidebar

### File changes

| File | Change |
|---|---|
| `src/components/SpotlightTour.tsx` | Import `useSidebar`, add sidebar expansion logic before rect measurement, restore on close |

Single file, ~15 lines added.

