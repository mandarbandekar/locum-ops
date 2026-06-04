## Mileage Tracker — Category Redesign

Restructure the Mileage Tracker into two clearly labeled categories, each with its own subcategories. The hero stays pinned at the top because it's the core value the user comes here to see.

### New layout (top → bottom)

```text
┌──────────────────────────────────────────────────────┐
│  HERO — Money found this year                        │
│  $1,471.40                                           │
│  2,102 mi · 4 clinics · +$320 this month             │
└──────────────────────────────────────────────────────┘

[Pending review banner — only when drafts exist]
[Backfill past shifts — only when applicable]
[YTD starting balance — compact row]

══════════════════════════════════════════════════════
  CATEGORY · Money Claimed
══════════════════════════════════════════════════════
  └─ Business Drives
     • List of confirmed mileage trips (date · clinic ·
       route · miles · $)
     • Empty state nested inside this subcategory

══════════════════════════════════════════════════════
  CATEGORY · Mileage Reports
══════════════════════════════════════════════════════
  └─ Download report
     • Month / range filter + PDF + CSV (existing
       MileageReportCard moved here)
```

### Where "Money found this year" lives

**Recommendation: keep it as a pinned hero at the very top of the Mileage Tracker page**, above both categories. Rationale:

- It's the headline value users return to see — burying it inside a category weakens the emotional payoff
- Both categories below feed into that number (claims add to it, reports export it), so it reads naturally as the summary
- Matches the pattern already used on Dashboard / Business hub (hero summary strip)

Alternative considered and rejected: nesting under "Money Claimed". That hides the number behind a section header and makes Reports feel disconnected from the value.

### Visual treatment for categories

- Category header: uppercase eyebrow label (`text-[11px] font-medium uppercase tracking-wide text-muted-foreground`), thin top divider, ~16–20px vertical spacing
- Subcategory header: small section title above its content card(s)
- Flat design (per project rules): no box shadows, themed borders only

### Technical notes

- Single file change: `src/components/expenses/MileageTrackerTab.tsx` — reorganize JSX into two `<section>` blocks (`Money Claimed` and `Mileage Reports`) with subcategory wrappers. No business logic / hooks change.
- `MileageReportCard` moves inside the "Mileage Reports" section unchanged.
- Confirmed trips list moves inside `Money Claimed → Business Drives` subcategory; the existing empty state stays, restyled to fit the subcategory frame.
- Hero, review banner, backfill card, and starting balance row remain above the categories (they're operational, not "claimed money" yet).
- Empty state (no home address) is unaffected.

### Out of scope

- No DB/schema changes
- No changes to CPA Prep
- Sidebar label stays "Mileage Tracker"
