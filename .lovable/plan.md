## Edit Shift dialog — layout cleanup & mobile polish

Scope: `src/components/schedule/ShiftFormDialog.tsx` (edit-mode `renderEditForm` + shared `renderBreakSection`). No business logic changes — visual structure only.

### 1. Remove visual clutter

- **Drop the `NEW` pill** next to "Shift break" in `renderBreakSection` (delete the `showNew` block).
- **Drop the "From clinic: …" chip** next to the Shift break label. The selected segmented option already conveys the value; the inherited default still applies silently when nothing is overridden.
- **Drop the standalone `$ RATE` section header** in edit mode. The RateSourcePicker already has its own "Choose a rate" header — the duplicate uppercase label is what makes the form feel busy.

### 2. Uniform section styling

Today the edit form mixes three different label treatments (uppercase mini-label with icon for Date/Facility/Time, no label for break's BreakPolicySelector, big `$ Rate` label, etc.). Standardize on one pattern:

- Every section uses the same compact uppercase label row: `<icon> LABEL` at `text-[11px]` muted, `mb-1.5`.
- Sections: **Date · Facility · Time · Shift break · Rate · Color**. (Rate gets its label back as part of the uniform pattern, but compact like the others — replacing the oversized `$ Rate` heading with the same `<DollarSign/> Rate` mini-label.)
- All inputs/selectors stay at `h-10` for desktop, full-width on mobile.

### 3. Responsive grid that doesn't break at 815px

Current edit form uses `flex-col sm:flex-row` with a fixed `sm:w-[280px]` left column. At the user's 815px viewport that leaves the right column ~470px wide and the BreakPolicySelector's 4-button row wraps awkwardly to 2x2 with multi-line labels (the cause of the broken-looking screenshot).

Replace the two-column flex with a single responsive grid:

```text
mobile (default)     | tablet/desktop (md:)
─────────────────────|───────────────────────────────────
[ Date            ]  | [ Date            ][ Facility    ]
[ Facility        ]  | [ Time start ][ Time end ]  (col-span-2)
[ Time s ][ Time e]  | [ Shift break  ............... ]
[ Shift break    ]   | [ Rate  ........................ ]
[ Rate           ]   | [ Color ......................... ]
[ Color          ]   |
```

Implementation: `grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4`, with Shift break / Rate / Color set to `md:col-span-2`. Drops the rigid 280px Date column and the wrapped break-pill mess.

### 4. BreakPolicySelector mobile fit

Inside `BreakPolicySelector` the grid is `grid-cols-2 sm:grid-cols-4`. On the new full-width row this works, but to prevent the "Paid (no deduction)" two-line label that's visible in the screenshot, shorten the option label to "Paid" (the `helper` line below already explains "no deduction"). Same component; only the label string in `OPTIONS[0]` changes.

### 5. Footer

Keep the `Update Shift` + delete trash button row; on mobile the trash icon stays as `h-11 w-11` next to the full-width primary button. No change.

### Out of scope

- Add-shift guided stepper (`renderStep1–4`) untouched.
- Rate logic, break math, conflict detection, save flow — unchanged.
- The clinic-default break still applies under the hood; we just stop displaying the chip.

### Files touched

- `src/components/schedule/ShiftFormDialog.tsx` — restructure `renderEditForm`; trim `renderBreakSection` (remove NEW pill + From-clinic chip).
- `src/components/facilities/BreakPolicySelector.tsx` — change `'Paid (no deduction)'` label to `'Paid'`.
