# Onboarding Simplification

Five focused changes to streamline the 6-step onboarding into a tighter flow.

## 1. Rate Card (Step 1/6) — only Per Day & Per Hour

`src/components/onboarding/OnboardingRateCard.tsx`

- Reduce `PREF_OPTIONS` from 4 tiles to 2: **Per Day**, **Per Hour**. Remove **Both** and **I'm not sure yet**.
- Change grid from `grid-cols-2` (4 tiles) to `grid-cols-2` with just two tiles (already correct visual).
- Default `preference` falls back to `'per_day'` when an old profile carries `'both'` or `'unsure'`.
- Replace the dollar amounts in the preset rate rows with **empty values** so users type their own. Update `DAILY_PRESETS` and `HOURLY_PRESETS` in `src/lib/onboardingRateMapping.ts` to use `amount: 0` (names stay; the input already renders blank when amount is 0).
- Add subheading copy directly under the two tiles: **"Enter your rates here, keep the dollar entry fields empty if a rate doesn't apply to you."**
- Validation in `handleRateCardContinue` already requires at least one named rate with amount > 0 — keep that guard.

## 2. Billing Cadence (inside Add Clinic step, 2/6) — relabel & reorder

`src/components/facilities/AddClinicStepper.tsx` (`BILLING_CADENCES` array, line 58)

Reorder left → right and rename labels (descriptions/`example` text unchanged):

| Order | value | New label |
|-------|-------|-----------|
| 1 | `daily` | After each shift completes |
| 2 | `weekly` | After all the shifts complete in a week |
| 3 | `monthly` | After all the shifts that complete in a month |

Drop the `recommended` flag from monthly (no longer first). Underlying `value` strings unchanged → no migration needed.

## 3. Split bulk-shift step (3/6) into two screens

`src/components/onboarding/OnboardingBulkShiftCalendar.tsx`

Currently date picker + time pickers + rate dropdown live on one screen. Split into a 2-screen mini-flow inside the same `bulk_shifts` phase:

- **Screen A — Pick dates**: calendar + selected-count line. Footer primary becomes **"Continue"** (disabled until ≥1 date selected).
- **Screen B — Set time & rate**: shows the saved rate dropdown (same `rateOptions` as today, prefilled from the previously saved Rate Card / clinic terms) + start/end time. Header summarizes "X dates at {facility.name}". Footer primary stays **"Add N shifts"**, secondary back-link returns to Screen A.

Implement via a local `subStep: 'dates' | 'details'` state inside `OnboardingBulkShiftCalendar`. The render-prop footer already supports dynamic label/disabled — extend it with an extra back handler so the parent can render the screen-B back button.

## 4. Auto-advance after shifts are created (skip "See my invoices →" tap)

`src/pages/OnboardingPage.tsx` + `src/components/onboarding/OnboardingBulkShiftCalendar.tsx`

- Remove the post-create success state that asks the user to click **"See my invoices →"**.
- After `handleSubmit` finishes successfully and `onShiftsCreated` has fired, the parent immediately advances to `invoice_reveal` (Step 4/6).
- Concretely: in `OnboardingPage.handleShiftsCreated`, after persisting `session_shift_ids`, call `setPhase('invoice_reveal')` and `persist({ phase: 'invoice_reveal' })`.
- Drop the `created` success banner + "See my invoices" footer branch from `OnboardingBulkShiftCalendar`. The brief "N shifts saved" toast already provides confirmation.

## 5. Skip Step 5/6 (Loop Choice) — go straight to 6/6

`src/pages/OnboardingPage.tsx`

- In `handleAdvanceToLoopChoice` (the Continue button on `invoice_reveal`), set phase to **`business_map`** instead of `loop_choice`.
- Update `PHASE_BACK.business_map` from `'loop_choice'` to `'invoice_reveal'`.
- Remove `loop_choice` from `PHASE_STEP` / `PHASE_LABEL` and renumber so the visible total drops from 6 to **5 steps**:

```text
1. Welcome (hidden in progress bar)
2. Set up your rates
3. Add your first clinic
4. Add your shifts
5. See your invoices
6. Your business in one place
```

Set `TOTAL_STEPS = 5` and re-map:
```text
welcome=0, rate_card=1, add_clinic=2, bulk_shifts=3, invoice_reveal=4, business_map=5
```
Loop-choice phase + `OnboardingLoopChoice` import are removed from the page (file kept on disk; no longer routed). Users add more clinics/shifts from the main app afterwards.

## Technical notes

- `OnboardingPhase` union in `src/contexts/UserProfileContext.tsx` keeps `loop_choice` for backward compatibility with persisted profiles; if a returning user is hydrated into that phase, coerce it to `business_map` on hydrate.
- `BillingPreference` type stays as-is to avoid migrations; old `'both'`/`'unsure'` values are coerced to `'per_day'` on load in `OnboardingRateCard`.
- Existing analytics events kept; `onboarding_invoice_continue_clicked` still fires when the user taps Continue on invoice reveal (now leading to `business_map`).
- No DB migrations required.
