## Problem

The color picker in **Add/Edit Shift** shows vivid Tailwind dots (`bg-blue-500`, `bg-green-500`, etc.), but the **Schedule** views (week grid, month, facility detail, etc.) render those same `color` values using the muted brand palette defined in `SHIFT_COLORS` — Pacific, Kelp, Ochre, Sandstone, Driftwood, Coral Mist, Tidepool, Sandy Amber.

So picking the "blue" dot in the form gives you a soft teal-tinted Pacific block on the calendar. The swatches don't visually match what gets saved, and the brand color names never appear to the user.

## Fix

Make the picker a true preview of the calendar swatch by sourcing both the color and the label from `SHIFT_COLORS` (the single source of truth).

### Changes (all in `src/components/schedule/ShiftFormDialog.tsx`)

1. **Delete the local `COLOR_MAP`** (the `bg-blue-500 / bg-green-500 / …` map at the top of the file).
2. **Render swatches from `SHIFT_COLORS`** in both the guided form (Step 3) and the edit form:
   - Use each entry's `bg` class as the swatch background (matches the calendar fill exactly).
   - Add a thin border so light tones stay visible on the dialog background.
   - Use the entry's `label` (Pacific, Kelp, …) as the `title` tooltip so users see the brand name on hover.
3. **Update the Step 4 "Review your shift" preview** — the small color chip there also uses `COLOR_MAP[color]`. Switch it to look up the matching `SHIFT_COLORS` entry and render `<span className={cn('h-4 w-4 rounded-full border border-border', colorDef.bg)} />` next to `colorDef.label` (so it reads "Pacific" instead of "Blue", matching the swatch).
4. **Selected-state ring**: keep the existing `ring-2 ring-foreground ring-offset-2` treatment so the active swatch is still obvious against the muted fills.

No type changes, no data migration — `Shift.color` values (`'blue' | 'green' | …`) stay the same; only their visual representation in the picker is brought in line with the rest of the app.

### Result

- The dot you tap in the picker is the exact same fill the shift will have on the schedule.
- Hovering a swatch reveals the actual palette name (Pacific, Kelp, Ochre, …) used everywhere else in the product.
- The Step 4 review preview chip and label match too, so the whole flow stays consistent.
