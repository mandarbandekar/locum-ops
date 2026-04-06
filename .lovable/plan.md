

# Backfill Mileage for Past Shifts

## Problem

The auto-mileage tracker only processes shifts that ended in the last 60 minutes. Users with existing historical shifts have no way to generate mileage entries for them, leaving potential deductions unclaimed.

## Solution

Add a "Backfill Past Shifts" feature to the Mileage Tracker tab. A new edge function handles the heavy lifting (distance lookups), and the UI provides a guided flow: preview eligible shifts, select which ones to process, then generate mileage entries in draft status for review.

## How It Works

### 1. New Edge Function: `backfill-mileage`

Accepts a POST with the user's JWT and an optional date range filter. Logic mirrors `auto-mileage-tracker` but operates on all past shifts:

- Fetches all shifts for the authenticated user that do NOT already have a mileage expense (`is_auto_mileage = true`)
- Looks up home address from `user_profiles` and facility addresses from `facilities`
- Uses `mileage_override_miles` first, then Google Maps Distance Matrix API as fallback
- Returns a preview list (shift date, facility name, estimated miles, estimated deduction) without inserting anything
- A second mode (`action: "confirm"`) accepts selected shift IDs and inserts the mileage expenses as `mileage_status: 'draft'`

This two-step approach lets users preview before committing.

### 2. UI: Backfill Card in MileageTrackerTab

Show a card between the setup status and pending review sections:

- **When no backfill has been run**: Card says "Have past shifts? Import mileage for previous work" with a "Scan Past Shifts" button
- **After scanning**: Shows a list of eligible shifts with checkboxes (date, facility, estimated miles, estimated deduction). Select all / deselect all. "Generate Mileage Entries" button
- **Processing state**: Progress indicator while the edge function inserts
- **Done state**: Success message with count, entries appear in the draft review banner

The card is dismissible and remembers dismissal in localStorage.

### 3. Hook: `useBackfillMileage`

New hook that manages:
- `scan()` — calls the edge function in preview mode, returns eligible shifts
- `confirm(shiftIds)` — calls the edge function in confirm mode
- Loading/error states
- Eligible shift list state

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/backfill-mileage/index.ts` | **Create** — Edge function with preview + confirm modes |
| `src/hooks/useBackfillMileage.ts` | **Create** — Hook wrapping the edge function calls |
| `src/components/expenses/MileageBackfillCard.tsx` | **Create** — UI card with scan, select, confirm flow |
| `src/components/expenses/MileageTrackerTab.tsx` | Import and render `MileageBackfillCard` between setup status and review banner |
| `src/hooks/useExpenses.ts` | Add `reload` to the returned interface (already exists) so backfill can trigger a refresh |

## Edge Function API

```
POST /backfill-mileage
Authorization: Bearer <jwt>
Body: { action: "preview" } | { action: "confirm", shiftIds: string[] }

Preview response: { shifts: [{ id, facility_name, shift_date, estimated_miles, estimated_deduction_cents }] }
Confirm response: { inserted: number }
```

## Technical Notes

- Reuses the same distance calculation logic as `auto-mileage-tracker` (override → Google Maps → skip)
- All generated entries are `is_auto_mileage: true`, `mileage_status: 'draft'` so they appear in the review banner
- The edge function authenticates via JWT (extracts user_id from token) rather than service-role-only
- Shifts already linked to a mileage expense (via `shift_id` in expenses table) are excluded from the preview
- In demo mode, the hook generates mock preview data from the local shifts/facilities context

