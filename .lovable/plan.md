## Goal
Let users disable automatic mileage tracking for a specific clinic (e.g. remote, telehealth, or clinics where they don't drive themselves).

## Changes

### 1. Database
Add `track_mileage boolean NOT NULL DEFAULT true` to `facilities`.

### 2. Mileage from Home card (`src/pages/FacilityDetailPage.tsx`)
Add a toggle "Track mileage for this clinic" at the top of the card.
- **On (default):** existing behavior — show fixed distance or "calculated automatically".
- **Off:** hide the distance editor; show muted text "Mileage tracking disabled for this clinic." Auto-mileage and backfill will skip it.

### 3. Auto-mileage tracker (`supabase/functions/auto-mileage-tracker/index.ts`)
Skip shifts whose facility has `track_mileage = false` (filter out before insert).

### 4. Backfill mileage (`supabase/functions/backfill-mileage/index.ts`)
Same filter — exclude facilities with `track_mileage = false` from preview and confirm.

### 5. Types
`src/types/index.ts` Facility type gets `track_mileage: boolean`. (`supabase/types.ts` auto-regens.)

## Out of scope
- No retroactive deletion of mileage already generated for that clinic (user can delete manually).
- No bulk toggle across clinics.
