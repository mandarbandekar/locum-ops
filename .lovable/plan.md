

# Dashboard: Add 3 High-Value Micro-Insights

Three compact, data-derived additions that answer questions locum vets ask themselves daily — no new tables, no API calls, minimal UI footprint.

## Changes

### 1. Longest Unpaid Invoice callout (Money card)
Add a single line below the "This Week" section showing the oldest unpaid invoice: **"Oldest unpaid: INV-0042 · Riverside Clinic · 38 days"**. Clickable, navigates to that invoice. Only shows when there's at least one outstanding invoice.

**In `src/pages/DashboardPage.tsx`:**
- Compute `oldestUnpaid` from existing `invoices` array: find the sent/partial/overdue invoice with the earliest `sent_at`, compute `differenceInDays(now, sent_at)`
- Pass as prop to MoneyToCollectCard

**In `src/components/dashboard/MoneyToCollectCard.tsx`:**
- Accept optional `oldestUnpaid: { id, invoice_number, facility_name, daysOutstanding }` prop
- Render a compact amber/warning row below "This Week" when present

### 2. Next Credential Expiring countdown (Briefing strip)
Append to the daily briefing string: **" · DEA expires in 18 days"**. Only shows when the nearest credential expiration is within 60 days.

**In `src/pages/DashboardPage.tsx`:**
- In the `briefing` memo, find the credential with the nearest `expiration_date` from `credentialsList`
- If within 60 days, append `· {custom_title} expires in {N} days` to the briefing string

### 3. Monthly Pace Indicator (Money card)
Show **"On pace for $X this month"** based on completed shifts + booked/proposed shifts in the current month. One line below the collected-this-month stat.

**In `src/pages/DashboardPage.tsx`:**
- Compute `monthlyPace`: sum `rate_applied` for all non-canceled shifts in the current month
- Pass to MoneyToCollectCard

**In `src/components/dashboard/MoneyToCollectCard.tsx`:**
- Accept optional `monthlyPace: number` prop
- Render below "Collected this month" as a muted text line

## Files to modify
- `src/pages/DashboardPage.tsx` — compute oldestUnpaid, monthlyPace, credential countdown
- `src/components/dashboard/MoneyToCollectCard.tsx` — render oldestUnpaid + monthlyPace

No new files, no database changes, no backend changes.

