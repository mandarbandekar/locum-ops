

# Dashboard UX Improvements

## Current State

The dashboard has three equal-width columns: Upcoming Shifts, Money to Collect, and Needs Attention. A briefing strip sits above them. Recent features (Tax Intelligence, per-shift tax nudges, expense tracking, total earnings) created new data surfaces that the dashboard does not yet reflect.

## Proposed Improvements

### 1. Add a Tax Snapshot to the Dashboard

**Problem**: Users who set up a tax profile get nudges on individual shifts but never see their overall tax position on the dashboard — the one place they check daily.

**Change**: Add a compact "Tax Snapshot" section to the bottom of the Money to Collect card (or as a new slim row below the 3-column grid). Shows:
- Estimated quarterly payment amount and next due date
- YTD set-aside recommendation vs. actual (if trackable)
- Links to Tax Center

**File**: `src/components/dashboard/MoneyToCollectCard.tsx` — add a tax snapshot section after the invoice list. Pass tax profile data from `DashboardPage.tsx`.

### 2. Surface Tax Deadline in the Daily Briefing Strip

**Problem**: The briefing strip shows shifts, earnings, and credentials but ignores upcoming tax deadlines — a high-stakes item users could miss.

**Change**: Add a tax deadline segment to the briefing when a quarterly payment is due within 30 days: "Q2 taxes due in 12d".

**File**: `src/pages/DashboardPage.tsx` — add to the `briefing` useMemo (around line 387) using the existing `taxQuarters` state.

### 3. Replace Static "This Week" Earnings with a Mini Trend Sparkline

**Problem**: The "This Week: $X" box in Money to Collect is useful but flat. Users can't tell if this week is better or worse than recent weeks.

**Change**: Add a tiny 4-week sparkline (just dots/line, no axis) next to the weekly earnings number showing the last 4 weeks' totals. Uses the existing `shifts` data.

**File**: `src/components/dashboard/MoneyToCollectCard.tsx` — add a small inline SVG sparkline beside the weekly earnings value.

### 4. Add "Tax Set-Aside" to Needs Attention When Profile Missing

**Problem**: Users without a tax profile don't know they're missing out on the tax nudge system. The dashboard should gently surface this.

**Change**: When `useTaxIntelligence().hasProfile` is false and the user has at least one paid invoice, add a low-urgency attention item: "Set up your tax profile — See how much to set aside from each shift" linking to `/tax-center`.

**File**: `src/pages/DashboardPage.tsx` — add to the `attentionItems` useMemo, import `useTaxIntelligence`.

### 5. Improve Mobile Layout — Stack Cards with Priority Order

**Problem**: On mobile (current viewport ~982px is near the `lg` breakpoint), all three cards stack vertically. The "Needs Attention" card — arguably the most actionable — is buried last.

**Change**: On mobile, reorder to: Needs Attention first, then Upcoming Shifts, then Money to Collect. Use CSS `order` utilities on the grid children at the mobile breakpoint.

**File**: `src/pages/DashboardPage.tsx` — add `order-first lg:order-none` to the Needs Attention column div.

---

## Files Summary

| File | Changes |
|---|---|
| `src/pages/DashboardPage.tsx` | Add tax deadline to briefing, tax profile nudge to attention items, mobile reorder, pass tax data to MoneyToCollectCard |
| `src/components/dashboard/MoneyToCollectCard.tsx` | Add tax snapshot section and weekly sparkline |

## What This Does NOT Change

- No new pages or routes
- No database changes
- No changes to the 3-column structure on desktop
- Needs Attention card internals stay the same (just receives one more item type)

