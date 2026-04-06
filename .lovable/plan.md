

# Redesign Expenses Page: Merge Expenses + Mileage, Category Tab View

## What Changes

The Expenses page currently has 3 top-level tabs (Expenses, Mileage Tracker, Write-Off Summary). This redesign:

1. **Merges Expenses and Mileage Tracker** into a single unified tab called "Expense Tracker"
2. **Keeps Write-Off Summary** as its own separate tab
3. **Replaces the category dropdown** with a visual category grid (like the uploaded screenshot) as the primary entry point for logging expenses
4. **Keeps "Log Expense" button** as a secondary manual option

## New Layout

```text
┌─────────────────────────────────────────────────────┐
│  [ Expense Tracker ]    [ Write-Off Summary ]       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  YTD Stats Strip (spent, write-offs, mileage)       │
│                                                     │
│  ┌─ Mileage Setup Status + Backfill Card ─────────┐ │
│  │  (collapsed inline, from MileageTrackerTab)     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Pending Mileage Review Banner ─────────────────┐ │
│  │  (draft mileage entries to confirm/dismiss)     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ── Log an Expense ──────────────────────────────── │
│  Category Grid (3-col cards like screenshot)        │
│  Each card: category name, description, badge       │
│  Clicking a card → opens AddExpenseDialog with      │
│  that category pre-selected                         │
│                                                     │
│  [ + Log Expense Manually ] (secondary button)      │
│                                                     │
│  ── Receipt Reminder Banner ─────────────────────── │
│  "The IRS requires receipts for expenses over $75.  │
│   Upload receipts to protect your deductions."      │
│                                                     │
│  ── Expense Log ─────────────────────────────────── │
│  Search + filter + expense list (existing)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Category Grid Cards

Based on the uploaded screenshot, render a 3-column grid of category cards. Each card shows:
- **Title** (bold, white/foreground): e.g. "Mileage & travel"
- **Description** (muted): e.g. "Per-mile logging, tolls, parking, flights to distant clinics"
- **Deductibility badge**: colored badge like "IRS §62(a)", "Deductible", "50% rule", "Above-the-line", "Schedule 1", "Custom"

Clicking a card opens `AddExpenseDialog` with the category pre-filled. The "Other / uncategorized" card specifically allows users to add a custom description.

The 12 category cards map to the existing `EXPENSE_CATEGORIES` groups, consolidated to match the screenshot layout:
1. Mileage & travel → `travel_vehicle`
2. Professional licenses → `professional_compliance`
3. Continuing education → `education_development`
4. Malpractice insurance → `insurance` (malpractice)
5. Health insurance → `insurance` (health)
6. Professional software → `technology_software`
7. S-Corp / business admin → `business_operations`
8. Home office → `home_office`
9. Equipment & scrubs → `equipment_supplies`
10. Retirement contributions → `retirement`
11. Meals & entertainment → `meals_entertainment`
12. Other / uncategorized → `uncategorized`

## Files to Change

| File | Change |
|------|--------|
| `src/pages/ExpensesPage.tsx` | Reduce to 2 tabs: "Expense Tracker" and "Write-Off Summary". Pass all mileage + expense props to new unified tab |
| `src/components/expenses/ExpenseLogTab.tsx` | **Rewrite** as the unified "Expense Tracker" tab. Add category grid at top, integrate mileage setup/review/backfill sections, add IRS receipt reminder banner, keep existing expense list below |
| `src/components/expenses/MileageTrackerTab.tsx` | No longer a standalone tab — its sections (setup status, backfill card, review banner, confirmed log) are absorbed into ExpenseLogTab |

## Key Details

- Category grid cards use dark `Card` with `bg-card` styling to match the screenshot aesthetic
- Each card's badge color reflects deductibility type (green for "Deductible", purple for "Schedule 1", yellow for "50% rule", blue for "Above-the-line", gray for "Custom")
- The `AddExpenseDialog` already accepts `initialSubcategory` — for category cards we set the first subcategory of that group as default, and show the subcategory dropdown for picking the specific one
- The IRS receipt reminder is a subtle `Alert` component encouraging uploads for expenses over $75
- Mileage section appears at the top since it has actionable items (pending drafts), followed by the category grid
- The existing `ExpenseOnboarding` component is kept for the zero-state (no expenses yet)
- Confirmed mileage entries appear in the main expense log (they're already in `expenses`), so no separate confirmed log section is needed

