

# Module-Specific Spotlight Tours for Each Page

## Summary

Add a dedicated spotlight tour to each of the 5 key module pages (Schedule, Invoices, Relief Business Hub, Tax Intelligence, Credentials). Each tour auto-triggers on first visit and is re-accessible via a "Take a Tour" button in the page header. Tours highlight the key UI sections on that page with vet-specific context.

## Approach

### 1. Generalize the tour hook

Update `useSpotlightTour.ts` to accept a `tourKey` parameter so each module has its own localStorage completion flag (e.g., `locumops_tour_schedule`, `locumops_tour_invoices`, etc.). The existing dashboard tour uses `locumops_tour_completed` — keep that as-is.

### 2. Add `data-tour` attributes to page elements

Each page needs `data-tour="..."` attributes on the key sections the tour will spotlight.

### 3. Add tour steps + SpotlightTour to each page

Each page gets:
- A `TOUR_STEPS` array with 4-6 steps
- A "Take a Tour" button (Compass icon) in the page header
- Auto-trigger on first visit (when tour not yet completed)
- The existing `SpotlightTour` component rendered at page bottom

## Tour Content Per Module

### Schedule Page (5 steps)
1. **Add Shift button** — "Book relief shifts at any clinic. Each shift automatically feeds into invoicing so you never forget to bill."
2. **View switcher (Month/Week/List)** — "Switch between month overview, detailed weekly time grid, or a sortable list. Drag shifts between days to reschedule."
3. **Clinic Confirmations tab** — "Send monthly schedule confirmations to each clinic before you start. No more back-and-forth emails — one click sends your schedule."
4. **Calendar Sync tab** — "Sync shifts to Google Calendar or export an ICS feed. Your personal calendar stays up to date automatically."
5. **Calendar grid/navigation** — "Click any day to add a shift. Color-coded by clinic so you can see your week at a glance. Block personal time to prevent overbooking."

### Invoices Page (5 steps)
1. **Summary strip** — "At-a-glance financial snapshot: overdue balances, invoices awaiting payment, drafts to review, and this month's collections."
2. **Create Manual Invoice button** — "Most invoices auto-generate from your shifts. Use this for one-off or custom invoices outside your normal schedule."
3. **Ready to review banner** — "Drafts appear here automatically after your billing period closes. Review the line items, then send with one click."
4. **Overdue section** — "Invoices past their due date surface here with aging info. Set up automatic email reminders to nudge clinics."
5. **Paid section** — "Track completed payments and see your monthly collection totals. Record partial payments to track remaining balances."

### Relief Business Hub (5 steps)
1. **KPI cards** — "Your year-to-date revenue, outstanding balances, monthly shift count, and active clinics — the numbers that matter most for your relief practice."
2. **Financial Health tab** — "Revenue trends, payment aging, and cash flow analysis. See which months are strongest and spot slow-paying clinics."
3. **Performance Insights tab** — "Shift frequency, average day rates, utilization metrics, and income-per-clinic breakdowns to optimize your schedule."
4. **Clinic Scorecard tab** — "Rate each clinic on payment speed, reliability, and overall experience. Identify your most and least profitable relationships."
5. **Page header** — "Your back-office command center. Everything a relief vet needs to run their practice like a business — not just a gig."

### Tax Intelligence (5 steps)
1. **Tax Estimate tab** — "Real-time quarterly tax estimates based on your actual shift income. Uses 2026 federal brackets, SE tax, and your state rate."
2. **Personalized Tax Strategy tab** — "Savings opportunities personalized to your income: S-Corp analysis, retirement contributions, vet-specific deductions, and more."
3. **CPA Prep tab** — "Generate a CPA-ready packet with income summaries, expense reports, and mileage logs. Makes tax season prep take minutes, not days."
4. **Page header** — "Tax intelligence built specifically for 1099 relief vets. No more guessing what you owe or scrambling at tax time."

### Credentials & CE (5 steps)
1. **Overview tab** — "Your compliance dashboard: see expiring credentials, CE progress, and renewal deadlines at a glance."
2. **Credentials tab** — "Track every license, DEA registration, USDA accreditation, and insurance policy. Get alerts before anything expires."
3. **Renewals tab** — "Upcoming renewal deadlines sorted by urgency. Direct links to renewal portals so you can renew without searching."
4. **CE Hub tab** — "Log continuing education hours, track progress toward requirements, and store certificates. Never lose a CE record again."
5. **Documents tab** — "Your digital credential vault. Upload and organize copies of licenses, certificates, and insurance docs — always accessible."

## File Changes

| File | Change |
|---|---|
| `src/hooks/useSpotlightTour.ts` | Add optional `tourKey` parameter for per-module storage keys; add `autoStart` flag |
| `src/pages/SchedulePage.tsx` | Add `data-tour` attrs, tour steps, SpotlightTour component, header tour button |
| `src/pages/InvoicesPage.tsx` | Add `data-tour` attrs, tour steps, SpotlightTour component, header tour button |
| `src/pages/BusinessPage.tsx` | Add `data-tour` attrs, tour steps, SpotlightTour component, header tour button |
| `src/pages/TaxCenterPage.tsx` | Add `data-tour` attrs, tour steps, SpotlightTour component, header tour button |
| `src/pages/CredentialsPage.tsx` | Add `data-tour` attrs, tour steps, SpotlightTour component, header tour button |

No database, routing, or new component changes. Reuses existing `SpotlightTour` component.

