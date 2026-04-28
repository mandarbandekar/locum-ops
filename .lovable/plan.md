# Shift creation flow — two fixes

## Issue 1 — Custom rate not saved when clinic has no terms snapshot

**What's happening:** When a user adds a new clinic via "Choose via platform" (e.g. Roo) inside the Add Shift flow, no `terms_snapshots` row is created (the AddClinicStepper only inserts terms when `rates.length > 0`, and the platform/agency path typically skips the Rates step). Then in `ShiftFormDialog`, when the user enters a custom rate and ticks "Save to facility", `saveCustomRateToTerms()` silently no-ops because of this guard:

```ts
const facilityTerms = terms.find(t => t.facility_id === facilityId);
if (facilityTerms) { /* ...update with new custom rate */ }
// else: nothing happens — custom rate is lost
```

Result: the next time the user picks that clinic, the custom Roo rate is missing from the rate dropdown.

**Fix (`src/components/schedule/ShiftFormDialog.tsx`):**
Replace the `if (facilityTerms)` block in `saveCustomRateToTerms` so it also creates a fresh terms snapshot when none exists for the facility. `updateTerms` in `DataContext` already handles the "no matching id → insert" case, so we just call it with a new generated id and the single custom rate populated.

```ts
if (facilityTerms) {
  // existing update path (dedupe + append)
} else {
  await updateTerms({
    id: generateId(),
    facility_id: facilityId,
    weekday_rate: 0, weekend_rate: 0, partial_day_rate: 0,
    holiday_rate: 0, telemedicine_rate: 0,
    cancellation_policy_text: '', overtime_policy_text: '',
    late_payment_policy_text: '', special_notes: '',
    custom_rates: [{ label, amount: Number(rate), kind: customRateKind }],
  });
  toast.success(`Custom rate "${label}" saved to ${facilityName}`);
}
```

This makes the saved custom rate appear in `buildRateOptions(...)` on the next shift entry for that clinic.

## Issue 2 — "Add Clinic" inside Add Shift should drop user back into the regular flow

**What's happening:** From Add Shift Step 1, choosing "Add New Facility" opens `AddFacilityDialog`. After saving, the new clinic becomes selected but the wizard stays on Step 1 — the user has to manually click "Next" to reach the date/rate step.

**Fix (`src/components/schedule/ShiftFormDialog.tsx`):**
Update both `AddFacilityDialog` `onCreated` callbacks (the inline form Step 1 and the legacy edit-mode placement around line 1224) so that after the clinic is created we:
1. Select the new clinic via `handleFacilityChange(newId)`
2. Immediately advance the wizard to Step 2 (`setStep(2)`) — the schedule/date step
3. Show a brief confirmation toast ("Clinic added — pick a date") so the transition is obvious

```tsx
onCreated={(newId) => {
  handleFacilityChange(newId);
  setStep(2);
}}
```

Step 2 already auto-seeds the rate from the first available option (facility terms or rate card), so the user lands directly in the date/time/rate step with sane defaults — matching the regular flow they'd get when picking an existing clinic.

## Files touched
- `src/components/schedule/ShiftFormDialog.tsx` — patch `saveCustomRateToTerms` and both `AddFacilityDialog` `onCreated` handlers.

No DB migrations, no schema changes, no other files affected.
