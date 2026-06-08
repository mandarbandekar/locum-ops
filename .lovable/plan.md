## Goal
Replace the current card-stack expense log with a tabular, Expensify-style row layout: receipt-type icons, date, status pill, merchant/description, category, and right-aligned amount. Keep all existing functionality (filters, edit, delete, badges for recurring/receipt) — purely a presentation refresh of `ExpenseLogTab.tsx`.

## Changes
**File:** `src/components/expenses/ExpenseLogTab.tsx` (rows section only, lines ~238–304)

### New row layout (desktop ≥sm)
A header row + data rows, replacing the stacked Cards:

```text
[ ] | Receipt | Date  | Status   | Merchant / Description | Category | Amount  >
[ ] | 📄  💵  | Jun 7 | (Logged) | AVMA — Annual dues      | Fees     | $15.00  >
```

Columns:
1. **Receipt Type icons** — small muted icons indicating: `Receipt` (if `receipt_url`), `Repeat` (recurring), `Car` (mileage subcategory). Replaces today's colored badges to reduce noise.
2. **Date** — `Mon D` format (e.g. "Jun 7"), tabular-nums.
3. **Status** — soft pill: "Deductible" (green) if `deductible_amount_cents > 0`, "Logged" (muted) otherwise. Shows "Auto" pill for `recurrence_parent_id`.
4. **Merchant** — primary line: subcategory label; secondary line (muted, truncated): description + facility.
5. **Category** — category group label, muted.
6. **Amount** — right-aligned, tabular-nums, semibold. Shows deductible sub-amount underneath if it differs.
7. **Chevron** — `ChevronRight` affordance on row hover (click anywhere = edit, as today). Trash button moves into a hover-only action on the right.

### Visual styling
- Single grouped container with themed border (`border border-border rounded-lg overflow-hidden`), per flat-design rule (no shadows).
- Header row: `bg-muted/40`, uppercase muted labels matching the screenshot.
- Rows: `border-b border-border/60 last:border-0`, hover `bg-muted/30`, tighter vertical padding (`py-3`).
- CSS Grid for column alignment: `grid-cols-[auto_auto_auto_auto_1fr_auto_auto_auto]` on `sm+`.

### Mobile (<sm)
Tabular columns collapse to a denser 2-line row (same data, no header bar) so the screen stays readable on phones. Filters bar above is unchanged.

### Out of scope
- No changes to data model, filters, summary cards, IRS reminder, dialogs, or any other tab.
- No checkbox/bulk-select column (the screenshot shows one, but we don't have bulk actions; adding that would be feature work).

## Why
The current cards make the log feel heavy and hard to scan. A row-table treatment matches the Expensify reference, aligns columns for fast scanning of date/amount, and keeps with the flat-design and "calm competent colleague" tone already in the app.
