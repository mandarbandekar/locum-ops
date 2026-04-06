

# Clinic Scorecard — New Sub-Tab in Relief Business Hub

## Overview

Add a third tab called **Clinic Scorecard** to the Relief Business Hub. It renders a card for each facility showing key metrics computed from existing shift, invoice, and facility data. No new database tables needed — everything derives from data already in `useData()`.

## What Each Card Shows

For every facility (sorted by total shifts descending):

| Metric | Source |
|---|---|
| Total Shifts | Count of shifts in selected range |
| Revenue Generated | Sum of `rate_applied` from shifts |
| Avg Pay per Shift | Revenue / shifts |
| Payment Speed | Avg days from `sent_at` to `paid_at` on paid invoices |
| Overdue Invoice History | Count of invoices that reached overdue status |
| Repeat Booking Frequency | Avg days between consecutive shifts |
| Notes / Tags | Facility `notes` field + status badge |

## Technical Plan

### 1. Create `src/components/business/ClinicScorecardTab.tsx`

- Import `useData()` for `shifts`, `invoices`, `facilities`
- Month range selector (3/6/12 months) like the Performance tab
- For each facility, compute all metrics via `useMemo`
- Render as a responsive grid of Cards (1 col mobile, 2 col desktop)
- Each card: facility name header, metric rows with labels and values, color-coded badges for payment speed (fast/average/slow) and overdue count (0 = green, 1-2 = amber, 3+ = red)
- Empty state if no facilities exist

### 2. Update `src/pages/BusinessPage.tsx`

- Add a third tab button: "Clinic Scorecard" with `Building2` icon
- Render `ClinicScorecardTab` when `tab=scorecard`

### Design Details

- Card layout: compact metric rows using flex with label left, value right
- Payment speed shows "X days avg" with color badge
- Repeat booking: "Every X days" or "One-time" if only 1 shift
- Overdue history: "None" in green or "X invoices" in amber/red
- Facility notes truncated to 2 lines with expand on click
- Clicking facility name navigates to `/facilities/:id`

