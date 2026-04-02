

# Fix Monthly Revenue Chart: Pipeline → Anticipated Income

## Problems Found

1. **Pipeline calculation is broken**: The code tries to read `inv.line_items` (line 111) but invoices don't have embedded line items — they're a separate `lineItems` array from `useData()`. Result: `invoicedShiftIds` is always empty, so uninvoiced shift calculation double-counts shifts that already have draft invoices.

2. **"Pipeline" label is unclear** — rename to "Anticipated Income."

3. **Anticipated income shows across all months** — users only want it for the current month (future work they can plan around), not retroactively on past months.

4. **Cumulative collected line** is redundant since Total Revenue is already shown as a KPI above.

## Changes (all in `src/pages/ReportsPage.tsx`)

### 1. Fix anticipated income calculation
- Import `lineItems` from `useData()` alongside `shifts`, `invoices`, `facilities`.
- Replace the broken `inv.line_items` lookup with a proper `lineItems.filter(li => li.invoice_id === inv.id)` to build `invoicedShiftIds`.
- This ensures uninvoiced shifts aren't double-counted with draft invoice amounts.

### 2. Rename Pipeline → Anticipated Income
- Rename `pipeline` data key to `anticipated` throughout.
- Update chart config label from "Pipeline" to "Anticipated Income."
- Update legend, insight callout, and KPI subtitle text.
- Update `CardDescription` to say "Collected, outstanding, and anticipated income."

### 3. Only show anticipated income for current month
- In the `revenueData` computation, set `anticipated = 0` for any month that is not the current month. Past months should only show collected + outstanding. Future months beyond current show nothing anticipated either (shifts there aren't actionable yet).

### 4. Remove cumulative collected line
- Remove `cumulativeCollected` from the data computation (delete running sum logic).
- Remove the `<Line>` element for cumulative collected from the `ComposedChart`.
- Remove the hidden right `<YAxis>`.
- Remove the `cumulativeCollected` entry from `revenueChartConfig`.

### Summary of what users see after
- **Green bars**: Collected (money in bank)
- **Amber bars**: Outstanding (sent invoices awaiting payment)
- **Gray dashed bar on current month only**: Anticipated Income (drafts + uninvoiced upcoming shifts)
- Clear legend with totals, plain-language insight callout, no cumulative line clutter

