

# Add Total Earnings Graph to Financial Health Tab

## Summary

Add a cumulative "Total Earnings" line chart inside the Revenue Overview section, placed between the existing Monthly Revenue chart and the Revenue by Facility chart. It shows a running total of all earnings (collected + outstanding + anticipated) over time.

## What it shows

A line chart with cumulative YTD earnings plotted month by month. The data reuses the existing `revenueData` array and computes a running sum. One line for cumulative total, with the area filled for visual weight.

## Implementation

### File: `src/components/business/FinancialHealthTab.tsx`

**Add a derived dataset** (after `revenueData` memo, ~line 114):
- New `useMemo` that maps `revenueData` into cumulative totals: each month's value = sum of all prior months' (collected + outstanding + anticipated)

**Add a new Card** between the Monthly Revenue chart (ends ~line 343) and the Revenue by Facility chart (starts ~line 346):
- Card title: "Total Earnings"
- Uses `AreaChart` from recharts (add to imports) with a single filled area + line showing the cumulative total
- Chart config with a single series using the primary color
- Tooltip shows the cumulative amount for that month
- Empty state if no data

**Update imports** (line 13):
- Add `AreaChart`, `Area` from recharts

No new files needed. Single file change only.

| File | Change |
|---|---|
| `src/components/business/FinancialHealthTab.tsx` | Add cumulative earnings memo + AreaChart card in Revenue Overview section |

