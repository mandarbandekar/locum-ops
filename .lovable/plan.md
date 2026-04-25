# Strict Validation for Shift Add Flow + Remove Default Rates

## Goal
1. Block "finalize shift" until **every** required selection is made — only the **note** stays optional.
2. Stop pre-filling a rate. The rate field starts empty; the user must pick one (preset or custom) before they can save.

## Required selections (must all be set)
Facility · Date(s) · Start time · End time · Rate (preset or custom > 0)

Optional: Notes, Color (color keeps its existing 'blue' default — it's a visual tag, not a missing decision).

## Files to change

### 1. `src/components/schedule/ShiftFormDialog.tsx`

**Stop auto-defaulting the rate** (`handleFacilityChange`, ~lines 242–256):
- Remove the block that sets `rate` and `selectedRateKey` to the first preset when the facility changes.
- Always reset to `rate=''`, `selectedRateKey=''`, `isCustomRate=false` — the user picks from the dropdown.

**Step 2 → Next button gating** (~line 621):
- Disable until `selectedDates.length > 0 && startTime && endTime && !hoursInvalidReason`.
- When `startTime` or `endTime` is missing, show a small inline hint under the time row: "Set a start and end time to continue."

**Step 3 → Submit button gating** (~line 800):
- Disable until all of the above plus a valid rate:
  - Preset path: `Number(rate) > 0` (i.e., a row was selected)
  - Custom path: `Number(rate) > 0` (label is still optional; we already fall back to a generated label on save)
- Add the same combined check for `selectedDates.length === 0 || !startTime || !endTime || !!hoursInvalidReason || !(Number(rate) > 0)`.
- When disabled, show a tiny muted helper above the button listing what's missing (e.g. "Add a rate to finalize.").

**Edit-mode submit** (~line 997):
- Same combined check.

**`handleSubmit` guard** (~line 312): early-return with a toast if any required field is missing, as a defensive backstop.

### 2. `src/components/onboarding/OnboardingShiftStep.tsx`

- Remove the `defaultRate` constant and its `|| 650` fallback. Initialize `const [rate, setRate] = useState('')`.
- The "Day rate ($)" input keeps `placeholder="650"` for guidance only (no value injected).
- Update `handleSubmit` guard to also require `rate && Number(rate) > 0`.
- Update the hidden sticky-CTA `disabled` and `data-can-save` to include the rate check.
- The downstream invoice/earnings preview uses `parseFloat(rate) || 0` instead of falling back to 650, so an unset rate never silently shows fake earnings (the preview only renders after submit, which is now blocked until rate is set, so no visual change in practice).

### 3. `src/components/onboarding/ManualShiftForm.tsx`

- Add `rate` to `canSubmit`: `facilityId && date && startTime && endTime && rate && Number(rate) > 0`.
- Mark the Rate label with the red asterisk like the time fields.
- Keep the dollar placeholder ("e.g. 800"), but no pre-filled value beyond what the parent supplies via `defaultRate` — and since the user wants no defaults, we'll also stop passing `defaultRate` from the manual setup screen so the field starts empty. (Quick check of `ManualExpandScreen.tsx` if it passes `defaultRate`; if it does, set it to `undefined`.)

## Non-goals
- No change to the time picker built in the previous turn.
- No change to color, notes, engagement override, or conflict warnings.
- No change to the data layer or invoice generation.

## QA
- Try to advance Step 2 with no times set → button stays disabled, helper visible.
- Try to submit Step 3 with no rate selected → button stays disabled, helper says "Add a rate".
- Switch facility on Step 1 → rate dropdown resets to placeholder, not the first preset.
- Edit existing shift → all fields are pre-populated as before; submit is enabled.
- Onboarding "Log your first shift" → rate field starts empty, save button stays disabled until filled.
