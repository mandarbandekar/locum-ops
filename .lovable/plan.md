## Plan: Replace "What If" Slider with Schedule Impact Selector

### What changes

Replace the "What if I add more shifts this quarter?" income slider with the existing **schedule selector** component that shows how changing shifts-per-week impacts quarterly income, taxes, and take-home. The set-aside nudge stays.

### How it works

1. **Remove** `WhatIfSlider` from `TaxDashboard.tsx` (and its import, plus the `whatIfCalculator` callback)
2. **Add** `TaxProjectionDisplay` in its place, wired to the user's actual day rate and tax profile state
3. **Persist** the schedule selection to the tax profile's `typical_days_per_week` field (same pattern used in `TaxEstimateTab`)
4. **Pass** the user's `stateCode` from their profile so it uses real state data instead of timezone inference

### Files modified

- `**src/components/tax-intelligence/TaxDashboard.tsx**`
  - Remove `WhatIfSlider` import and `whatIfCalculator`
  - Import `TaxProjectionDisplay`, `daysPerWeekToIndex`, `indexToDaysPerWeek`
  - Add schedule index state synced from profile's `typical_days_per_week`
  - Derive `dayRate` from profile's `annual_relief_income` and schedule
  - Render `TaxProjectionDisplay` where `WhatIfSlider` was, with `variant="page"` and the user's `stateCode`
  - Accept a new `onSaveProfile` prop to persist schedule changes
- `**src/components/business/TaxEstimateTab.tsx**` — pass `saveProfile` through to `TaxDashboard` as `onSaveProfile`
- `**src/pages/TaxEstimatePage.tsx**` — no changes needed (already passes through)

The set-aside alert ("Set aside X% of each payment…") remains untouched directly below.