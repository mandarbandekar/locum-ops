

# Spotlight Tour: Show Once, Then Only on Manual Trigger

## Current State

The tour system already mostly works this way:
- **Module tours** (Tax, Credentials, Schedule, etc.) auto-trigger once on first visit via `useEffect` that checks `localStorage`
- **Dashboard tour** auto-triggers once for new users, then only via the header "Take a Tour" button
- `closeTour()` always marks the tour as completed in `localStorage`

However, there's one issue: the **Layout.tsx "Take a Tour" button** calls `localStorage.removeItem()` to reset the dashboard key before triggering. If the user clicks "Take a Tour", the key is removed. If they then navigate away before the tour closes (or refresh), the tour will auto-trigger again because the completed flag was wiped.

## Changes

### Modified: `src/hooks/useSpotlightTour.ts`
- Remove the `resetTour` function entirely (no longer needed)
- Keep `startTour` as the only way to manually open a tour — it opens the tour without resetting the completed flag
- Keep `closeTour` marking completed in localStorage (no change)
- Keep auto-start logic for module tours gated on `!isTourCompleted` (no change)

### Modified: `src/components/Layout.tsx`
- Simplify the "Take a Tour" button handler: just dispatch the `locumops:start-tour` custom event (or navigate to dashboard and let the event fire)
- **Stop removing** the `locumops_tour_completed` localStorage key — the tour opens via `startTour()` directly, not by resetting state
- This ensures closing the tour always leaves it marked as completed, and it never auto-triggers again

### Result
- First visit to any module → tour auto-triggers once
- After completion → never auto-triggers again
- User clicks "Tour" button on any page → tour opens manually regardless of completed state
- Closing always marks completed — no accidental re-triggers on refresh

No new files, no DB changes. Two small edits.

