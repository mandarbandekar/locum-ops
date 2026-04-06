

# Show Category Grid for New Users (Empty State)

## Problem

When a new user lands on the Expense Tracker with zero expenses, they only see the `ExpenseOnboarding` component — a generic welcome screen with a single "Log Your First Expense" button. They don't see the category grid, so they miss the full picture of what expenses they can track.

## Solution

Replace the empty-state early return with a layout that shows the category grid front and center, keeping a condensed onboarding welcome message above it. This lets new users immediately see all 12 expense categories and feel empowered to start logging.

## New Empty State Layout

```text
┌─────────────────────────────────────────────────────┐
│  Welcome header (condensed from ExpenseOnboarding)  │
│  "Track every deductible expense for your practice" │
│                                                     │
│  ── Log an Expense ──────────────────────────────── │
│  Category Grid (same 3-col grid as populated view)  │
│                                                     │
│  [ + Log Expense Manually ] (secondary button)      │
│                                                     │
│  IRS Receipt Reminder banner                        │
│                                                     │
│  Mileage Setup Status card                          │
└─────────────────────────────────────────────────────┘
```

## File Changes

| File | Change |
|------|--------|
| `src/components/expenses/ExpenseLogTab.tsx` | Remove the early return for `expenses.length === 0`. Instead, conditionally show a welcome header when empty, then always render the category grid, manual log button, IRS banner, and mileage setup card. Hide the YTD stats strip and expense log section when there are no expenses. |

## Details

- The welcome header is a simple `Card` with icon, headline, and subtitle — much lighter than the full `ExpenseOnboarding` component
- The category grid is identical whether the user has 0 or 100 expenses
- The mileage setup card and backfill card still show (they're useful even before any expenses exist)
- The expense log section (search, filter, list) only renders when `expenses.length > 0`

