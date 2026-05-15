## Mobile Dashboard UX Pass

Goal: at ≤768px, prioritize what a relief vet actually opens the dashboard for (todos + next shift), make every section thumb-friendly, and stop forcing users to scroll past dense financial widgets to reach their action list. Desktop layout unchanged.

### 1. Reorder the dashboard stack on mobile

Current order (mobile + desktop): Briefing → Money Pipeline → Tax Callout → Upcoming Shifts → Needs Attention.

New order on mobile only (`md:` breakpoint controls desktop):
```text
1. Briefing (condensed, see §3)
2. Upcoming Shifts strip
3. Needs Attention (the to-do list users came for)
4. Money Pipeline (compact, see §2)
5. Quarterly Tax Callout (chip, see §4)
```

Implementation: in `DashboardPage.tsx`, wrap each section in an ordered fragment with Tailwind `order-*` classes, or render two stacks (mobile vs desktop) gated by a `useIsMobile` hook (already exists in the project). Reuse the same component instances — only rearrange.

### 2. Compact Money Pipeline on mobile

Current: 5 stages (Completed, Invoiced, Due Soon, Overdue, Collected) rendered in a row → squeezed at 390px.

Mobile behavior:
- **Hide stages with $0** (e.g. no Overdue this month → don't render the card).
- **Horizontal snap-scroll carousel** of stage cards (`overflow-x-auto snap-x snap-mandatory`), each card `min-w-[240px]` so two peek at a time signaling "scroll for more."
- Keep the quarter-summary footer (Q earnings + shifts) full-width below the carousel.
- Desktop (`md:` and up) keeps the existing grid layout.

File: `src/components/dashboard/MoneyPipeline.tsx`.

### 3. Condense Briefing on mobile

Current: `BriefingBanner` renders all sentences as a paragraph block.

Mobile behavior:
- Show greeting + first 2 sentences only.
- If more sentences exist, render a "Show more" inline toggle that expands the rest in place.
- Desktop unchanged (full briefing visible).

File: `src/components/dashboard/BriefingBanner.tsx`.

### 4. Collapse Quarterly Tax Callout into a chip on mobile

Current: full card with quarter, deadline, days, earnings, estimated tax.

Mobile behavior:
- Render as a single-line chip: `Q3 tax due in 12 days · ~$2,400` with chevron.
- Tap expands inline (or routes to `/tax-center`).
- Desktop keeps the full callout.

File: `src/components/dashboard/QuarterlyTaxCallout.tsx`.

### 5. Thumb-zone FAB for quick actions

Add a floating action button visible only on mobile (`md:hidden`), pinned `fixed bottom-4 right-4 z-40`.

- Primary "+" button opens a small popover with: Add Shift, Add Clinic, Mark Invoice Paid.
- Hooks into existing `setAddShiftOpen`, `setAddClinicOpen`, and navigates to `/invoices?filter=sent` for Mark Paid.
- Hidden when any modal/dialog is open to avoid overlap.
- Hidden in onboarding states (empty dashboard, FirstTimeDashboard).

New component: `src/components/dashboard/MobileQuickActionsFab.tsx`. Wire it from `DashboardPage.tsx`.

### Non-goals

- No business logic, calculation, or data-shape changes.
- No desktop layout changes.
- No new routes or backend work.
- Reminders, briefing copy, and stage definitions stay as-is.

### Verification

- Resize preview to 390px and confirm: new order, pipeline scrolls horizontally, briefing collapses, tax chip renders, FAB appears.
- Resize to ≥768px and confirm desktop is visually unchanged.
- Empty state and FirstTimeDashboard paths still render without the FAB.

### Files touched

- `src/pages/DashboardPage.tsx` — reorder + mount FAB
- `src/components/dashboard/MoneyPipeline.tsx` — mobile carousel + hide $0
- `src/components/dashboard/BriefingBanner.tsx` — mobile collapse
- `src/components/dashboard/QuarterlyTaxCallout.tsx` — mobile chip variant
- `src/components/dashboard/MobileQuickActionsFab.tsx` — new
