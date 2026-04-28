# Skip rates step for platform/agency clinics

## What we will change

When a user adds a clinic via **platform or agency** (`third_party`) or as a **W-2 employer**, the "Rates" step in the Add Clinic flow will be removed entirely. Users will enter shift-specific rates later when they log shifts, since platform/agency rates vary per shift.

## Files modified

- `src/components/facilities/AddClinicStepper.tsx`

## Technical details

1. **Hide Step 3 (Rates) for non-direct engagements**
   Update the `visibleSteps` array so Step 3 only appears when:
   - `hideRatesStep` prop is false (existing behavior), **AND**
   - `engagementType === 'direct'` (new guard)

   ```text
   Before: if (!hideRatesStep) arr.push(3);
   After:  if (!hideRatesStep && isDirect) arr.push(3);
   ```

2. **Do not persist terms for non-direct clinics**
   In the save handler, change the terms-snapshot guard from `engagementType !== 'w2'` to `isDirect`, so no default terms are created for third-party or W-2 clinics. Rates will be created per-shift via the existing `saveCustomRateToTerms` logic in `ShiftFormDialog`.

   ```text
   Before: if (engagementType !== 'w2' && rates.length > 0)
   After:  if (isDirect && rates.length > 0)
   ```

3. **Flow impact**
   - Direct clinic: 4 steps (Identity → Engagement → Rates → Billing)
   - Platform/Agency or W-2 clinic: 2 steps (Identity → Engagement)
   - After saving, the user lands back in the calling context (e.g., the shift form auto-advances to date/rate selection if opened from Add Shift)
