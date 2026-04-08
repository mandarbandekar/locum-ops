

# Sort Upcoming Invoices Chronologically Across All Clinics

## Problem
The "Upcoming" invoices section uses `groupByFacility={true}`, which clusters invoices by clinic rather than showing them in chronological order. A user with shifts at Clinic A on April 10 and Clinic B on April 9 sees them grouped by clinic instead of seeing Clinic B first.

## Change
In `src/pages/InvoicesPage.tsx`, line 262: change `groupByFacility={true}` to `groupByFacility={false}` on the Upcoming `InvoiceStatusGroup`. The underlying sort (line 46) already orders by `invoice_date || period_end` ascending, so removing the facility grouping will show invoices in pure chronological order across all clinics — earliest upcoming invoice first.

| File | Change |
|---|---|
| `src/pages/InvoicesPage.tsx` | Remove `groupByFacility` from Upcoming section (line 262) |

One-line change, no logic or database modifications.

