

## Plan: Require Tax Profile Before Showing Tax Data

### What changes
Currently, when a user has shifts but no tax profile, the Tax Estimate page shows a projection display with rough estimates. Instead, **always** show the "Set Up Your Tax Profile" prompt — regardless of whether shifts exist — until the user completes the profile setup. No tax numbers should appear before that.

### How it works
In `src/components/business/TaxEstimateTab.tsx`, simplify the `!hasProfile` branch: remove the `shifts.length > 0` conditional that shows `TaxProjectionDisplay`, and always render the setup CTA (the "Answer 8 quick questions…" empty state). This ensures every user must complete the tax profile wizard before seeing any quarterly tax information.

### File modified
**`src/components/business/TaxEstimateTab.tsx`** (lines 62–113)
- Remove the `shifts.length > 0` branch that renders `TaxProjectionDisplay` and the "Your tax snapshot" header
- Always show the "Set Up Your Tax Profile" empty state with the Get Started button when `!hasProfile`
- Remove unused imports (`TaxProjectionDisplay`, `daysPerWeekToIndex`, `indexToDaysPerWeek`, `useData`) and schedule-related state that's no longer needed in the pre-profile path

