

# Change Projected Annual Income to Include Anticipated Income from Shifts

## Problem

Currently, `projectedAnnualCents` in `useCPAPrepData.ts` is calculated using only **paid invoices**. This means:
- Shifts that haven't been invoiced yet are ignored
- Draft/sent invoices are ignored
- Adding or deleting shifts has no effect on the projection

## Solution

Change the calculation to use **total anticipated income** = paid invoices + outstanding invoices + uninvoiced shifts (based on `rate_applied` from each shift). This mirrors the "anticipated income" pattern already used in `FinancialHealthTab.tsx` and `DashboardPage.tsx`.

## What Changes

### `src/hooks/useCPAPrepData.ts` — Snapshot computation (lines 73-95)

- Compute `ytdIncomeCents` as: paid invoice totals + outstanding invoice balance + uninvoiced shift revenue
- To find uninvoiced shifts: filter YTD shifts whose IDs don't appear in any `lineItems[].shift_id`
- Sum their `rate_applied` values
- Use this combined total for the annualized projection: `(totalAnticipated / monthsElapsed) * 12`
- Add `shifts` and `lineItems` to the `useMemo` dependency array so add/delete of shifts triggers recalculation

### `src/pages/BusinessPage.tsx` — Hero KPI strip (lines 19-44)

- Change the YTD Revenue hero card to show total anticipated income (paid + outstanding + uninvoiced shifts) instead of only paid invoices
- Add `lineItems` from `useData()` to compute uninvoiced shift revenue
- This keeps the hero strip consistent with the CPA Prep snapshot

## Files

| File | Change |
|---|---|
| `src/hooks/useCPAPrepData.ts` | Recalculate `ytdIncomeCents` and `projectedAnnualCents` using shifts + invoices |
| `src/pages/BusinessPage.tsx` | Update hero YTD Revenue to include anticipated income from shifts |

