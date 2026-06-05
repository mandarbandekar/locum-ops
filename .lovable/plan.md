## Goal
Make the Expenses page tabs match the visual style of Business Insights (Financial Health / Performance Insights) — replacing the current shadcn `Tabs` row with the same icon-led "pill" buttons (`primary-tab-btn`) used on `/business`.

## Changes

**`src/pages/ExpensesPage.tsx`**
- Drop `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and JSX.
- Use `useSearchParams` to drive the active tab (`?tab=expenses|mileage|summary`, default `expenses`) — matches BusinessPage pattern and keeps state in URL.
- Render three `primary-tab-btn` buttons in a `flex gap-2 sm:gap-3 flex-wrap` row, each with a lucide icon + label:
  - Expenses — `Receipt`
  - Mileage Tracker — `Car` (keeps the existing red dot badge for `draftCount > 0`, rendered as the absolute-positioned 2.5×2.5 dot used on BusinessPage instead of the current `Badge` number)
  - Write-Off Summary — `FileSpreadsheet` (or `ClipboardList`)
- Conditionally render `<ExpenseLogTab />`, `<MileageTrackerTab />`, `<ExpenseSummaryTab />` based on `activeTab` (same conditional pattern as BusinessPage).
- Keep the existing page-header block unchanged.

## Out of scope
- No changes to the inner tab components (`ExpenseLogTab`, `MileageTrackerTab`, `ExpenseSummaryTab`) or their content.
- No changes to the secondary sub-tabs inside Mileage Tracker (Business Drives / Mileage Reports already use `primary-tab-btn`).
- No routing changes elsewhere.

## Open question
The current Mileage tab badge shows the **number** of drafts (e.g. "3"). BusinessPage style uses a small **red dot** only. Want me to keep the number (more informative) or switch to the dot (more consistent)? Default: switch to the dot for full visual parity.