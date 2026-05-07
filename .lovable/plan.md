## Goal

Make `/schedule` feel like a true command center: everything visible in one screen, no page scroll on calendar views, easier to scan and filter — without losing any current functionality.

## 1. Consolidate the header into one compact toolbar

Today the page uses two stacked rows (page header + date nav row) which eats ~120px of vertical space.

Collapse into a single sticky toolbar:

```text
[📅 Schedule]  [‹ Nov 2026 ›] [Today]    [12 shifts · 84h · $9,200]    [🔍] [Filter ▾] [Month ▾] [List] [Sync] [+ Shift ▾]
```

- Drop the large icon tile + subtitle on calendar views (keep on list view where space allows).
- Merge "Add Shift" and "Block Time" into a single split-button (`+ Shift ▾` → Shift / Block time).
- Move "iPhone/Google Calendar Sync" into an icon-only button with tooltip; the full panel still opens.
- Stats inline (shifts · hours · revenue) replace the separate stats row.

Net gain: ~60–80px more vertical space for the calendar.

## 2. Month view: auto-shrink to fit, never scroll

The cell contents (date number, holiday/tax markers, time blocks, shifts, credential/subscription chips) currently overflow on busy days, and the row count varies (4–6 weeks).

Rules:

- Container already uses `flex-1 min-h-0` with `gridTemplateRows: repeat(N, minmax(0, 1fr))`. Keep that.
- Compute an `itemDensity` per cell (count of all chips). Apply density-driven classes:
  - 1–2 items → standard chip (current size)
  - 3–4 items → compact chip (smaller padding, single line, `text-[10px]`)
  - 5+ items → ultra-compact dots/pills (just clinic-color dot + initials), with full title on hover
- Replace per-chip text overflow with `truncate` + `title` tooltip.
- Holiday/tax markers shrink to a corner emoji badge when density is high.
- Hard cap cell content to `overflow-hidden`; never introduce a per-cell scrollbar.

This keeps everything visible without "+N more" popovers, per your preference.

## 3. Week / Day view: fit-to-viewport time grid

Today `WeekTimeGrid` renders all hours (5am–10pm or full 24h) and relies on internal scroll.

Improvements:

- Auto-fit hour height: compute `HOUR_HEIGHT` from available height ÷ visible-hour count so the whole day fits without scroll on standard viewports.
- Smart hour range: default to 6am–8pm; auto-expand only if shifts/blocks exist outside that window.
- "Full day" toggle (icon button) to force 24h view (still fit-to-height).
- Sticky day header row inside the grid container.

## 4. Filter & focus controls (replaces removed Layers menu)

Add a single `Filter ▾` popover in the toolbar:

- **Clinics**: multi-select checkboxes with color dot per clinic.
- **Show**: toggles for Shifts / Time blocks / Credentials / Subscriptions / Holidays / Tax dates. (Credentials + Subscriptions stay ON by default per current behavior.)
- **Conflicts only**: toggle that dims non-conflicting days.
- A small dot on the Filter button indicates non-default state. "Reset" link clears all.

Persist filter state in `localStorage` (per-user, like the existing view preference).

## 5. Inline search

Add a `🔍` icon button → expands to an input. Filters chips by clinic name, shift notes, or block title. Matches highlight; non-matches dim to 30% opacity. ESC clears.

## 6. Day peek on hover (no extra clicks)

Hovering a day cell for 400ms opens a lightweight popover anchored to the cell:

- Full list of that day's shifts (clinic, time, rate), blocks, and events.
- Quick actions: Add shift here, Block time, Open day view.

This complements auto-shrink — high-density days stay readable on hover without leaving the month view.

## 7. Conflict & utilization affordances

- Day cells with overlapping shifts get an amber left border (already partially there) plus a small ⚠ badge.
- Utilization heat: cells with 8+ billable hours get a subtle primary-tinted background. Helps spot busy days at a glance.
- Footer strip (inside toolbar stats) shows current range utilization: `12 shifts · 84h · 70% utilized`.

## 8. Keyboard shortcuts

- `←` / `→`: previous / next period
- `T`: jump to today
- `M` / `W` / `D` / `L`: switch view
- `N`: new shift
- `/`: focus search
- `?`: shortcut cheatsheet popover

## 9. List view (unchanged scroll behavior)

Per your answer, list view keeps page scroll. Light improvements only:

- Group rows by week with sticky week headers.
- Show clinic color dot in the Facility column.
- Keep existing tax-nudge sub-row.

## Out of scope

- Drag-to-resize shifts (week/day) — keep current click-to-edit.
- Mobile-specific redesign — current responsive behavior preserved.
- Backend / data model changes.

## Files likely to change

- `src/pages/SchedulePage.tsx` — toolbar consolidation, filter/search state, density logic, hover popover wiring.
- `src/components/schedule/WeekTimeGrid.tsx` — fit-to-height hour sizing, smart hour range, sticky header.
- New: `src/components/schedule/ScheduleToolbar.tsx` — extracted single-row toolbar.
- New: `src/components/schedule/ScheduleFilters.tsx` — filter popover (clinics, layers, conflicts).
- New: `src/components/schedule/DayPeekPopover.tsx` — hover/click day preview.
- New: `src/hooks/useScheduleFilters.ts` — filter state + persistence.
- `src/components/schedule/CalendarEventChip.tsx` — density-aware variants.

## Acceptance

- On a 1089×792 viewport at `/schedule` in Month or Week view, the page does not scroll vertically; the calendar fills available height.
- A day with 6+ items renders without overflow and shows full detail on hover.
- Filter and search persist across reloads and reduce visible items in real time.
- All existing flows (add shift, block time, edit, drag-to-reschedule, sync, confirmations) still work.
