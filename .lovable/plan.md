
## Goal
Add a "Same as company address" checkbox under the Home address field in Profile Settings, so users who work from home don't have to type the address twice.

## Change

**File: `src/pages/SettingsProfilePage.tsx`**

1. Add a derived boolean `sameAsCompany` from comparing trimmed `homeAddress` and `companyAddress` (so it stays in sync if either changes elsewhere), plus track the user's explicit toggle preference in local state.

2. Render a `Checkbox` + label directly under the Home address `GooglePlacesAutocomplete`:
   > ☐ Same as company address

3. Behavior:
   - **When checked**: copy `companyAddress` into `homeAddress`, disable the home address autocomplete input (visually muted), and keep them mirrored if the company address is edited afterward.
   - **When unchecked**: re-enable the home address field and clear it (or leave the last-typed value — preference: clear, so the user knows to enter a separate address).
   - If `companyAddress` is empty when the box is checked, show inline helper text: *"Enter a company address first."*

4. Save flow (`handleSave`) is unchanged — it already persists `home_address`. The mirrored value flows through naturally.

5. No DB migration needed. No changes to mileage logic — `home_address` remains the single source of truth for distance calculations.

## UX note
Place the checkbox tightly under the Home address input, above the existing helper text ("Used to calculate driving distance…"), so the relationship is obvious.

## Files touched
- `src/pages/SettingsProfilePage.tsx` (only)
