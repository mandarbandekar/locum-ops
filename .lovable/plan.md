
## Goal

When you mark a facility as **Direct / Independent**, ask one follow-up: *"Do you send this clinic invoices?"*

- **Yes** (default) → today's behavior. LocumOps generates invoices.
- **No** → clinic pays you directly and issues a 1099. No invoices generated, but shifts still count as 1099 income in revenue, YTD, and tax projections.

## UX changes

**Engagement selector** (`EngagementSelector.tsx`, used in Add Clinic stepper and Facility detail):
- When "Direct / Independent" is selected, reveal a sub-question with two radios:
  - "Yes — I send invoices" (default)
  - "No — clinic pays me directly and issues a 1099"
- Helper text under "No": *"We won't generate invoices for these shifts. They'll still count toward your 1099 income and tax projections."*

**Facility card / detail pill**:
- Direct + invoicing → existing green "Direct" pill.
- Direct + no invoicing → new pill "Direct — 1099" (amber tone) so it's visible on the Facilities list and facility detail header.

**Invoicing Preferences card** (`InvoicingPreferencesCard.tsx`):
- When the facility is Direct + no-invoicing, replace the card body with a calm explainer: *"Invoicing is off for this clinic. They pay you directly and will issue a 1099 at year-end. Switch this in the engagement section if that changes."* No billing-contact / cadence fields shown.

**Shift form helper line** (`getShiftEngagementHelperText`):
- Add a branch for direct + no-invoicing: *"Direct booking — no invoice will be generated. A 1099 is expected from {clinic} at year-end."*

## Data model

New field on `facilities`:
- `generates_invoices boolean NOT NULL DEFAULT true`

Semantics:
- `engagement_type = 'third_party'` → always treated as no-invoicing (existing behavior, driven by tax_form_type for copy).
- `engagement_type = 'direct' AND generates_invoices = false` → new "direct, no invoice" mode. Treated as 1099 income.
- `engagement_type = 'direct' AND generates_invoices = true` → today's default.

`auto_generate_invoices` continues to control the cron behavior and is forced to `false` whenever `generates_invoices = false`.

## Behavior changes

- **Auto-invoice cron** (`generate-auto-invoices/index.ts`): already keys off `auto_generate_invoices`. We just need the form/save logic to set it to `false` when invoicing is off — no cron change required.
- **Manual invoice creation**: hide/disable "Create invoice" entry points (BulkInvoiceDialog, single-shift "Generate invoice", facility "New invoice") for direct-no-invoice facilities, with a small inline note explaining why.
- **Revenue / tax / business hub**: shifts continue to be summed into income regardless of invoice status, so no changes needed for tax projections, YTD income, or CPA prep — the existing aggregations are shift-based, not invoice-based. We'll add a quick test verifying a direct-no-invoice shift contributes to YTD income and to 1099 totals.
- **Engagement pill helper** (`getEngagementPill`): add `Direct — 1099` variant.

## Migration plan for existing data

Default `generates_invoices = true` for every existing facility. No behavior change for any current user; the new mode is opt-in per clinic.

## Files to touch

- `supabase/migrations/...` — add `generates_invoices` column with default true.
- `src/types/index.ts` — add field to `Facility` type.
- `src/lib/engagementOptions.ts` — extend pill + helper text logic.
- `src/components/facilities/EngagementSelector.tsx` — add the sub-question.
- `src/components/facilities/AddClinicStepper.tsx` — persist `generates_invoices` and `auto_generate_invoices=false` accordingly.
- `src/components/facilities/InvoicingPreferencesCard.tsx` — collapsed explainer state when invoicing is off.
- `src/pages/FacilityDetailPage.tsx` — update header pill.
- Manual invoice entry points (`InvoicesPage`, BulkInvoiceDialog, shift detail "Generate invoice") — guard against direct-no-invoice clinics.
- New test in `src/test/` covering: facility flagged no-invoice → cron skips it, revenue still counts the shifts, manual invoice action is blocked.

## Out of scope

- Changing how `third_party` engagements work.
- Any change to tax entity (1099 vs S-Corp) handling — that stays in Tax Intelligence.
- Retroactively deleting invoices that were already generated for a clinic before toggling invoicing off; we'll show a one-time toast pointing the user to the existing per-invoice delete flow if drafts exist.
