

# Dashboard UX Evaluation and Improvement Plan

## Current State Assessment

The dashboard has a 3-column layout (Shifts / Money / Attention), a Getting Started checklist for new users, Quick Actions buttons, and a Work Readiness strip. Here are the key issues:

### Issues Identified

1. **No narrative or summary** — Users land on three data-dense cards with no plain-language "here's how you're doing" context. The Business Insights page now has an AI summary, but the dashboard (the first thing users see every day) does not.

2. **Quick Actions are buried** — On desktop, the "+ Shift / + Invoice / + CE Entry" buttons float in the top-right corner with no visual weight. On mobile they're pushed below the 3 cards. These are the primary value-driving actions.

3. **No "streak" or engagement hook** — There's nothing that rewards consistent usage (e.g., "You've logged shifts for 4 consecutive weeks" or "3-day streak"). This is a proven stickiness driver.

4. **Work Readiness strip is easy to miss** — It sits below all cards as plain pill-shaped buttons. Users may never scroll to see it on desktop since the 3 cards can fill the viewport.

5. **Money card is tall and chart-heavy for a dashboard** — The revenue trend mini-chart takes up significant vertical space but provides the same data available in Business > Insights. The invoice list is valuable but competes with the chart for attention.

6. **No "today's earnings" or "this week's earnings" number** — Locum providers think in terms of "what did I earn today/this week." There's no quick answer to that question.

---

## Recommended Improvements

### Change 1: Add a Daily Briefing strip at the top
A single-line contextual strip above the 3-column grid that gives an instant status read. Computed from existing data — no AI call needed.

Examples:
- "You have 2 shifts today worth $1,200 · 1 invoice overdue · All credentials current"
- "No shifts today · Next shift: Tomorrow at Riverside Clinic · $4,500 to collect"
- "3 shifts this week · $2,400 earned so far · 1 draft invoice ready to send"

**In `src/pages/DashboardPage.tsx`:**
- Compute today's shifts, this week's earnings, top attention item
- Render a compact strip with icon + text between the header and the grid

### Change 2: Integrate Quick Actions into the greeting card
Move the Quick Actions (+ Shift, + Invoice, + CE Entry) into the UpcomingShiftsCard footer area, replacing the current separate QuickActions component. This puts actions right next to the context that motivates them.

**In `src/components/dashboard/UpcomingShiftsCard.tsx`:**
- Add inline quick-action buttons below "Add Shift" (which already exists)
- Add a small "+ Invoice" and "+ CE" link row

**In `src/pages/DashboardPage.tsx`:**
- Remove the separate QuickActions sections (desktop header and mobile footer)

### Change 3: Add a "This Week's Earnings" highlight to MoneyToCollectCard
Replace the mini revenue chart (which duplicates Business > Insights) with a compact "This Week" earnings number and a simpler breakdown.

**In `src/components/dashboard/MoneyToCollectCard.tsx`:**
- Add a "This Week" section showing earnings from completed shifts this week
- Keep the invoice list (high value) but make it the primary focus
- Shrink or remove the 6-month revenue chart (available in Insights)

### Change 4: Elevate Work Readiness into the Needs Attention card
Instead of a separate strip at the bottom, merge readiness items into the Needs Attention card as a secondary "Readiness" section with a visual divider. This ensures users always see credential/compliance status without scrolling.

**In `src/components/dashboard/NeedsAttentionCard.tsx`:**
- Accept `readinessItems` as a prop
- After the attention items list, show a "Work Readiness" section with the readiness chips

**In `src/pages/DashboardPage.tsx`:**
- Pass `readinessItems` to NeedsAttentionCard
- Remove the standalone WorkReadinessStrip

### Change 5: Add an engagement streak counter
Show a small "streak" indicator in the greeting area — "Active for 12 days" or "4-week streak." Tracked via localStorage (last visit dates). Simple but effective for habit formation.

**In `src/components/dashboard/UpcomingShiftsCard.tsx`:**
- Accept a `streakDays` prop
- Show below the greeting: a small flame/zap icon + "X-day streak" when streak > 1

**In `src/pages/DashboardPage.tsx`:**
- Compute streak from localStorage (store array of recent visit dates, count consecutive days)

---

## Files to modify

### `src/pages/DashboardPage.tsx`
- Add daily briefing strip computation and rendering
- Remove standalone QuickActions and WorkReadinessStrip
- Compute streak from localStorage
- Pass readinessItems to NeedsAttentionCard
- Compute thisWeekEarnings for MoneyToCollectCard

### `src/components/dashboard/UpcomingShiftsCard.tsx`
- Add quick-action links (+ Invoice, + CE) below the Add Shift button
- Add streak display in greeting area

### `src/components/dashboard/MoneyToCollectCard.tsx`
- Add "This Week" earnings section
- Reduce revenue chart height or replace with a simpler sparkline

### `src/components/dashboard/NeedsAttentionCard.tsx`
- Add readinessItems prop and render a "Work Readiness" section below attention items

### No database changes, no new files, no backend changes.

## Technical Detail

- Daily briefing computed from: `shifts` filtered to today (for "X shifts today"), `summary.outstandingTotal + summary.draftTotal` (for collectable), and `attentionItems[0]` (for top priority)
- This week's earnings: filter shifts where `start_datetime` is within current Mon-Sun and status is `completed`, sum `rate_applied`
- Streak: store `locumops_last_visits` in localStorage as ISO date strings, compute consecutive days ending today
- All changes are presentation-layer, no new API calls

