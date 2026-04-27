# Diagnose & Fix: Rate Card Doesn't Autopopulate After Onboarding

## What's happening today

The user's "Rate Card" (set during onboarding) **does** autopopulate during the onboarding flow itself, but is **silently dropped everywhere else**. Here's the full picture:

### Where it works (onboarding only)
1. Onboarding step 1 saves rates to `user_profiles.default_rates` (via `UserProfileContext`).
2. `OnboardingPage` reads them, runs `mapDefaultRatesToRateEntries(defaultRates)`, and passes the result as `defaultRates` into `<AddClinicStepper hideRatesStep defaultRates={…}>` — so the first clinic inherits them.
3. `OnboardingBulkShiftCalendar` also receives `defaultRates` and uses `buildBulkRateOptions` to populate the rate dropdown for the first batch of shifts.

### Where it silently breaks (the rest of the app)

| Surface | File | Bug |
|---|---|---|
| "Add Practice Facility" dialog (Facilities page, Dashboard "Add clinic", Schedule "+ New Facility") | `src/components/AddFacilityDialog.tsx` | Mounts `<AddClinicStepper onSaved={…} />` with **no `defaultRates` prop** → the Rates step opens empty every time. |
| Shift creation / edit dialog | `src/components/schedule/ShiftFormDialog.tsx` (`buildRateOptions`) | Builds the rate dropdown **only from the selected facility's `terms_snapshots`**. Never consults `profile.default_rates`. So if a clinic was added before rates existed, or the user skipped the Rates step, the dropdown is empty and they have to type the amount manually. |
| Quick "Onboarding shift step" (legacy, still used in some flows) | `src/components/onboarding/OnboardingShiftStep.tsx` | The `rate` field is initialized to `''` regardless of the Rate Card. |

So a new user who carefully fills in their Rate Card sees their rates honored on the *very first* clinic + shift, then never again. From the user's POV the feature looks broken.

A secondary issue: `OnboardingShiftBuilder.tsx` (the smaller "log shifts" widget) hardcodes `defaultRate = 650` if no terms exist, instead of falling back to the user's Rate Card.

## Fix

Make the Rate Card a true global default. Two small wiring changes plus one tiny enhancement.

### 1. `AddFacilityDialog.tsx` — pass the saved Rate Card to the stepper

```ts
const { profile } = useUserProfile();
const defaultRates = useMemo(
  () => mapDefaultRatesToRateEntries(profile?.default_rates ?? []),
  [profile?.default_rates],
);

<AddClinicStepper
  ref={…}
  onSaved={handleSaved}
  defaultRates={defaultRates}
/>
```
Result: every "Add Clinic" entry point (Facilities, Dashboard, Schedule "+ New Facility") prefills the Rates step with the user's saved card. No new UI.

### 2. `ShiftFormDialog.tsx` — fall back to the Rate Card when the facility has no terms

In `buildRateOptions`, accept the user's `default_rates` and merge them in when the facility-specific list is empty. Reuse the existing helper:

```ts
import { buildBulkRateOptions } from '@/lib/onboardingRateMapping';

function buildRateOptions(
  terms: TermsSnapshot[],
  facilityId: string,
  defaultRates: DefaultRate[],
): RateEntry[] {
  const facilityTerms = terms.find(t => t.facility_id === facilityId);
  const fromFacility = facilityTerms ? termsToRates(facilityTerms).filter(r => r.amount > 0) : [];
  if (fromFacility.length > 0) return fromFacility;
  // Fallback: user's saved Rate Card (mapped to RateEntry shape)
  return mapDefaultRatesToRateEntries(defaultRates);
}
```

Inside the component, pull `profile.default_rates` from `useUserProfile()` and pass it in. The existing dropdown UI then "just works" — no design changes.

Also seed the initial `rate` state from the first option when creating a new shift (currently it stays `''` until the user clicks the dropdown), so the field is pre-filled and the auto-selected option is visible.

### 3. `OnboardingShiftStep.tsx` & `OnboardingShiftBuilder.tsx` — replace the hardcoded `650`

Use the same fallback chain: facility terms → user's Rate Card → blank (not `650`). This makes onboarding consistent and removes a magic number.

## Files modified

- `src/components/AddFacilityDialog.tsx` — read profile, pass `defaultRates`.
- `src/components/schedule/ShiftFormDialog.tsx` — extend `buildRateOptions` with Rate Card fallback; seed initial `rate` from the first option.
- `src/components/onboarding/OnboardingShiftStep.tsx` — initialize `rate` from Rate Card / first facility rate.
- `src/components/onboarding/OnboardingShiftBuilder.tsx` — replace `650` hardcode with Rate Card lookup.

## Verification

- New user: fill Rate Card → finish onboarding → click "Add clinic" from Facilities → Rates step is pre-filled with their card.
- Existing clinic with empty terms → open "New shift" → rate dropdown shows their Rate Card entries instead of being empty.
- Facility *with* its own terms → unchanged behavior (facility-specific rates still win).
- No DB schema changes, no new tables, no migrations.