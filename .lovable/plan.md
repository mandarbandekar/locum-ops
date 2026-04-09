

# Always Auto-Generate Invoices + Clear Suppression

## Problem
1. The `auto_generate_invoices` toggle in the Add Facility dialog and other places lets users accidentally disable invoice generation, causing confusion
2. Oak Grove has a suppressed period blocking current invoice generation
3. The `auto_generate_invoices` check in DataContext blocks invoice creation when the flag is false

## Changes

### 1. Clear Oak Grove suppression (database)
Delete the suppression record for Oak Grove so invoices generate for the current period.

### 2. Remove auto-generate toggle from Add Facility dialog
In `src/components/AddFacilityDialog.tsx`:
- Remove the `autoGenerateInvoices` state variable and `Switch` UI (lines 64, 439-453)
- Always pass `auto_generate_invoices: true` in the submit handler (line 119)

### 3. Remove auto-generate toggle from Manual Facility Form (onboarding)
In `src/components/onboarding/ManualFacilityForm.tsx`:
- Remove the `autoGenerateInvoices` state and `Switch` UI
- Always pass `auto_generate_invoices: true`

### 4. Remove auto-generate gate in DataContext
In `src/contexts/DataContext.tsx` line 296:
- Remove the `facility.auto_generate_invoices` condition so every new shift triggers draft generation regardless of the flag

### 5. Remove auto-generate toggle from InvoicingPreferencesCard
In `src/components/facilities/InvoicingPreferencesCard.tsx`:
- Remove the auto-generate `Switch` from the facility detail edit form
- Always save `auto_generate_invoices: true`

### 6. Remove auto-generate toggle from Invoice Onboarding Stepper
In `src/components/invoice/InvoiceOnboardingStepper.tsx`:
- Remove the per-facility auto-generate `Switch`
- Always save `auto_generate_invoices: true`

## Files

| File | Change |
|---|---|
| Database | Delete suppression record for Oak Grove |
| `src/components/AddFacilityDialog.tsx` | Remove toggle, always true |
| `src/components/onboarding/ManualFacilityForm.tsx` | Remove toggle, always true |
| `src/contexts/DataContext.tsx` | Remove `auto_generate_invoices` gate |
| `src/components/facilities/InvoicingPreferencesCard.tsx` | Remove toggle, always true |
| `src/components/invoice/InvoiceOnboardingStepper.tsx` | Remove toggle, always true |

The `auto_generate_invoices` column stays in the database (always `true`) to avoid a migration. The UI simply no longer exposes it.

