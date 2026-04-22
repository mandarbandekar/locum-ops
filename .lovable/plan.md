

## Add Hourly Rate Support for Clinics & Shifts

### Background

Today, every rate is a **flat amount per shift** (a "day rate"). `terms_snapshots` stores `weekday_rate`, `weekend_rate`, etc. as flat numbers, and `shifts.rate_applied` is a single computed total. Memory rule: shifts display as `$850`, never `$/hr`. Users now want the option to enter rates as **hourly** so the shift total can be calculated from start/end times.

### Proposal: Per-rate "rate kind" (flat vs hourly)

Make rate kind a property of **each rate entry**, not a global setting. A facility can have a flat weekday rate ($850/day) AND an hourly weekend rate ($95/hr) side by side. This matches how locum vets actually negotiate.

#### 1. Data model (one schema migration)

**`terms_snapshots`** — add structured rate kind without breaking existing flat fields:
- New column `rate_kinds jsonb default '{}'` storing `{ weekday: 'flat' | 'hourly', weekend: 'hourly', ... }`. Default `'flat'` when missing → fully backwards compatible. Existing `weekday_rate` numeric column doubles as either day rate or hourly rate depending on `rate_kinds.weekday`.
- `custom_rates` jsonb gains an optional `kind: 'flat' | 'hourly'` per entry.

**`shifts`** — capture how the total was derived so totals stay correct if a facility's rate later changes:
- `rate_kind text default 'flat'` — `'flat'` or `'hourly'`.
- `hourly_rate numeric` — populated only when `rate_kind='hourly'`. `rate_applied` continues to store the **computed total for the shift** (hourly_rate × hours), so all existing dashboard/invoice/tax math keeps working unchanged.

#### 2. UI changes

**RatesEditor (facility setup + facility detail "Shift Rates")**
- Each rate row gets a small `Flat / Hourly` toggle (segmented control) next to the amount.
- Amount input adapts its suffix: `/day` for flat, `/hr` for hourly.
- Helper text under hourly rates: "Total per shift will be calculated from shift hours."

**ShiftFormDialog (Step 3 — Rate)**
- Rate selector lists facility rates labeled clearly: `Weekday — $850/day` or `Weekend — $95/hr`.
- When the user picks an hourly rate (or chooses "Custom" + Hourly), a live calculation line appears:  
  `8.5 hrs × $95/hr = $807.50`  
  recomputing as start/end times change.
- Custom rate entry also exposes the Flat/Hourly toggle.
- On save: persist `rate_kind`, `hourly_rate` (if hourly), and the computed `rate_applied` total.

**Onboarding (ManualFacilityForm + first-shift step)**
- "Default day rate" field becomes "Default rate" with a Flat/Hourly toggle. Copy: "Most relief shifts are flat day rates — switch to hourly if you bill by the hour."

#### 3. Display rules (preserves existing memory rule)

- **Computed shift totals** continue to display as flat dollar amounts everywhere (calendar chips, lists, dashboards, invoices) — `$807.50`, never `$95/hr`. The "no /hr on shifts" rule stays intact for shift cards.
- **Rate definitions** (in RatesEditor, the rate dropdown inside the shift form, and the new "Avg Hourly Rate by Source" table that already uses /hr) are the only places `/hr` appears, and only when the rate itself is hourly.
- One existing exception to fix: `WeekTimeGrid.tsx` line 214 currently shows `${s.rate_applied}/hr` — that's a bug today and we'll correct it to drop `/hr` for flat shifts (and keep showing the computed total).

#### 4. Invoice impact

Invoice line items already use `unit_rate` × `qty` = `line_total`. For hourly shifts we'll set `qty = hours`, `unit_rate = hourly_rate`, so the PDF/preview naturally reads "8.5 hrs × $95.00 = $807.50". Flat shifts remain `qty=1, unit_rate=total`. No invoice template rewrite needed.

#### 5. Migration & backwards compatibility

- All existing rows default to `rate_kind='flat'` — zero behavior change for current users and seed/demo data.
- No backfill required.
- `taxCalculations`, `businessLogic`, `invoiceAutoGeneration`, dashboard aggregations all read `rate_applied` (the computed total) and remain untouched.

### Files to change

- **Migration**: add `rate_kinds` jsonb to `terms_snapshots`; add `rate_kind` + `hourly_rate` to `shifts`.
- `src/types/index.ts` — extend `Shift` and `TermsSnapshot` types; extend `custom_rates` entry shape.
- `src/components/facilities/RatesEditor.tsx` — Flat/Hourly toggle per row; updated `termsToRates` / `ratesToTermsFields` to round-trip the kind.
- `src/components/schedule/ShiftFormDialog.tsx` — labeled rate options, live hourly calculation, persist `rate_kind` + `hourly_rate`, compute `rate_applied`.
- `src/components/onboarding/ManualFacilityForm.tsx` + `OnboardingClinicForm.tsx` — Flat/Hourly toggle on "Default rate".
- `src/lib/invoiceAutoGeneration.ts` + `src/lib/bulkInvoiceHelpers.ts` — when shift is hourly, emit `qty=hours, unit_rate=hourly_rate` line items.
- `src/components/schedule/WeekTimeGrid.tsx` — fix the `/hr` display bug.
- `src/data/seed.ts` — leave existing seed as flat (no change needed beyond defaults).

### Out of scope (intentionally)

- No retroactive recalculation of existing shifts.
- No "hours actually worked" vs "scheduled hours" distinction — we use scheduled duration. A future enhancement could add an "actual hours" field for hourly shifts only.
- No mixed-rate single shift (e.g. first 8 hrs flat + overtime hourly). Can be handled later via custom line items on the invoice.

### Open question for you

Do you want a **single Flat/Hourly toggle at the facility level** (simpler — every rate at this clinic is one or the other) or the **per-rate toggle** described above (more flexible — same clinic can mix)? My recommendation is per-rate, because relief vets commonly have flat weekdays + hourly weekends/holidays at the same clinic.

