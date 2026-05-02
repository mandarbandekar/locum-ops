## Goal

Tighten the Schedule view switcher so it takes less horizontal space and reads more like a standard calendar app:

- Combine the calendar timeframes (Month / Week / Day) into a single dropdown that shows the current selection (e.g. "Month ▾"). Default stays on Month.
- Replace the standalone "List" tab with a single icon button that toggles between **List** and **Calendar**. Pressing the icon while in List flips back to the calendar timeframe view.
- Leave "Confirm" and "Sync" tabs alone — they're separate workspaces, not calendar views.

## Current state

`src/pages/SchedulePage.tsx` renders one `Tabs` strip with five triggers: Month, Week, List, Confirm, Sync. There is **no Day view today** — the file only has `monthDays` and `weekDays`. The active view is persisted to `localStorage` under `schedule-view-pref`.

## New layout (left → right in the header)

```text
[ Month ▾ ]   [ ☰ List ]   [ ✓ Confirm ]   [ ⟳ Sync ]
```

- **Timeframe dropdown** — a `DropdownMenu` (shadcn) trigger styled like the existing tab buttons. Label shows the current pick: Month / Week / Day. Items: Month, Week, Day. Selecting one sets `view` to that value.
- **List toggle** — an icon-only button (`List` icon when on a calendar view, `CalendarDays` icon when on the list view). Click flips between the list and the last-used calendar timeframe (remember it in a small ref/state, default Month). Tooltip: "Switch to list" / "Switch to calendar".
- **Confirm** and **Sync** — keep as plain icon+label buttons next to the toggle, same visual weight as today's tabs but rendered as buttons rather than tab triggers (since they're no longer part of the same `Tabs` group).

Default on first load stays Month. Persisted preference in `localStorage` continues to work; if a stored value is unrecognized, fall back to Month.

## Day view (new)

Since the user listed Day as a dropdown option and we don't have one yet, add a minimal Day view:

- Reuse `WeekTimeGrid` by passing a single-day array (`[currentDate]`) — the component already handles per-day columns and absolute-positioned shifts. Header label: `format(currentDate, 'EEEE, MMM d, yyyy')`.
- Prev/Next buttons advance by 1 day when `view === 'day'`. "Today" button already works.
- All-day calendar events row + time blocks render the same way they do for week.

If reusing `WeekTimeGrid` with one day looks too wide visually, constrain the inner grid to `max-w-2xl` for day view only — decide during implementation, doesn't change the plan.

## Behavior details

- `view` state type becomes `'month' | 'week' | 'day' | 'list' | 'confirmations' | 'sync'`.
- `isCalendarView` includes `'day'`.
- The "last calendar timeframe" memory: when the user switches to List, remember whichever of month/week/day they came from so the icon toggle returns there. If they came from confirmations/sync (shouldn't normally happen since List lives outside that flow), default to Month.
- Spotlight tour selector `[data-tour="schedule-view-switcher"]` moves to the dropdown trigger so the existing tour still anchors correctly. Update the tour copy from "Switch between month overview, detailed weekly time grid, or a sortable list" to "Switch timeframe (month, week, day) or jump to a list view."
- Mobile: dropdown trigger already collapses well; the List toggle stays icon-only on all sizes (label only in tooltip).

## Files to touch

- `src/pages/SchedulePage.tsx` — header markup, `view` union, view buttons array → split into (a) timeframe dropdown, (b) list toggle, (c) confirm/sync buttons. Add Day rendering branch in the body. Update prev/next handlers for day. Update tour copy.
- No DB, hook, or context changes.

## Out of scope

- Visual redesign of shift cards, time grid styling, or filters.
- Confirmations and Sync screens themselves.
- Timezone handling (separate ongoing thread).
