

# Automatic Mileage Tracker

## How It Works

When a shift ends (its `end_datetime` passes), the system auto-creates a **draft** mileage expense linked to that shift. The expense uses the IRS standard mileage rate and calculates distance from the user's home address (stored in `company_address` on their profile) to the facility's address using a geocoding/distance API. Users see a "Pending Review" badge and can confirm, adjust miles, or dismiss.

For multi-shift days, the default is a chained route (Home → A → B → Home) but users can switch to individual round-trips per shift. A small tooltip explains IRS commute rules without auto-excluding any miles.

## Architecture

```text
Shift ends → Edge function (cron, every 30 min) →
  1. Find shifts ended in last 60 min with no linked mileage expense
  2. For each shift, look up user's home address + facility address
  3. Call distance API (Google Maps or similar) for one-way miles
  4. For same-day multi-shift chains: compute optimized route
  5. Insert draft expense row (subcategory='mileage', status draft flag)
  6. User sees pending mileage entries in Expenses tab
```

## Database Changes

**Migration 1: Add columns to `expenses` table**
- `is_auto_mileage` boolean DEFAULT false — marks auto-generated mileage entries
- `mileage_status` text DEFAULT 'confirmed' — values: 'draft' | 'confirmed' | 'dismissed'
- `route_description` text DEFAULT '' — e.g. "Home → Paws Clinic → Home (44 mi)"

**Migration 2: Add `home_address` to `user_profiles` table**
- `home_address` text DEFAULT '' — separate from `company_address` (business address may differ from where they drive from)

**Migration 3: Add `mileage_override_miles` to `facilities` table**
- `mileage_override_miles` numeric NULL — optional manual override per facility

## Edge Function: `auto-mileage-tracker`

Scheduled via pg_cron every 30 minutes. Logic:
1. Query shifts where `end_datetime` is between now-60min and now, joined against expenses to exclude shifts that already have a mileage expense (`shift_id` match + `subcategory = 'mileage'`)
2. Group by user_id + date to detect multi-shift days
3. For each user-day group:
   - If facility has `mileage_override_miles`, use that value
   - Otherwise, call a geocoding/distance service to compute miles between home address and facility address
   - For chained routes (default): Home → Facility A → Facility B → Home
4. Insert expense rows with `is_auto_mileage = true`, `mileage_status = 'draft'`
5. Amount is calculated as `miles × irs_mileage_rate_cents` from user's `expense_config`

**Distance calculation**: Use a free/low-cost geocoding approach. Since relief vets typically work at the same facilities repeatedly, we cache facility coordinates in a new `facility_coordinates` jsonb column on facilities (lat/lng), so the API is only called once per facility. Distance is calculated as driving distance via a mapping API.

## API Key Requirement

We need a Google Maps Distance Matrix API key (or similar service). This will be stored as a secret (`GOOGLE_MAPS_API_KEY`) and used only in the edge function.

## UI Changes

### 1. Expenses tab — Mileage review section (ExpenseLogTab.tsx)
- When there are expenses with `mileage_status = 'draft'`, show a **yellow banner** at top: "You have X mileage entries to review"
- Each draft entry shows: date, facility name, miles, calculated amount, route description
- Actions per entry: **Confirm** (sets status to 'confirmed'), **Edit** (opens dialog with pre-filled miles), **Dismiss** (sets status to 'dismissed', removes from totals)
- Bulk action: "Confirm All" button

### 2. Facility detail — Mileage override (FacilityDetailPage.tsx)
- New small card: "Mileage from Home"
- Shows calculated distance if available, with an edit field to override
- Tooltip: "Set a fixed one-way distance to skip automatic calculation"

### 3. Settings or Profile — Home address (SettingsProfilePage.tsx)
- Add a "Home Address (for mileage)" field below `company_address`
- Helper text: "Used to calculate driving distance to clinics. Not shared."

### 4. IRS commute tooltip
- On mileage entries and the mileage review banner, a small info icon with tooltip: "Relief vets with no fixed office can typically deduct all business travel. Consult your CPA for your specific situation."

### 5. Multi-shift day handling
- When reviewing a multi-shift day, show a toggle: "Chain route" vs "Separate round-trips"
- Default: chained. Changing it recalculates the miles for that day's entries.

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/auto-mileage-tracker/index.ts` | Create — cron function |
| `src/components/expenses/MileageReviewBanner.tsx` | Create — draft mileage review UI |
| `src/components/expenses/ExpenseLogTab.tsx` | Modify — add banner + filter drafts |
| `src/hooks/useExpenses.ts` | Modify — add confirmMileage/dismissMileage actions |
| `src/pages/FacilityDetailPage.tsx` | Modify — add mileage override card |
| `src/pages/SettingsProfilePage.tsx` | Modify — add home address field |
| `src/contexts/UserProfileContext.tsx` | Modify — add `home_address` to interface |
| DB migration | Add columns to expenses, user_profiles, facilities |

## Sequence

1. Database migrations (add columns)
2. Add home address field to profile settings
3. Add mileage override to facility detail
4. Build edge function with distance calculation
5. Build mileage review banner + confirm/dismiss actions
6. Set up pg_cron schedule
7. Add IRS tooltip and multi-shift toggle

