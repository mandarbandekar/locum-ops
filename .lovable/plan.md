## Goal
Remove the "Layers" filter UI from the schedule calendar. Credentials and subscriptions should always be shown on the calendar alongside shifts, so users automatically see license/subscription expiry dates without needing to toggle them on.

## Changes

1. **Remove the Layers control**
   - Delete the `CalendarFilters` component usage from the schedule page (and remove the layers icon button / popover that wraps it).
   - The `src/components/schedule/CalendarFilters.tsx` file will no longer be referenced — leave the file in place but unused, or remove it. Plan: remove it to keep the codebase clean.

2. **Always render credential + subscription events**
   - In the schedule page / month + week views, replace the `filters` state with a constant where `credentials: true` and `subscriptions: true` are always on.
   - Update calls to `getEventsForDay(day, filters)` to pass `{ credentials: true, subscriptions: true }` directly.
   - Shifts remain always-on as they are today.

3. **Keep the visual treatment**
   - Credential events keep their emerald dot/pill, subscription events keep their violet dot/pill, shifts keep primary styling — only the toggle chips disappear.
   - Day cells and the "+N more" overflow logic stay identical.

4. **Tests**
   - `src/test/calendarLayers.test.ts` currently tests the toggle logic ("should allow toggling filters independently"). Update or remove that test case; keep the event-placement and status-computation tests since the underlying event logic is unchanged.

## Files to touch
- `src/pages/SchedulePage.tsx` (and any month/week view components under `src/components/schedule/` that consume `CalendarLayerFilters`) — remove filter state, remove `<CalendarFilters />`, hardcode credentials + subscriptions to visible.
- `src/components/schedule/CalendarFilters.tsx` — delete.
- `src/test/calendarLayers.test.ts` — drop the toggle test, keep event/status tests.

## Out of scope
- No changes to how credentials or subscriptions are created, stored, or styled.
- No changes to the ICS / Google Calendar sync feed.
- No changes to the shifts layer.
