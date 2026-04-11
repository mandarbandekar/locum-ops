

# Dashboard Simplification — Single-Screen Command Center

## Problem
The dashboard is overloaded with competing elements:
- **3 conditional banners** above the grid (briefing strip, getting started checklist, tax savings card)
- **UpcomingShiftsCard** has: greeting, streak, next shift preview, collapsible shift list, Add Shift button, +Invoice/+CE links, "View full schedule" link — 7 distinct sections
- **MoneyToCollectCard** has: total collectable, collected this month, monthly pace, this week earnings with sparkline, oldest unpaid alert, collapsible invoice list, tax snapshot, CTA button — 8 distinct sections
- **NeedsAttentionCard** has: header with count badge, scrollable items list, work readiness pills section

On a 616px-tall viewport with the header, there is roughly 530px of usable space. The banners consume ~100-140px before the cards even start, leaving the three cards cramped.

## Redesign Principles
1. **One greeting, one glance** — merge the briefing strip into the greeting inside the shifts card
2. **Remove conditional banners** — tax savings and getting started checklist move into the Needs Attention list as regular items (they already partially overlap)
3. **Each card does ONE job well** with minimal sub-sections
4. **No redundant data** — "this week earnings" and "monthly pace" overlap with "to collect" and "paid this month"; keep only the most actionable

## New Layout

```text
┌─────────────────────────────────────────────────────┐
│  Good Morning, Sarah · 2 shifts today · $1.2k week  │  ← compact greeting bar
├──────────────┬──────────────┬────────────────────────┤
│  SCHEDULE    │  MONEY       │  ACTION ITEMS          │
│              │              │                        │
│  Next shift  │  $X to       │  • 3 overdue invoices  │
│  Today 8a-5p │  collect     │  • DEA expires in 12d  │
│  ABC Clinic  │              │  • Q2 taxes due 14d    │
│              │  $Y paid     │  • 2 confirmations     │
│  ▼ 4 more    │  this month  │  • Set up tax profile  │
│  this week   │              │  • Tax savings $2.1k   │
│              │  ▼ 3 to      │                        │
│              │  review      │                        │
│              │              │                        │
│  [Add Shift] │  [Invoices]  │                        │
└──────────────┴──────────────┴────────────────────────┘
```

## Specific Changes

### 1. Remove top banners, merge into cards
- **Delete** the Daily Briefing Strip — merge key stats into a single compact greeting row at the very top (same data, one line)
- **Delete** the Tax Savings Opportunities card — add it as an attention item in NeedsAttentionCard instead
- **Delete** the Getting Started Checklist from the dashboard surface — it already has overlap with attention items; move the incomplete checklist steps into the attention list as low-urgency items

### 2. Slim down UpcomingShiftsCard
- Remove the streak counter (nice-to-have but adds clutter)
- Remove the "+Invoice" and "+CE Entry" footer links (these exist in the sidebar)
- Remove the "View full schedule" link (the Add Shift button already navigates to schedule)
- Keep: greeting/next shift, collapsible shift list, single Add Shift CTA

### 3. Slim down MoneyToCollectCard
- Remove "This Week" earnings box (redundant with briefing bar)
- Remove the weekly sparkline SVG
- Remove "Monthly Pace" line (nice stat but secondary)
- Remove "Oldest Unpaid" standalone alert (already appears in attention items as overdue)
- Remove "Tax Set-Aside" section (move to attention items when deadline is near)
- Keep: total to collect, paid this month, collapsible invoice list, single CTA button

### 4. Consolidate NeedsAttentionCard
- Remove the separate "Work Readiness" pills section at the bottom — those items are already represented in the main attention list
- Absorb the tax savings nudge and getting started steps as attention items
- Increase max visible items from 6 to 8 (since the card now has more vertical space)

### 5. Compact greeting bar
Replace the briefing strip with a single-line bar inside the page (not a separate card):
- Format: `Good Morning, Sarah · 2 shifts today · $1.2k this week · $4.5k to collect`
- Same data, ~32px height instead of ~44px

## Files Modified
- `src/pages/DashboardPage.tsx` — remove banners, restructure layout, add checklist/tax items to attention list
- `src/components/dashboard/UpcomingShiftsCard.tsx` — remove streak, footer links, simplify
- `src/components/dashboard/MoneyToCollectCard.tsx` — remove sparkline, this-week box, oldest unpaid, tax snapshot, monthly pace
- `src/components/dashboard/NeedsAttentionCard.tsx` — remove work readiness section, increase item cap

## No database changes needed

