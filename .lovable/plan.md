

## Plan: Replace Default Day Rate with Multi-Rate Editor and Clean Up Enrichment Step

### What changes

**1. OnboardingClinicForm.tsx — Replace single day rate with RatesEditor**
- Remove the `dayRate` state and the single `$` input field (lines 34, 190-205)
- Add `rates: RateEntry[]` state, import `RatesEditor` and `ratesToTermsFields`
- Render `RatesEditor` (with `showCard={false}`, `compact`) in place of the old day rate input
- Update `handleSave` to use `ratesToTermsFields(rates)` instead of setting only `weekday_rate`
- Update helper text to: "The rates you set become the defaults for new shifts at this clinic — one less thing to enter each time."

**2. AddFacilityDialog.tsx — Same replacement on Step 1**
- Remove `dayRate` state (line 48) and the single input (lines 431-446)
- Add `rates: RateEntry[]` state, render `RatesEditor` inline on Step 1
- Update `handleCreateFacility` to use `ratesToTermsFields(rates)` instead of `parsedRate`/`weekday_rate`
- Remove `dayRate` from `resetForm` and `summaryItems`

**3. AddFacilityDialog.tsx — Remove from enrichment step (Step 4)**
- Remove the "Detailed Shift Rates" accordion (lines 580-609) — rates are now captured in Step 1
- Remove the "Mileage from Home" accordion (lines 611-645)
- Remove related state: `enrichRates`, `mileageMiles` and their usage in `handleSaveEnrichment`
- Keep Tech Access and Clinic Access accordions
- Update welcome step checklist text from "Clinic name, address, and day rate" to "Clinic name, address, and shift rates"

**4. Summary items update**
- Replace the "Day Rate" summary item with a "Rates" item showing count (e.g., "2 rates" or "Skipped")

### Files modified
- `src/components/onboarding/OnboardingClinicForm.tsx`
- `src/components/AddFacilityDialog.tsx`

