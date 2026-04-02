

# Improve Reports: Replace Payment Trends + Add New Insights

## What changes

Replace the confusing "Payment Trends" line chart with three new, actionable report cards:

### 1. Facility Payment Speed (replaces Payment Trends)
A horizontal bar chart showing **average days to get paid** per facility, computed from `sent_at` to `paid_at` on paid invoices. Sorted fastest-to-slowest. Clear, single-metric answer to "which clinic pays fastest?"

### 2. Revenue by Facility
A horizontal bar chart showing **total paid revenue** per facility for the selected period. Gives users a clear picture of income concentration.

### 3. Avg Rate per Facility
A horizontal bar chart comparing the **average shift rate** (`rate_applied`) across facilities. Helps users spot if they're undercharging certain clinics.

## Layout

```text
[Monthly Revenue chart — full width, unchanged]

[Facility Payment Speed]  |  [Revenue by Facility]
      (replaces Payment Trends)

[Shifts per Facility]     |  [Avg Rate per Facility]
```

Summary KPI cards stay the same (Total Revenue, Collected, Total Shifts, Active Facilities).

## File to modify

### `src/pages/ReportsPage.tsx`
- **Remove** `paymentTrends` memo and `paymentChartConfig`
- **Add** `facilityPaymentSpeed` memo: filter invoices where `status === 'paid'` and both `sent_at`/`paid_at` exist, compute avg days between them grouped by `facility_id`, map to facility names, sort ascending
- **Add** `revenueByFacility` memo: sum `total_amount` of paid invoices grouped by `facility_id`, sort descending
- **Add** `avgRatePerFacility` memo: average `rate_applied` of non-canceled shifts grouped by `facility_id`, sort descending
- **Replace** the Payment Trends `<Card>` with Facility Payment Speed card (horizontal bar chart, dataKey `avgDays`, label "Avg Days to Pay")
- **Add** Revenue by Facility card (horizontal bar, dataKey `revenue`, formatted as currency)
- **Rearrange** bottom grid to 2x2: Payment Speed + Revenue by Facility on top row, Shifts per Facility + Avg Rate on bottom row
- Add chart configs for each new chart with appropriate colors
- Handle empty states (e.g., "No paid invoices yet" when no payment speed data)

### No database changes, no new files, no backend changes.

