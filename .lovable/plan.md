## Goals

1. Make the time picker dramatically simpler and mobile-friendly.
2. Properly support overnight shifts (e.g. 8 PM → 6 AM) end-to-end.
3. Replace the "Monterey Bay" brand palette in the shift color picker with a soft, low-saturation standard palette that doesn't visually shout on the calendar.

---

## 1. New Time Picker (`src/components/ui/time-picker.tsx`)

Replace the current 3-section panel (relative chips + quick-pick grid + 3 scrolling columns + AM/PM + Set button) with a single, calm interface.

**New layout — one panel, top to bottom:**

- **Big read-out** at the top showing the currently chosen time (e.g. `8:00 AM`), tappable to toggle AM/PM.
- **One row of common-time chips** (6 total, not 8): `6 AM · 8 AM · 12 PM · 2 PM · 6 PM · 10 PM`. Tapping a chip selects it and closes the picker immediately (today's behavior).
- **Two compact steppers** side by side: `Hour [− value +]` and `Minute [− value +]`. Minute steps in 15-min increments; hour wraps 1↔12. No scroll wheels, no separate "Hr / Min / AM-PM" columns.
- **Single AM/PM segmented toggle** (two buttons) under the steppers.
- Remove the explicit "Set time" button — selection commits on close (chip tap closes; clicking outside or pressing Done closes). Keep one small `Done` button on mobile sheet only, since tapping outside a bottom sheet is less obvious.
- Remove the "From start (+4h, +6h…)" relative chips — they were the main source of clutter and overlap with the common-time chips.

**Mobile behavior:** keep the existing `Sheet` (bottom drawer) wrapper. Because the new panel is shorter, the sheet will fit on small screens without scrolling.

**Accessibility:** stepper buttons get `aria-label="Increase hour"` etc.; large 44px touch targets.

This keeps the public API (`value`, `onChange`, `placeholder`, `label`, `id`, `disabled`, `className`) so all existing call sites (`ShiftFormDialog`, `ManualShiftForm`, etc.) keep working. The unused `relativeToStart` prop is removed.

---

## 2. Overnight Shift Support

Today the form correctly computes hours across midnight (`if (mins < 0) mins += 24*60`), but `handleSubmit` in `src/components/schedule/ShiftFormDialog.tsx` builds `end_datetime` on the **same date** as start, which silently produces an end time *before* start. That breaks invoicing, conflict detection, and calendar display.

**Changes in `ShiftFormDialog.tsx`:**

- When building `end_datetime`, detect overnight (end ≤ start) and add 1 day to the end date.
- Apply the same fix in the multi-date loop (each selected date independently).
- In the Step 4 "Review your shift" preview, when the shift is overnight:
  - Show the date as `Mon, Apr 27 → Tue, Apr 28`.
  - Add a small `Overnight` chip next to the time range.
  - Make sure calculated hours displayed already reflect the wrap (it does).
- Update conflict detection input the same way (currently builds same-day end string in the `conflicts` `useMemo`).

**Changes in `src/components/onboarding/ManualShiftForm.tsx`:** same overnight end-date adjustment when persisting.

No DB schema change needed — `start_datetime` / `end_datetime` are already full ISO timestamps.

---

## 3. Soft Standard Color Palette

Replace the `SHIFT_COLORS` array in `src/types/index.ts` with a softer, standard palette. Keep the same 8 `ShiftColor` enum values (`blue, green, red, orange, purple, pink, teal, yellow`) so no data migration is needed — only the visual tokens and labels change.

**New palette (light pastels, low saturation, work in both light & dark mode):**

| value | label | light bg | dark bg |
|---|---|---|---|
| blue | Blue | `#DBEAFE` | `#1E3A5F` |
| green | Green | `#DCFCE7` | `#1E4D2B` |
| red | Red | `#FEE2E2` | `#5C1E1E` |
| orange | Orange | `#FFEDD5` | `#5C3A1E` |
| purple | Purple | `#EDE9FE` | `#3D2E5C` |
| pink | Pink | `#FCE7F3` | `#5C1E45` |
| teal | Teal | `#CCFBF1` | `#1E4D47` |
| yellow | Yellow | `#FEF3C7` | `#5C4A1E` |

Text colors paired as readable mid-tones (e.g. `#1E3A8A` on blue light bg). Labels become plain color names ("Blue", "Green") instead of "Pacific / Kelp / Ochre".

Because the calendar and the picker both consume `SHIFT_COLORS`, they will stay in sync automatically (the recent fix from the previous turn).

The Step 4 preview chip in `ShiftFormDialog.tsx` will pick up the new label automatically.

---

## Files Changed

- `src/components/ui/time-picker.tsx` — full rewrite of the panel (simpler UI, removes relative chips, removes Set-time button on desktop).
- `src/types/index.ts` — replace `SHIFT_COLORS` palette + labels.
- `src/components/schedule/ShiftFormDialog.tsx` — overnight end-date fix in submit + conflict detection; "Overnight" chip and date-range display in Step 4 preview.
- `src/components/onboarding/ManualShiftForm.tsx` — overnight end-date fix on save.

## Out of Scope

- Memory updates for the new palette (will refresh `mem://style/visual-identity` only if the user wants the color change to be a project-wide rule beyond shift chips — confirm after build).
- Editing individual chip styling on calendar/list views (they already read from `SHIFT_COLORS`, so they update automatically).
