## Goal

Make the onboarding "add clinic + rates + shifts" flow durable and consistent with the rest of the app, so:

1. Rates entered during onboarding are reliably saved **per clinic** (in `terms_snapshots`).
2. Those saved per-clinic rates show up automatically as picker options whenever the user logs a shift for that clinic — both in onboarding and in the main `ShiftFormDialog`.
3. When the user adds a new clinic later from the Dashboard, the same per-clinic rate flow is used (no global default forced on them).
4. Existing users (who already have clinics, terms, shifts, invoices) are not disrupted.

## Diagnosis (what's actually broken today)

There are three independent issues compounding in the reported bug:

### Issue 1 — Schema mismatch causing silent rate-save failure

`src/components/facilities/RatesEditor.ts` `ratesToTermsFields()` always returns a `rate_shift_types` object on every save. But the `terms_snapshots` table has **no `rate_shift_types` column** (verified against the live schema):

```text
id, user_id, facility_id, weekday_rate, weekend_rate, partial_day_rate,
holiday_rate, telemedicine_rate, custom_rates, rate_kinds,
cancellation_policy_text, overtime_policy_text, late_payment_policy_text,
special_notes, created_at, updated_at
```

PostgREST rejects the insert with `PGRST204` ("column rate_shift_types does not exist"), so **the rate row is never written**. This is why `mandarbandekar9@gmail.com`'s clinic ended up with zero rows in `terms_snapshots`.

### Issue 2 — `updateTerms` swallows the error

In `src/contexts/DataContext.tsx` (`updateTerms`), insert/update errors are toasted and `return`ed — they are **not thrown**. The caller (`AddClinicStepper.handleSave`) then proceeds to `onSaved(facility.id)` as if rates were saved, and the onboarding advances to "Add Shifts" with an orphaned clinic.

### Issue 3 — Onboarding shift step has no awareness of "rates failed to save"

`OnboardingBulkShiftCalendar` just looks at `terms` from `DataContext`. If the row never landed, the user sees the empty-state inline rate form (recently added) and is asked to re-enter the rate they thought they already saved. That UX is what made the user say "the whole flow seems broken."

## Proposal

### Part A — Fix the persistence bug (minimal, surgical)

**A1. Migration: add the missing `rate_shift_types` jsonb column.**

```sql
ALTER TABLE public.terms_snapshots
ADD COLUMN IF NOT EXISTS rate_shift_types jsonb NOT NULL DEFAULT '{}'::jsonb;
```

This is purely additive, defaults to `{}`, and is backward compatible with all existing rows (they keep working; `termsToRates` already handles missing values via `terms.rate_shift_types || {}`).

**A2. Make `updateTerms` throw on failure.**

Change `updateTerms` in `src/contexts/DataContext.tsx` so DB errors are re-thrown instead of just toasted. This lets `AddClinicStepper` and `OnboardingBulkShiftCalendar` block progression when a save fails.

**A3. Make `AddClinicStepper.handleSave` await + guard the rates save.**

Wrap the `updateTerms` call in try/catch. If it throws, surface a clear toast ("Could not save rates for this clinic — please try again") and stop the flow on step 3 instead of advancing to "Add Shifts."

### Part B — Unify rate options across onboarding and main app

The good news: `ShiftFormDialog.buildRateOptions` already merges facility terms + the user's Rate Card library. Once Part A lands, per-clinic rates will reliably appear in this picker.

`OnboardingBulkShiftCalendar` already uses `buildBulkRateOptions({ rateEntries, defaultRates })` from the same source of truth (`terms`). So no refactor needed here once Part A works.

**B1. Add a small integration test in `src/test/onboardingHardening.test.ts`** asserting:

- `ratesToTermsFields()` output round-trips through a mock DB insert that mirrors the real columns (so this regression can't reappear silently).
- After saving rates via `AddClinicStepper`, `buildBulkRateOptions` returns the saved entries.
- After saving rates via `AddClinicStepper`, `ShiftFormDialog.buildRateOptions` (extracted as a pure helper if needed) includes those entries with `source: 'facility'`.

### Part C — Clinic adds from Dashboard reuse the same flow

`AddClinicStepper` is already the shared component used by both onboarding (`OnboardingClinicForm`) and the in-app "Add Facility" path (`AddFacilityDialog` / `FacilitiesPage`). Once Part A lands, the per-clinic rate save works identically in both places — no additional change required.

**C1. Keep the inline "Add a rate" empty state in `OnboardingBulkShiftCalendar`** as a safety net for direct clinics where the user genuinely skipped the rates step. After Part A, this becomes a real edge case (intentional skip), not a workaround for a bug.

### Part D — Existing-user safety

- The migration is purely additive with a safe default; no existing row is touched and no existing query breaks.
- `termsToRates` already tolerates missing `rate_shift_types` via `terms.rate_shift_types || {}`.
- `ShiftFormDialog`'s rate picker already merges facility terms with the user's Rate Card library, so existing users who relied on the global Rate Card continue to see their rates exactly as before — we're only **fixing** the "per-clinic rates didn't save" path.
- The legacy auto-complete guard in `OnboardingPage` is unaffected.

## Files to change

- **Migration**: add `rate_shift_types jsonb DEFAULT '{}'` to `terms_snapshots`.
- `src/contexts/DataContext.tsx` — `updateTerms` rethrows on error.
- `src/components/facilities/AddClinicStepper.tsx` — await + try/catch around `updateTerms`; block progression on failure.
- `src/test/onboardingHardening.test.ts` — add round-trip + picker assertions.

## Out of scope (intentionally)

- No refactor of `OnboardingBulkShiftCalendar`'s inline rate form — Part A makes it a true edge-case helper, not a workaround.
- No changes to `ShiftFormDialog`'s rate picker logic — it already does the right thing.
- No changes to the global Rate Card — we keep it optional, exactly as the previous proposal established.
