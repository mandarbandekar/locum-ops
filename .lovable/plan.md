# Diagnosis: hourly $160 rate became flat $850/day

## What I found in the account

User `mandarbandekar9@gmail.com` (`292d7911…`) onboarded just before reporting this.

- 1 facility: **Oakridge Veterinary Clinic** (engagement = `direct`)
- **0 rows in `terms_snapshots`** for this user — i.e. the clinic has **no saved rates at all**
- 11 shifts, every one of them: `rate_applied = 850`, `rate_kind = flat`, `hourly_rate = NULL`

So the database confirms two things at once:
1. The hourly $160 the user typed **never made it into `terms_snapshots`**.
2. The shifts were all created with the hard-coded **"Standard Day — $850 /day"** fallback.

## Root cause (two bugs stacked)

### Bug 1 — The Rates step in AddClinicStepper was silently skipped
In `src/components/facilities/AddClinicStepper.tsx`:
```ts
const visibleSteps = [1, 2];
if (!hideRatesStep && isDirect) arr.push(3);   // Rates
if (isDirect) arr.push(4);                     // Billing
```
`engagementType` defaults to `'direct'`, so step 3 is included **on first render**. But `useMemo` recomputes `visibleSteps` whenever `engagementType` changes. If the user ever toggles engagement (or the EngagementSelector re-emits the value), the step list rebuilds — and there's no guard that keeps already-entered rates in `terms_snapshots`. More importantly, `handleSave` writes the rate snapshot only when:
```ts
if (isDirect && rates.length > 0) { await updateTerms(...) }
```
There is **no validation that the user actually visited / completed step 3** before clicking Save Clinic. If `rates` is empty (because the user typed in the input but never blurred / committed, or skipped the step, or the state was reset by a re-render), the clinic is saved with no terms_snapshot — exactly what we see in the DB.

### Bug 2 — The Bulk Shift Calendar's "Standard Day $850" fallback silently overrides empty rates
In `src/components/onboarding/OnboardingBulkShiftCalendar.tsx` (lines 88–97):
```ts
const rateOptions = useMemo(() => {
  const opts = buildBulkRateOptions({ rateEntries, defaultRates });
  if (opts.length > 0) return opts;
  return [
    { id: 'fallback:standard-day:850', label: 'Standard Day — $850 /day', amount: 850, basis: 'daily' },
  ];
}, [rateEntries, defaultRates]);
```
When the clinic has no `terms_snapshot` AND the user has no global Rate Card (the new flow we just shipped removed the mandatory Rate Card step), `rateEntries = []` and `defaultRates = []` → the fallback kicks in. The dropdown auto-selects "Standard Day — $850 /day", and the bulk calendar happily creates 11 flat-$850 shifts. The user never sees their $160 hourly rate because **it was never saved**, and the fallback masks the problem entirely.

This matches the screenshots: the second screenshot shows the Edit Shift dialog defaulting to Flat $850 with a "Save to facility rates" checkbox — confirming the facility had no rates and the bulk creator wrote the fallback into every shift.

## Why this is a real, recurring problem

The combination is dangerous:
- Removing the mandatory Rate Card step (recent change) is the right product call, **but** it removed the only thing that was guaranteeing `defaultRates` was non-empty.
- The clinic-level Rates step is **optional / skippable** (`canSkip = step === 3`).
- The bulk calendar's "never empty" fallback was originally a UX safety net, but now it actively writes incorrect data without telling the user.
- The shift form's "Save to facility rates" is opt-in, so even after editing, the wrong rate persists on past shifts.

Net effect: any user who skips/mis-enters rates on the clinic step gets 11 shifts at flat $850 with zero warnings.

## Proposed fix

### 1. Remove the silent $850 fallback in the Bulk Shift Calendar
File: `src/components/onboarding/OnboardingBulkShiftCalendar.tsx`

- Drop the `fallback:standard-day:850` synthetic option.
- When `rateOptions.length === 0`, render an inline empty-state inside the rate field:
  - Headline: "No rate saved for this clinic yet."
  - Body: "Add at least one rate so we can apply it to these shifts."
  - Primary action: **"+ Add a rate"** → opens a tiny inline rate row (label + flat/hourly + amount), saves to `terms_snapshots` for this facility on commit.
- Disable the primary "Add shifts" CTA (`primaryDisabled = true`) until at least one rate exists.

### 2. Make the AddClinicStepper Rates step "required-soft" for direct clinics
File: `src/components/facilities/AddClinicStepper.tsx`

- Keep step 3 skippable, but on Save Clinic, if `isDirect && rates.length === 0`, show a non-blocking confirm toast:
  - "You haven't added a rate yet. You can add one now or set it later when logging shifts."
  - Buttons: **"Add a rate"** (jumps back to step 3) / **"Save without rate"** (proceeds).
- Persist the chosen behavior in analytics (`onboarding_clinic_saved_without_rates`).

### 3. Tighten the rate state on step 3
- When the user types into a `RatesEditor` row but hasn't committed (no blur), call `onSave(rates)` automatically before `handleSave` runs in the stepper. This eliminates the "rate typed but lost on save" failure mode.

### 4. Backfill helper for affected accounts (one-shot)
- Add a small script (server-side, run manually) to find users whose first cohort of shifts share `rate_applied = 850, rate_kind = flat` and whose facility has no `terms_snapshot` — surface them so we can reach out / they can correct.
- Not auto-fixing data (we don't know what their real rate was), just surfacing for outreach.

## Out of scope for this fix

- Reworking the shift card's "Save to facility rates" semantics.
- Building a "you used the same rate on N shifts — promote it to the clinic?" prompt (good idea, separate ticket).
- Touching the global Rate Card UX (already simplified in the prior change).

## Files to change

- `src/components/onboarding/OnboardingBulkShiftCalendar.tsx` — remove fallback, add empty-state + inline add rate.
- `src/components/facilities/AddClinicStepper.tsx` — soft-required Rates step + auto-commit pending rate edits before save.
- `src/lib/onboardingAnalytics.ts` — add `onboarding_clinic_saved_without_rates` event.
- `src/test/onboardingHardening.test.ts` — replace the "Standard Day $850 fallback" assertion with the new empty-state behavior.

## Note on the affected user

`mandarbandekar9@gmail.com` currently has 11 shifts at $850 flat against Oakridge Veterinary Clinic and no facility rate snapshot. After the fix, they'll need to:
1. Add the correct hourly $160 rate on the clinic, then
2. Bulk-edit (or delete + recreate) the 11 shifts to apply it.

I can include a one-time data outreach list in the implementation step if you want.
