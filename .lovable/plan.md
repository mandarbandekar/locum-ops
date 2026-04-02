

# Improve Monthly Revenue Chart

## Current State

The Monthly Revenue chart in ReportsPage already computes three data series per month:
- **Paid** — invoices with `status === 'paid'`
- **Outstanding** — `total - paid` (combines sent, partial, overdue, and draft invoices)
- **Anticipated** — shifts that are `proposed` or `booked` but not yet on any invoice

The chart renders Paid and Outstanding as a stacked bar, with Anticipated as a separate semi-transparent dashed bar beside it.

## Problems

1. **Outstanding conflates two very different things**: invoices that have been sent and are awaiting payment vs. draft invoices the user hasn't even reviewed yet. Users need to know "money I'm owed" (sent) vs "money I need to invoice" (draft).
2. **Anticipated definition is too narrow**: it only counts shifts with no invoice. But draft/upcoming invoices also represent anticipated money — they haven't been sent yet. The user's mental model is: "How much am I expecting to come in?"
3. **No cumulative view**: Users want to see "total earned so far this year" as a running total, not just month-by-month bars.
4. **No summary callout** under the chart explaining the numbers in plain language.
5. **Legend is implicit** — relies on tooltip hover. A visible legend row with totals would help.

## Recommended Approach

### Revised Data Categories (3 tiers)

| Category | Color | Definition | User Meaning |
|---|---|---|---|
| **Collected** | Green (solid) | Invoices with `status === 'paid'` | Money in your bank |
| **Outstanding** | Amber (solid) | Sent/partial/overdue invoices (`computeInvoiceStatus` returns `sent`, `partial`, or `overdue`) | Money you're owed |
| **Pipeline** | Gray (dashed, 50% opacity) | Draft invoices + uninvoiced booked/proposed shifts | Money coming your way |

This gives users a clear 3-layer picture: earned, owed, expected.

### Chart Improvements

1. **Stacked bar with 3 segments**: Collected (bottom) + Outstanding (middle) + Pipeline (top, dashed/translucent) — all in one stack so the total bar height = total potential revenue.

2. **Summary legend row above chart**: Show inline totals for each category with colored dots, e.g.:
   - `Collected: $12,400` · `Outstanding: $3,200` · `Pipeline: $5,800`

3. **Running total line overlay**: Add a thin cumulative line (Collected only) overlaid on the bar chart using a `ComposedChart`, so users can see their earnings trajectory.

4. **Insight callout**: Auto-generate a plain-language sentence below the chart, e.g.:
   - "You've collected 65% of invoiced revenue. $3,200 is awaiting payment across 4 invoices."
   - "Your pipeline shows $5,800 in upcoming work over the next 2 months."

5. **Current month highlight**: Visually distinguish the current month's bar (subtle border or background) so users orient quickly.

### Technical Changes

**File: `src/pages/ReportsPage.tsx`**

- **revenueData computation** (lines 85-113): Split current `outstanding` into two:
  - `outstanding`: sum of invoices where `computeInvoiceStatus(inv)` is `sent`, `partial`, or `overdue`
  - `pipeline`: sum of draft invoices + anticipated shifts (uninvoiced booked/proposed shifts)
  - `cumulativeCollected`: running sum of `paid` across months (for overlay line)

- **Chart config** (lines 326-330): Update to 3 categories + cumulative line:
  ```
  collected: green, outstanding: amber, pipeline: gray-dashed
  cumulativeCollected: thin green line
  ```

- **Chart rendering** (lines 458-483): Switch from `BarChart` to Recharts `ComposedChart` to support both stacked bars and a line overlay. Stack all three segments. Add `<Line>` for cumulative collected.

- **Legend row**: Add a flex row above the chart with colored dots and dollar totals for each category.

- **Insight callout**: Add an `InsightCallout` below the chart with collection rate and pipeline summary.

- **KPI card update**: Rename "Total Revenue" KPI to show Collected + Outstanding + Pipeline breakdown in the subtitle.

**No database changes required** — all data already exists in invoices and shifts.

### What the User Sees After

A single chart that answers three questions at a glance:
1. "How much have I actually been paid?" (green bars + cumulative line)
2. "How much am I waiting on?" (amber bars)  
3. "What's coming up?" (gray dashed bars)

With a plain-language summary below and totals above.

