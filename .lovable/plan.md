

## Plan: Improve Shift Form Wizard — Multi-Select Visibility, Bold Selection, No-Scroll, Mobile-Friendly

### Problem
1. The calendar doesn't clearly communicate that multiple dates can be selected
2. Selected dates aren't visually bold enough
3. The dialog content can overflow, requiring scroll on smaller screens
4. Mobile layout needs tightening

### Changes

**1. Calendar component (`src/components/ui/calendar.tsx`)**
- Make `day_selected` use `font-bold` so selected dates are visually heavy
- Keep the existing `ring-2` highlight from earlier fix

**2. ShiftFormDialog Step 2 (`src/components/schedule/ShiftFormDialog.tsx`)**
- Add a helper text below the subtitle: "Tap multiple dates to batch-schedule shifts" with a multi-select icon
- Make the calendar more compact on mobile: reduce padding, use tighter cell sizes
- Show selected count as a pill/badge near the calendar (e.g., "3 selected") instead of just listing dates below
- Tighten vertical spacing throughout all 3 steps to eliminate scroll

**3. Dialog container sizing**
- Change `max-h-[90vh]` to `max-h-[95vh]` or `max-h-[calc(100dvh-2rem)]` for mobile
- Reduce internal padding and margins across all steps to keep content within viewport
- Make the calendar border wrapper use `p-1` instead of `p-2`

**4. Step 2 layout compaction**
- Reduce `gap-4` to `gap-3` in step containers
- Remove `mb-5` from StepIndicator, use `mb-3`
- Reduce time inputs row spacing
- Move the date summary inline with the calendar section header rather than a separate line

### Files modified
- `src/components/ui/calendar.tsx` — add `font-bold` to `day_selected`
- `src/components/schedule/ShiftFormDialog.tsx` — compact layout, multi-select hint, tighter spacing

