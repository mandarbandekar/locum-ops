

# Improve Expenses UX

## Current Pain Points

1. **Dialog is tall and scrolly** -- 8+ fields stacked vertically in a narrow dialog; user must scroll to reach Submit
2. **No inline YTD context** -- the Log tab shows raw entries but no running totals; user must switch tabs to see impact
3. **No quick-add shortcuts** -- common expenses (mileage, CE, meals) require navigating a 30+ item dropdown every time
4. **Delete is too easy** -- single click deletes with no confirmation
5. **No edit capability** -- users can only delete and re-add to fix mistakes
6. **Summary tab is bland when empty** -- shows "No expenses logged" with no guidance
7. **Tab labels are generic** -- "Log" and "Summary" don't communicate value

## Changes

### 1. Inline YTD strip above the expense list (ExpenseLogTab)
Add a compact 3-stat strip at the top of the log view (only when expenses exist): **YTD Spent** | **YTD Write-Offs** | **This Month**. Gives immediate context without tab-switching. Uses data already available from `useExpenses`.

### 2. Quick-add chips for common expenses (ExpenseLogTab)
Below the toolbar, render 4-5 shortcut pills: "Mileage", "Business Meal", "CE Course", "License Fee", "Other". Clicking one opens the Add dialog with the category pre-selected, saving the dropdown step. These are the most frequent relief vet entries.

### 3. Wider, two-column dialog layout (AddExpenseDialog)
Expand to `max-w-[680px]` per the project's dialog convention. Left column: Date + Category + conditional inputs (mileage/sqft/prorate). Right column: Amount + Description + Clinic + Receipt. Reduces vertical scrolling and makes the form feel spacious.

### 4. Delete confirmation (ExpenseLogTab)
Wrap the delete action in an `AlertDialog` asking "Delete this expense?" with Cancel/Delete buttons. Prevents accidental loss.

### 5. Edit support via dialog (ExpenseLogTab + AddExpenseDialog)
- Add an `editExpense` function to `useExpenses` hook (PATCH to expenses table)
- Clicking an expense row opens the dialog pre-filled with existing values
- Dialog title changes to "Edit Expense" and submit becomes "Save Changes"
- Pass optional `editingExpense` prop to `AddExpenseDialog`

### 6. Friendlier tab labels + summary empty state
- Rename tabs: "Log" becomes "Expenses", "Summary" becomes "Write-Off Summary"
- When summary has no data, show a mini version of the onboarding message with a CTA to log the first expense

### 7. Receipt indicator improvement (ExpenseLogTab)
Replace the raw `Image` icon with a small "Receipt" badge that's more recognizable. Add a subtle green checkmark overlay so users can quickly scan which entries have receipts attached.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ExpensesPage.tsx` | Rename tab labels, pass `addExpense`/`editExpense` props |
| `src/components/expenses/ExpenseLogTab.tsx` | Add YTD strip, quick-add chips, delete confirmation, click-to-edit, receipt badge |
| `src/components/expenses/AddExpenseDialog.tsx` | Two-column layout, accept `editingExpense` prop, pre-fill form for edits |
| `src/components/expenses/ExpenseSummaryTab.tsx` | Friendly empty state with CTA |
| `src/hooks/useExpenses.ts` | Add `editExpense` function |

## Technical Notes
- The `editExpense` function uses `db('expenses').update(row).eq('id', id).select().single()` and updates local state
- Quick-add chips pass an `initialSubcategory` prop to `AddExpenseDialog`, which sets `subcategoryKey` on open
- Two-column layout uses `grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4` inside the dialog
- Delete confirmation uses the existing `AlertDialog` component from `src/components/ui/alert-dialog.tsx`

