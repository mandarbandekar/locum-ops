# Business Module UX Evaluation and Improvements

## Current State Assessment

The Business module has three tabs: **Reports**, **Estimated Tax Tracker**, and **Tax Planning Advisor**. Here's what I found:

### Issues Identified

1. **Reports page is chart-heavy with no actionable context** -- Users see 7 charts but no guidance on what they mean or what to do. There are no callouts, highlights, or plain-language insights.
2. **No "at a glance" summary when landing on Business** -- Users land on the Reports tab and immediately face a time-range selector and 4 generic KPI cards. There's no narrative telling them how their business is doing.
3. **KPI cards lack comparison context** -- "Total Revenue: $12,000" means nothing without knowing if that's up or down from last period. No deltas or trend indicators.
4. **Charts have no inline insights** -- Each chart shows data but doesn't highlight the key takeaway (e.g., "Weekend shifts earn 40% more" or "Clinic A pays in 8 days on average").
5. **Tab naming is unclear** -- "Reports" is vague. "Estimated Tax Tracker" is wordy. Users may not know which tab to visit for what.

---

## Recommended Plan

### Change 1: Add a Business Snapshot section at the top of Reports

Replace the plain KPI cards with a **Business Health strip** that includes period-over-period comparison arrows and one-line insights.

**In `src/pages/ReportsPage.tsx`:**

- Compute previous-period values for each KPI (revenue, collected, shifts, facilities)
- Show a green/red arrow with "up X%" or "down X%" vs. the prior equivalent period
- Add a subtitle like "vs. previous 6 months" under each delta

### Change 2: Add auto-generated insight callouts below key charts

Add a small text insight beneath each chart card that summarizes the key finding in plain English.

**In `src/pages/ReportsPage.tsx`:**

- Below Facility Payment Speed: `"Fastest payer: {name} ({N} days avg)"` or `"All facilities pay within {N} days on average"`
- Below Revenue by Facility: `"{name} accounts for {X}% of your revenue"`  
- Below Earnings by Day: `"Your highest-earning day is {day} — averaging ${X}/shift"`
- Below Avg Rate: `"{name} has your highest avg rate at ${X}"`

These are computed from the existing memos — no new data needed.

### Change 3: Rename tabs for clarity

**In `src/pages/BusinessPage.tsx`:**

- "Reports" → "Insights" (signals actionable analysis, not just data dumps)
- "Estimated Tax Tracker" → "Estimated Tax Tracker" (shorter, mobile-friendly)
- "Tax Planning Advisor" → "Tax Advisor" (shorter)

### Change 4: Add an effective rate KPI card

Replace "Active Facilities" (low value — users know how many clinics they work at) with **Effective Hourly Rate** (total revenue / total hours worked). This is the single number locum providers care about most.

**In `src/pages/ReportsPage.tsx`:**

- Compute `effectiveRate = totalPaid / totalHoursWorked` from existing `monthlyHoursWorked` data
- Show as a KPI card with `$/hr` formatting

---

## Files to modify

### `src/pages/BusinessPage.tsx`

- Rename tab labels: "Insights", "Tax Tracker", "Tax Advisor"

### `src/pages/ReportsPage.tsx`

- Add period-over-period delta computation for KPI cards
- Add trend arrows (up/down/flat) with percentage change
- Replace "Active Facilities" KPI with "Effective Rate" ($/hr)
- Add plain-language insight text below each chart card
- Compute insights from existing memos (top payer, revenue concentration, best day, etc.)

### No database changes, no new files, no backend changes.

## Technical Detail

- Period comparison uses the same `months` logic but shifted back by `monthRange` to compute the "previous period" values
- Insight strings are derived from existing `facilityPaymentSpeed`, `revenueByFacility`, `earningsByDayOfWeek`, and `avgRatePerFacility` memos — no additional data fetching
- All changes are presentation-layer only