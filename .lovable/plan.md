## Schedule Page UX Pass — Google-Calendar-Inspired (Focused)

Goal: ship four high-leverage upgrades inspired by Google Calendar — agenda view as the mobile default, a today pill + now-line, a tap-to-peek popover, and a mobile FAB. Desktop default stays Monthly per existing memory.

### 1. Mobile Agenda view as default

The 60px month grid at 390px is unreadable. Add a new `view: 'agenda'` mode that renders shifts as a scrollable, day-grouped list (Google's "Schedule" pattern):

```text
THU · MAY 15
  8:00 AM – 5:00 PM   Greenfield Medical   $850
  6:00 PM – 9:00 PM   Lakeside Vet         $300
FRI · MAY 16
  9:00 AM – 6:00 PM   Aurora Animal Hosp   $900
```

- Behavior: groups by clinic-local date (use existing `formatYMDInTz`), shows next 60 days plus a "Past shifts" toggle.
- Each row: tap → opens the new peek popover (§3); chevron-right affordance.
- Empty state: same illustration/CTA as month view.
- **Default-on-mobile rule**: in the existing mount-time view picker, if `useIsMobile()` and the persisted view is `month`, switch to `agenda`. Honor explicit user choice (don't override after they pick another view).
- Add `Agenda` entry to the timeframe dropdown so desktop users can opt in.

New file: `src/components/schedule/AgendaView.tsx`. Wire from `SchedulePage.tsx`.

### 2. Today pill + "Now" line

- **Today pill (Month view)**: replace the current today highlight with a filled primary-color circle around the day number (Google's hallmark).
- **Now line (Day/Week view)**: a horizontal red line at the current time within the time grid in `WeekTimeGrid`, with a small dot on the left rail. Updates every minute via `setInterval`. Renders only for days/weeks that include "today" (in profile tz).

Files: `src/components/schedule/WeekTimeGrid.tsx`, `src/pages/SchedulePage.tsx` (renderDayCell today styling).

### 3. Tap-event peek popover

Today: clicking any shift opens the full edit panel — heavy and disorienting on mobile.

New: `ShiftPeekPopover` (uses shadcn `Popover` on desktop, full-screen sheet on mobile via `useIsMobile`):

- Header: clinic name + colored dot, date in clinic tz.
- Body: time range (clinic tz), hours, rate, OT line if any, paid/uninvoiced status pill.
- Actions: **Edit**, **Delete**, **Mark Paid** (only if invoiced + unpaid).
- Replaces the immediate edit-panel jump in `renderDayCell`'s shift chips and in `WeekTimeGrid`'s blocks.
- "Edit" action then opens the existing edit panel.

New file: `src/components/schedule/ShiftPeekPopover.tsx`.

### 4. Mobile FAB for + actions

Mirror the dashboard FAB pattern. Floating "+" pinned `fixed bottom-4 right-4 z-40`, visible only `md:hidden` on Schedule:

- Add Shift (opens existing add dialog)
- Block Time (opens existing block dialog)
- Today (jumps to today + sets view to agenda/day)

Hidden when an edit/peek dialog is open. New file: `src/components/schedule/MobileScheduleFab.tsx`. Wire from `SchedulePage.tsx`.

### Non-goals

- No drag-to-create gesture, no keyboard shortcuts, no per-clinic color tokens, no title-as-date-picker — those are the "Full pass" we deferred.
- No business logic, schema, or invoice/rate changes.
- Desktop default view stays Monthly (memory-locked).
- Edit panel itself unchanged.

### Verification

- 390px: opening `/schedule` lands on Agenda; switching to Month works and renders today as a filled pill; FAB visible.
- Day/Week views show a red now-line that moves over time (verify via setInterval mock or visual check at minute boundary).
- Tapping any shift opens the peek with Edit/Delete/Mark Paid; Edit opens the existing panel; Delete uses existing confirm.
- ≥768px: default still Monthly, no FAB, peek renders as a popover near the click target.

### Files touched

- `src/pages/SchedulePage.tsx` — agenda view wiring, mobile default override, today-pill class, FAB mount, swap shift-click handlers to open peek.
- `src/components/schedule/WeekTimeGrid.tsx` — now-line overlay.
- `src/components/schedule/AgendaView.tsx` — new.
- `src/components/schedule/ShiftPeekPopover.tsx` — new.
- `src/components/schedule/MobileScheduleFab.tsx` — new.
