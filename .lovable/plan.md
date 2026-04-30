## Goal

When a user has **both** clinic-specific rates *and* Rate Card rates, the current single dropdown in the Shift form lists everything in one scrollable list. Some users can't scroll all the way down to reach Rate Card entries.

Replace this with a **two-pane (split view) picker** that puts clinic rates and Rate Card rates side-by-side, each with its own scroll area — no more hidden options. Users who prefer to always pick from their Rate Card can opt out of the split view via a new preference; for them, only the Rate Card pane is shown. Make sure this works efficiently for mobile and web based interface. 

## Where this applies

- `src/components/schedule/ShiftFormDialog.tsx` — primary place (Step 2 of new shift, plus the "edit existing" view; both render the same rate block, lines ~860–937 and ~1050–1130).
- The Bulk Shift Calendar (`OnboardingBulkShiftCalendar.tsx`) is **out of scope** for this change — it uses a flat option list during onboarding only.

## UX behavior

**Default (split view), shown when both clinic and rate-card rates exist:**

```text
┌──────────────────────────────────────────────────────────────┐
│ Choose a rate                              [ + Custom rate ] │
├──────────────────────────────┬───────────────────────────────┤
│ FROM THIS CLINIC             │ FROM YOUR RATE CARD           │
│ ┌──────────────────────────┐ │ ┌───────────────────────────┐ │
│ │ ● Weekday Rate    $850/d │ │ │ ○ GP Day          $900/d  │ │
│ │ ○ Weekend Rate    $950/d │ │ │ ○ ER Day        $1,100/d  │ │
│ │ ○ Holiday Rate  $1,050/d │ │ │ ○ Surgery Day   $1,000/d  │ │
│ │ ○ Custom (ER)   $1,000/d │ │ │ ○ After-hours      $95/hr │ │
│ │   …scrolls within pane   │ │ │   …scrolls within pane    │ │
│ └──────────────────────────┘ │ └───────────────────────────┘ │
└──────────────────────────────┴───────────────────────────────┘
   Selected: Weekday Rate — $850/day  (from this clinic)
```

- Each pane is a `ScrollArea` with `max-h-56` (~224 px) so the **whole** list of either source is reachable without the dialog needing to grow.
- Items render as radio rows (single-select across both panes — picking from one pane clears the other).
- Selecting an item updates `rate`, `selectedRateKey`, `isCustomRate=false` exactly like today, so all downstream calc / save logic is unchanged.
- The previously inline "[GP] Label — $X/day" formatting is preserved per row.
- A small text below the panes echoes the active selection so the user knows what's saved.
- "Custom rate" becomes a button above the panes that flips to the existing custom-rate input block (unchanged).

**Fallback layouts:**

- On viewports < 640 px (`sm`), the two panes stack vertically; each still has its own scroll area.
- If only one source has rates, render that single pane full-width (no split needed).
- If the user enabled "Always use my Rate Card" (see below), only the Rate Card pane is shown, full-width — even when the clinic has its own rates.

## New preference: "Default to my Rate Card"

Add a single boolean preference: `prefer_rate_card_default` on `user_profiles`.

- Surfaced on **Settings → Rate Card** (`src/pages/SettingsRateCardPage.tsx`) as a toggle:
  > **Always use my Rate Card for shift rates**
  > When on, new shifts default to your Rate Card and clinic-specific rates are hidden from the picker. You can still add a custom rate per shift.
- Read in `ShiftFormDialog` via `useUserProfile()`. When `true`, the picker:
  - Hides the "From this clinic" pane.
  - Seeds the new-shift default rate from the first Rate Card entry instead of the first facility rate.
  - Still allows Custom Rate.

## Technical details

**Database**

Add column to `public.user_profiles`:

- `prefer_rate_card_default boolean not null default false`

No RLS changes required (table already has user-scoped RLS).

`**src/components/schedule/ShiftFormDialog.tsx**`

1. Pull `prefer_rate_card_default` from `profile`.
2. Replace the `<Select>` block (used in both Step 2 of new-shift flow and the Edit view) with a new local subcomponent `RateSourcePicker` that:
  - Receives `facilityOpts`, `cardOpts`, `selectedRateKey`, `onSelect`, `onCustom`, `preferRateCard`.
  - Renders one or two panes inside a `grid grid-cols-1 sm:grid-cols-2 gap-3` (or single column when one source / `preferRateCard`).
  - Each pane: header label (`"From this clinic"` / `"From your Rate Card"`) + `ScrollArea` (`max-h-56`) of radio rows.
  - Radio rows reuse the `[SHIFT_TYPE] Label — $amount/unit` formatting from current `<SelectItem>`.
3. When `preferRateCard === true`, `buildRateOptions` is unchanged but the picker filters out `source === 'facility'`. The seed-first-rate effect (lines 193–203) picks the first `rate_card` option.
4. Keep all existing custom-rate handling, hourly calculation hint, and validation messages exactly as they are today — they render below the picker.

`**src/pages/SettingsRateCardPage.tsx**`

- Add a card titled **"Picker preference"** with the toggle bound to `prefer_rate_card_default`. Persist via the existing profile update path used elsewhere on this page.

`**src/integrations/supabase/types.ts**` is auto-regenerated after the migration — no manual edit.

## Out of scope

- Bulk Shift Calendar rate selection.
- Reordering / pinning rates within a pane (still ordered as `buildRateOptions` returns them).
- Any change to how rates are stored on the saved shift.