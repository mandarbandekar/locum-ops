
## Goal

Reshape the **Mileage Tracker** tab inside `Expenses & Mileage` so it mirrors the Business Insights pattern (`primary-tab-btn` segmented switcher like *Financial Health / Performance Insights*), and surface the *Money found this year* number as the always-visible centerpiece.

## New layout

```text
Expense and Mileage Tracking
├── Tab: Expenses
├── Tab: Mileage Tracker   ← redesigned
│   ├── 💚 HERO STRIP (persistent, above sub-tabs)
│   │     "Money found this year  $X,XXX.XX"
│   │     "N miles · M clinics · +$X this month"
│   │
│   ├── Sub-tab switcher (primary-tab-btn style)
│   │     [ 🚗 Business Drives ]   [ 📄 Mileage Reports ]
│   │
│   ├── ── Business Drives ──────────────────────────
│   │     • Pending review banner (drafts)
│   │     • Backfill past shifts card
│   │     • Confirmed drives list ("Money claimed")
│   │     • Top-right corner chip on this sub-tab:
│   │         "+ Add miles tracked elsewhere"  (× dismiss)
│   │       → opens the existing Starting Balance dialog
│   │       → dismiss persists in localStorage; chip
│   │         reappears automatically if starting
│   │         balance > 0 so the user can edit
│   │
│   └── ── Mileage Reports ──────────────────────────
│         • Existing MileageReportCard (filters,
│           month picker, PDF + CSV download)
│         • Onboarding/empty hint when no confirmed
│           drives yet
│
└── Tab: Write-Off Summary
```

## Where the "Money found this year" module lives

**Recommendation: keep it as a persistent hero strip directly under the page tabs and above the Business Drives / Mileage Reports switcher.** Reasons:

- It is the *core value moment* — the user should see it whether they're reviewing drives or pulling a report.
- Putting it above the sub-tab switcher (rather than inside one sub-tab) avoids it disappearing when the user clicks into Reports.
- Matches the pattern we already use on Relief Business Hub's Hero Summary Strip.

If we ever need to compress on mobile, it can collapse to a single line: `$X,XXX · N mi · M clinics`.

## Files to change

- `src/components/expenses/MileageTrackerTab.tsx`
  - Extract hero card into a small local component, keep it rendered above the new sub-tab switcher.
  - Add `primary-tab-btn` switcher with two options: `business-drives` (default) and `reports`. Use `useSearchParams` (`mileageView=`) so deep links survive refresh, consistent with BusinessPage.
  - Move *Pending Review*, *Backfill*, and *Money claimed list* under the Business Drives sub-view.
  - Move `MileageReportCard` into the Reports sub-view.
  - Replace the inline starting-balance Card with a compact **corner chip** rendered only inside Business Drives (top-right of that section). Add a small ✕ dismiss button that writes to `localStorage` key `locumops_mileage_starting_chip_dismissed`. If `startingMiles > 0`, chip reappears as an "Edit starting balance" affordance regardless of dismissal.
  - Empty-state (no home address) path stays unchanged.

- No changes to data hooks, DB, or business logic.
- No copy changes to onboarding cards.

## Visual + tone

- Sub-tab buttons use the same `primary-tab-btn` / `primary-tab-btn--active` classes as Business Insights for parity.
- Hero strip styling stays as the existing teal `$1A5C6B` number on a flat Card (no shadows, per design system).
- Corner chip uses themed border + muted background, no shadow.

## Out of scope

- No new analytics events.
- No changes to PDF/CSV generation.
- No changes to mileage rate, calculations, or migrations.
