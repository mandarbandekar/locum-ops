

# Move Auto Mileage Tracker to Its Own Tab

## What Changes

The Expenses page currently has 2 tabs (Expenses, Write-Off Summary). We add a third tab -- **Mileage Tracker** -- that becomes the dedicated home for all auto-mileage functionality. This gives the feature its own space, making it easier to discover and use.

## New Tab: Mileage Tracker

The tab will contain:

1. **Onboarding section** (dismissible) -- the existing `MileageOnboarding` component, shown until dismissed
2. **Pending Review section** -- the existing `MileageReviewBanner` content, promoted to the main body (not a banner anymore, but a proper list with a header)
3. **Confirmed mileage log** -- a filtered list of all confirmed mileage expenses (subcategory = 'mileage'), showing date, clinic, miles, route, and amount
4. **YTD mileage stats strip** -- total miles driven, total mileage deduction, entries this month
5. **Setup status card** -- small card showing whether home address is set, with a link to Settings > Profile if missing. Shows IRS rate being used.
6. **Tab badge** -- the Mileage Tracker tab trigger shows a small count badge when there are pending draft entries (e.g. "Mileage Tracker (3)")

## Files to Change

| File | Change |
|------|--------|
| `src/pages/ExpensesPage.tsx` | Add third tab "Mileage Tracker" with draft count badge |
| `src/components/expenses/MileageTrackerTab.tsx` | **Create** -- new tab component combining onboarding, review, confirmed log, stats, and setup status |
| `src/components/expenses/ExpenseLogTab.tsx` | Remove `MileageReviewBanner` and `MileageOnboarding` imports/rendering (they move to the new tab) |
| `src/hooks/useExpenses.ts` | Add `confirmedMileageExpenses` and `ytdMileageMiles` derived values to the return |

## Tab Layout (MileageTrackerTab)

```text
┌─────────────────────────────────────────┐
│ [Onboarding card - dismissible]         │
├─────────────────────────────────────────┤
│ Stats: Total Miles | YTD Deduction | #  │
├─────────────────────────────────────────┤
│ ⚠ Setup: Home address [Set / ✓ Done]   │
├─────────────────────────────────────────┤
│ Pending Review (N)          [Confirm All]│
│  ┌ Draft card ─────────────────────────┐│
│  │ Clinic A · Mar 28 · 44mi · $30.80  ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ Confirmed Mileage Log                   │
│  ┌ Entry ──────────────────────────────┐│
│  │ Clinic B · Mar 25 · 22mi · $15.40  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## Key Details

- The `MileageOnboarding` component is reused as-is inside the new tab
- The `MileageReviewBanner` component is reused as-is for the pending section
- Confirmed mileage entries are filtered from `expenses` where `subcategory === 'mileage' && mileage_status === 'confirmed'`
- The setup card checks `userProfile.home_address` from `UserProfileContext` and links to `/settings/profile`
- The IRS commute tooltip is shown in the stats strip header

