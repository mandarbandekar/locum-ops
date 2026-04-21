

## Goal
Capture **engagement type** when creating or editing a facility, and surface it on the facilities list. The schema is already in place (`engagement_type`, `source_name`, `tax_form_type`); this work is UI-only.

## Engagement selector (top of form, after Name)
Render as a 3-option radio-card group titled **"How do you work with this facility?"** (required):

1. **Direct / Independent** → `engagement_type = 'direct'` (default)
2. **Via Platform or Agency** (Roo, IndeVets, staffing firm) → `'third_party'`
3. **W-2 Employer** (VCA, Banfield, etc.) → `'w2'`

Below the selector, render conditional helper text per branch (see below).

## Conditional fields per branch

### Direct (default)
Form renders unchanged: billing cadence, net terms, invoice contacts (to/cc/bcc), rates, contacts, notes.

### Third-party (platform / agency)
- **Source dropdown** "Platform or agency name" — presets: Roo, IndeVets, Serenity Vet, Evette, VetNow, **Other** (Other reveals a free-text input). Saved to `source_name`.
- **Tax form radio** "How does {source_name} pay you?" → `1099` (default) | `W-2`. Saved to `tax_form_type`.
- **Helper text** under selector: *"We won't generate invoices for these shifts — {source_name} handles billing. We'll still track your earnings and taxes."*
- **Tip under facility name**: *"You can track each physical clinic separately, or log all your {source_name} shifts under one facility — whatever works for you."*
- **HIDE**: billing cadence, net terms, invoice prefix, invoice contacts (to/cc/bcc).
- **KEEP**: facility name, address, rates, contacts, notes.
- Force `auto_generate_invoices = false` on save (no invoices for third-party).

### W-2 Employer
- **Employer dropdown** — presets: VCA, Banfield, BluePearl, MedVet, Ethos, Pathway, NVA, **Other** (free-text). Saved to `source_name`.
- Auto-set `tax_form_type = 'w2'`.
- **Helper text**: *"W-2 income is tracked separately from 1099 income for tax purposes."*
- **HIDE**: billing cadence, net terms, invoice contacts, **rates**.
- **KEEP**: facility name, address, contacts, notes.
- Force `auto_generate_invoices = false` on save.

## Facilities list — engagement pill
On each card and list-row in `FacilitiesPage.tsx`, render a small pill next to the status badge:
- `direct` → green pill: **"Direct"**
- `third_party` → blue pill: **"{source_name}"** (fallback: "Platform")
- `w2` → purple pill: **"W-2: {source_name}"** (fallback: "W-2")

Use Tailwind tokens consistent with the existing pill system (light bg + darker text, dark-mode aware).

## Files touched
1. **`src/components/AddFacilityDialog.tsx`** — add engagement selector at top of step 1 (Clinic Details, right after Name); branch the rest of the wizard:
   - Direct: existing 4-step flow unchanged.
   - Third-party / W-2: collapse to a single review step; skip the billing-defaults step entirely; on save apply forced fields above.
2. **`src/components/onboarding/OnboardingClinicForm.tsx`** — add the same engagement selector after the name field; conditionally hide billing-cadence / invoice-contact / rates sections per branch; persist new fields via `addFacility`.
3. **`src/components/onboarding/ManualFacilityForm.tsx`** — same selector + branching for the onboarding manual path.
4. **`src/pages/FacilityDetailPage.tsx`** (Edit Facility / Overview tab) — add the engagement selector to the editable overview area; conditionally hide `RatesEditor`, `InvoicingPreferencesCard`, and confirmation-settings section based on engagement type; persist via existing `updateFacility`.
5. **`src/pages/FacilitiesPage.tsx`** — render the engagement pill on both the card view and list view, beside the existing `<StatusBadge>`.
6. **`src/components/AddFacilityDialog.tsx`** save logic — when engagement is non-direct, set `auto_generate_invoices: false` and skip `updateTerms`/confirmation-settings calls.
7. **New small helper** `src/lib/engagementOptions.ts` — exports preset arrays (`THIRD_PARTY_PRESETS`, `W2_EMPLOYER_PRESETS`), label/color maps, and a `getEngagementPill(facility)` helper used by the list page.

## Out of scope (explicitly unchanged)
- Shift form, invoice auto-generation pipeline, tax estimator, CPA prep, dashboard cards, scheduling.
- DB schema (already done).
- Any read paths beyond the facilities list pill.

