## Add Shift Types to the Rate Card

### Goal
Let users define **named shift types** (e.g. GP Day, ER Weekend, Surgery, Dental, Emergency) directly in the Rate Card, each paired with their own rate. The selected type then flows into the actual shift record so it shows up across the schedule, invoices, and reports.

### UX changes — `SettingsRateCardPage`

Each rate row gets a new optional **Shift Type** field, restructured as:

```text
[ Shift Type ▾ ]   [ Rate Name (optional) ]   [ $ Amount /day ]   [ 🗑 ]
```

- **Shift Type** is a combobox: pick from common presets (GP, ER, Surgery, Dental, Emergency, On-Call, Wellness/Vaccine, Relief — Other) or type a custom value.
- **Rate Name** stays editable but auto-fills from the shift type + basis (e.g. picking "ER" on a daily row prefills "ER Day"). Users can still override.
- Existing duplicate/validation logic continues to apply to **rate name** (so "GP Day" can't appear twice).
- Section copy updated: "Set up a rate for each kind of relief shift you take. We'll suggest these whenever you add a shift or clinic."

Replace the 4 hard-coded presets in `onboardingRateMapping.ts` (`Standard Day / Weekend Day / Holiday Day / Emergency`) with shift-type-flavored seeds: **GP Day, ER Day, Surgery Day, Emergency / On-Call** (daily) and **GP Hour, ER Hour, After-hours** (hourly).

### Data model

**`default_rates` (JSONB on `user_profiles`)** — add one optional field per row:
```ts
interface DefaultRate {
  id: string;
  name: string;
  amount: number;
  basis: 'daily' | 'hourly';
  shift_type?: string;   // NEW — slug like 'gp', 'er', 'surgery', 'dental', 'emergency', 'oncall', 'wellness', 'other', or a custom string
  active: boolean;
  sort_order: number;
}
```
No SQL migration needed for this — `default_rates` is already a free-form JSONB array.

**`shifts` table — new column** (DB migration):
```sql
ALTER TABLE public.shifts ADD COLUMN shift_type text;
```
Nullable, no default, no constraint (free-form to allow custom types). Existing shifts stay `NULL`.

### Auto-population flow

1. **Add Clinic / Onboarding rates** (`mapDefaultRatesToRateEntries`): pass `shift_type` through into the `RateEntry` so facility terms snapshots remember which type each rate belongs to.
2. **Bulk shift dropdown** (`buildBulkRateOptions`): label becomes `GP Day — $850 /day` (uses shift type when present, falls back to current label).
3. **Shift create/edit** (`ShiftFormDialog`, `OnboardingShiftBuilder`, `ManualShiftForm`): when the user picks a rate, auto-set `shift_type` on the shift from the chosen rate. Also expose a small read-only "Shift type: ER" line under the rate selector so it's visible.
4. **Shift display**: surface `shift_type` as a small chip on shift cards in the Schedule list/calendar (next to the rate). Non-blocking — if `null`, show nothing.

### Files to touch

- `src/pages/SettingsRateCardPage.tsx` — add Shift Type combobox per row, auto-fill rate name, update section copy.
- `src/lib/onboardingRateMapping.ts` — add `shift_type` to `DefaultRate` + `RateEntry`-adjacent flows; refresh seed presets; preserve `shift_type` in `mapDefaultRatesToRateEntries`, `buildDefaultRatesFromRateEntries`, `buildBulkRateOptions`.
- `src/components/facilities/RatesEditor.tsx` (and its `RateEntry` type) — carry `shift_type` through the snapshot.
- `src/components/schedule/ShiftFormDialog.tsx`, `src/components/onboarding/OnboardingShiftBuilder.tsx`, `src/components/onboarding/OnboardingShiftStep.tsx`, `src/components/onboarding/ManualShiftForm.tsx` — when a rate is chosen, set `shift_type` on the shift payload.
- Schedule list/calendar shift card components — render the shift-type chip when present.
- DB migration — `ALTER TABLE shifts ADD COLUMN shift_type text;`
- `src/contexts/UserProfileContext.tsx` — `DefaultRate` type addition (mirrors the lib type).

### Out of scope (can follow later)
- Filtering/grouping reports by shift type.
- A dedicated "Shift Types library" page (deferred — current solution keeps types co-located with rates, which is what users asked for).
- Backfilling `shift_type` on historical shifts.

### Summary for the user
Each row in the Rate Card will let you pick (or type) a shift type — GP, ER, Surgery, Dental, Emergency, On-Call, etc. — alongside its rate. When you create a shift and pick that rate, the shift type is recorded automatically and shown on the shift card. Your existing rates won't break; the new field is optional and simply unlocks better categorization across schedule and reporting.