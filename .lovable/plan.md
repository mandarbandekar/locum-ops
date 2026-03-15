

## Plan: Revamp Rate Entry UX and Reorganize Terms/Contracts

### Summary
Redesign how rates are entered (dropdown-based add pattern instead of static fields), move rates to the Overview tab, rename "Contracts" to "Contract Vault & Terms" and relocate policy text fields there, and add a custom rate option backed by a new `custom_rates` JSONB column.

### Database Change
Add a `custom_rates` JSONB column to `terms_snapshots` to store user-defined rate types:
```sql
ALTER TABLE public.terms_snapshots 
ADD COLUMN custom_rates jsonb NOT NULL DEFAULT '[]'::jsonb;
```
Format: `[{ "label": "Emergency Rate", "amount": 1500 }, ...]`

### 1. New Reusable `RatesEditor` Component
Create `src/components/facilities/RatesEditor.tsx`:
- Displays saved rates as a list of labeled rows with amounts
- "Add Rate" button opens a dropdown with options: Weekday, Weekend, Partial Day, Holiday, Telemedicine, Custom
- Selecting a predefined type adds a row with that label and an amount input
- Selecting "Custom" adds a row with an editable label + amount input
- Each row has a delete button to remove it
- Auto-saves on blur/change via a debounced `onSave` callback that calls `updateTerms()`
- Used in both the Overview tab and onboarding flows

### 2. FacilityDetailPage Changes
- **Overview tab**: Add `RatesEditor` card below Details, replacing the old Terms tab content for rates
- **Remove the "Terms" tab** entirely
- **Rename** the "Contracts" tab trigger to **"Contract Vault & Terms"**
- Move cancellation_policy_text, overtime_policy_text, late_payment_policy_text, special_notes into the ContractsTab (alongside the existing Key Terms Snapshot area)

### 3. ContractsTab Changes (`src/components/contracts/ContractsTab.tsx`)
- Add a "Policies & Notes" section with the four text fields (cancellation, overtime, late payment, special notes)
- These save to `terms_snapshots` (same table), called via a new `onUpdatePolicies` prop
- The existing `KeyTermsSnapshot` component (which duplicates rate fields from `contract_terms`) remains for contract-specific rate references

### 4. AddFacilityDialog Changes
- Replace Step 1 (Shift Rates) static fields with the same dropdown-based rate entry pattern
- State stores rates as an array: `{ type: string, label: string, amount: number }[]`
- On submit, maps array back to `terms_snapshots` fields + custom_rates JSONB

### 5. ManualFacilityForm (Onboarding) Changes
- Replace the single "Weekday rate" field with the dropdown-based rate entry
- Update `useManualSetup.ts` to accept and persist all rate types + custom rates

### 6. Type Updates (`src/types/index.ts`)
- Add `custom_rates: Array<{ label: string; amount: number }>` to `TermsSnapshot`

### Files to Edit
1. `src/types/index.ts` — add custom_rates to TermsSnapshot
2. `src/components/facilities/RatesEditor.tsx` — new reusable component
3. `src/pages/FacilityDetailPage.tsx` — add RatesEditor to Overview, remove Terms tab, rename Contracts tab
4. `src/components/contracts/ContractsTab.tsx` — add Policies section
5. `src/components/AddFacilityDialog.tsx` — dropdown-based rates in step 1
6. `src/components/onboarding/ManualFacilityForm.tsx` — dropdown-based rates
7. `src/hooks/useManualSetup.ts` — persist all rate types
8. `src/data/seed.ts` — add custom_rates to seed data
9. Migration SQL for custom_rates column

