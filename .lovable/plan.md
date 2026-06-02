# Expose Biweekly Billing Cadence (Frontend Only)

Backend already supports biweekly with `facilities.billing_cycle_anchor_date`. This plan adds biweekly as a selectable option in the 4 clinic-setup surfaces and captures the required anchor date. **No backend, migration, edge function, RLS, or `billing_week_end_day` changes.**

## Shared rules (all 4 files)

- Anchor stored as `YYYY-MM-DD` string (no time, no tz).
- Anchor date picker (shadcn `Popover` + `Calendar`, format → `YYYY-MM-DD`) appears **only** when cadence === `biweekly`.
- Label: **"First pay period starts on"**
- Helper: *"Pick the start date of any one of this clinic's pay periods — invoices repeat every 14 days from this date."*
- Cadence helper (under control when biweekly): *"One invoice every two weeks, aligned to the clinic's payroll cycle. Draft generates on the morning of your last scheduled shift in each 14-day period."*
- Save/Continue blocked with inline message if biweekly + no anchor.

## Per-file changes

### 1. `src/components/facilities/InvoicingPreferencesCard.tsx`
- Add `<SelectItem value="biweekly">Biweekly</SelectItem>` to cadence Select.
- Local state `anchorDate`, initialized from `facility.billing_cycle_anchor_date`.
- Render anchor picker + biweekly helper text when `billingCadence === 'biweekly'`.
- In `persistChanges`, replace `billing_cycle_anchor_date: null` with `cadence === 'biweekly' ? anchorDate : null`.
- Add anchor-required check inside `handleSave`; preserve existing `showCadenceConfirm` regrouping flow.

### 2. `src/components/facilities/AddClinicStepper.tsx`
- Add to `BILLING_CADENCES` array:
  ```ts
  { value: 'biweekly', label: 'Every two weeks (aligned to clinic payroll)',
    example: 'One invoice every 14 days, drafted on your last shift of each period. Common for corporate clinics.' }
  ```
- Add `anchorDate` state; render picker in cadence section when biweekly.
- Insert payload: `billing_cycle_anchor_date: billingCadence === 'biweekly' ? anchorDate : null`. Leave `billing_week_end_day: 'saturday'`.
- `previewDueDate`: handle biweekly like other non-daily cases (~14 days out).
- Add anchor to `canSave` and its `useMemo` deps.

### 3. `src/components/onboarding/ManualFacilityForm.tsx`
- Add `<SelectItem value="biweekly">Biweekly</SelectItem>` to cadence Select.
- Add `anchorDate` state; render picker when biweekly.
- In `onSave` payload, set `billing_anchor_date: billingCadence === 'biweekly' ? anchorDate : undefined` (keep field name `billing_anchor_date` — mapped downstream in `useManualSetup`).
- Block submit when biweekly + missing anchor (inline message + disable button).

### 4. `src/components/invoice/InvoiceOnboardingStepper.tsx`
- `CADENCE_OPTIONS` & persist path already handle biweekly. Only the input is missing.
- For each facility row where `config.billing_cadence === 'biweekly'`, render compact anchor date input wired to `updateConfig(fac.id, { biweekly_anchor_date: '<YYYY-MM-DD>' })`. Use exact field name `biweekly_anchor_date`.
- Block step's continue/finish while any biweekly facility lacks an anchor; message names the facility.

## Out of scope / guardrails
- No changes to daily / weekly / monthly behavior.
- No rename of existing fields (each file keeps its current anchor field name).
- No `billing_week_end_day` work.
- No backend, migration, edge function, RLS, or invoice-generation changes.
- No reformatting of untouched lines.

## Verification (to report back after build)
1. Biweekly selectable in all 4 surfaces.
2. Anchor picker shows only for biweekly; required to save/continue in all 4.
3. Saved anchor persists as `YYYY-MM-DD` on `facilities.billing_cycle_anchor_date` via each path.
4. Daily / weekly / monthly unchanged.
5. No backend / migration / edge function / `billing_week_end_day` changes.
6. Files changed = exactly the 4 above.
