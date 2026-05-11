## Goal
Make the color swatches in the shift form's color picker visually darker/more saturated so they're easier to distinguish, while keeping the calendar's shift blocks at their current light tint.

## Approach
Today, `SHIFT_COLORS` exposes a single `bg` token used both by the picker swatches (`ShiftFormDialog`) and the calendar tiles (`WeekTimeGrid`, `SchedulePage`). Sharing one token is why we can't darken one without darkening the other.

Add a second, slightly darker tint per color used **only by the picker**. Calendar rendering is untouched.

## Changes

1. `src/types/index.ts` — extend each entry in `SHIFT_COLORS` with a new `swatchBg` field (one step darker than `bg`, e.g. `bg-[#BFDBFE]` for blue, dark mode `dark:bg-[#2C5282]`-ish). Keep existing `bg` and `text` unchanged so calendar visuals stay identical.

2. `src/components/schedule/ShiftFormDialog.tsx` — in both color-picker render blocks (lines ~972 and ~1316), swap `c.bg` → `c.swatchBg` on the swatch button. Also bump the unselected `opacity-70` to `opacity-90` so the darker tone reads cleanly.

## Out of scope
- `WeekTimeGrid.tsx`, `SchedulePage.tsx`, calendar rendering — unchanged.
- No changes to color count, ordering, labels, or selection logic.
