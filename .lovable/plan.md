# Better Time Selector for Shift Add Flow

## What's wrong today
Across all "Add a shift" surfaces, the start/end times are pre-populated with hardcoded defaults (e.g. `08:00` → `18:00` in onboarding, `08:00` → `16:00` in the main schedule dialog). Users often submit those defaults without realizing it, creating shifts at times they don't actually work. The control itself is also the bare browser-native `<input type="time">`, which looks inconsistent across browsers and doesn't match the rest of the form styling.

## Goal
1. **No assumed default times** — fields start empty and the user must actively choose.
2. **A purpose-built time picker** that feels like the rest of LocumOps (sage/gold theme, DM Sans, 8px radius), is fast on both desktop and mobile, and helps the user pick common shift times in one tap.

## Surfaces affected
All three "add shift" entry points get the same new control:
- `src/components/schedule/ShiftFormDialog.tsx` — main add/edit shift dialog (also used in inline week-grid creation)
- `src/components/onboarding/OnboardingShiftStep.tsx` — onboarding "Log your first shift"
- `src/components/onboarding/ManualShiftForm.tsx` — manual setup flow

## New component: `TimePicker`
Location: `src/components/ui/time-picker.tsx`

Behavior:
- Trigger looks like our standard Input (h-10, 8px radius, 14px text). Empty state shows muted placeholder "Select start time" / "Select end time" with a clock icon — never a pre-filled time.
- Click opens a Popover with `pointer-events-auto`.
- Inside the popover, two stacked sections:
  1. **Quick presets** (chip row): `6:00 AM`, `7:00 AM`, `8:00 AM`, `9:00 AM`, `12:00 PM`, `2:00 PM`, `5:00 PM`, `8:00 PM`. Tapping a chip selects and closes.
  2. **Precise pick**: two scrollable columns — Hours (1–12) and Minutes (00, 15, 30, 45) — plus an AM/PM toggle. Selecting all three confirms via a "Set time" button.
- Keyboard accessible (arrow keys move within column, Enter confirms, Esc cancels).
- Returns value in `HH:mm` (24-hour) so the existing data layer is unchanged.
- Mobile: popover becomes a bottom sheet with the same content.

End-time helper: when the start time is set and the end time is still empty, show a thin helper row above the chip presets — "+4h", "+6h", "+8h", "+10h", "+12h" — that pre-computes likely end times relative to the chosen start. Selecting one fills the end time and closes.

## Form changes
For each of the three forms above:
- Initialize `startTime` and `endTime` to `''` (empty) instead of `'08:00' / '16:00' / '18:00'`.
- Replace each `<Input type="time" ... />` with `<TimePicker value={...} onChange={...} placeholder="..." />`.
- Make submit/save button disabled until both times are set (the existing `canSubmit` checks already require truthy values, so they continue to work).
- In `ShiftFormDialog`, the special-case math that derived end time from `defaultStartTime + 8h` (lines 71–72) is removed; the new `TimePicker`'s "+8h" helper covers that ergonomically without silently filling values.
- The "reset after add another" handler in `OnboardingShiftStep.handleAddAnotherShift` resets times back to `''` instead of `'08:00' / '18:00'`.

## Non-goals
- No change to how shifts are stored or to invoice/rate calculations.
- No change to date pickers, facility selectors, or the rest of the form layout.
- The Block Time dialog and other non-shift time inputs are out of scope for this pass.

## Test/QA
- Unit-test `TimePicker` value formatting (24h output for AM/PM input, "+Nh" math wrapping past midnight stays within the same day with a visible warning).
- Manually verify in all three flows: empty initial state, preset selection, precise selection, "+Nh" helper, mobile sheet behavior, and that the existing tests in `src/test/onboarding*.test.ts` still pass (they exercise `addShift` shape, not the input control).
