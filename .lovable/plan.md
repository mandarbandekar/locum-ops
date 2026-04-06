

# Improve UX Across the Relief Business Hub

## Current Issues Identified

1. **Financial Health embeds the entire ReportsPage** inside a collapsible — this creates a page-within-a-page with its own month selector, AI summary card, and full charts. It's overwhelming and redundant.
2. **No top-level summary strip** — users land on a tab but don't get a quick pulse of their business before diving into sections.
3. **Clinic Scorecard cards lack visual hierarchy** — all rows look the same; no at-a-glance health indicator per clinic.
4. **Performance Insights has no section headers or grouping** — charts stack vertically with no visual separation or context.
5. **Tab navigation doesn't show counts/badges** — users can't tell which tab needs attention without clicking into it.
6. **No cross-tab quick links** — e.g., seeing an overdue invoice in Financial Health doesn't link to the Invoices page.

## Plan

### 1. Add a Hero Summary Strip at the Top of the Page (above tabs)

A horizontal row of 4 compact KPI cards always visible regardless of active tab:
- **YTD Revenue** (from paid invoices)
- **Outstanding** (unpaid invoice balance, red accent if overdue exists)
- **This Month's Shifts** (count)
- **Tax Reserve Status** (On Track / Behind badge)

This gives an instant pulse before the user digs into any tab. Computed once in `BusinessPage.tsx` and passed down or rendered inline.

### 2. Replace ReportsPage Embed in Financial Health

Instead of embedding the full `ReportsPage` component inside the Revenue Overview collapsible, extract just the key visuals:
- Monthly revenue bar chart (collected vs outstanding)
- Revenue by facility horizontal bar chart
- Month selector (keep)
- AI summary card (keep, but make it a compact callout)

Remove the duplicate KPI cards, delta badges, and page header that `ReportsPage` renders (since they clash with the hub layout). This is the biggest UX win — it eliminates the "page inside a page" feel.

### 3. Add Health Indicator to Clinic Scorecard Cards

Add a small colored dot or badge at the top-right of each clinic card:
- **Green**: No overdue invoices, payment speed < 14 days
- **Amber**: Payment speed 14-30 days or 1-2 overdue
- **Red**: Payment speed > 30 days or 3+ overdue

This lets users scan the grid and immediately spot problem clinics.

### 4. Add Section Grouping to Performance Insights

Group the 5+ charts into two labeled sections with subtle dividers:
- **Work Distribution** — Shifts per facility, Earnings by day, Monthly hours
- **Rate & Payment Analysis** — Avg rate per facility, Payment speed, Production-to-Pay

Each group gets a small heading with an icon, matching the `SectionHeader` pattern used in Financial Health.

### 5. Add Attention Badges to Tab Buttons

Show a small red dot or count on the tab buttons when attention is needed:
- **Financial Health tab**: dot if overdue invoices > 0 or tax status is "at risk"
- **Clinic Scorecard tab**: dot if any clinic has 3+ overdue invoices
- **Performance Insights**: no badge (informational only)

Computed in `BusinessPage.tsx` and rendered as a tiny `<span>` inside the tab button.

### 6. Add Quick Action Links

- In the Invoice & Cash Flow section: "View all invoices →" button linking to `/invoices`
- In the Expense section: "Manage expenses →" linking to `/expenses`
- In Clinic Scorecard cards: already links to facility detail (keep as-is)
- In Tax Reserve: already links to Tax Center (keep as-is)

## Files to Change

| File | Change |
|---|---|
| `src/pages/BusinessPage.tsx` | Add hero summary strip, compute attention badges, pass to tabs |
| `src/components/business/FinancialHealthTab.tsx` | Replace `<ReportsPage />` embed with extracted chart components; add quick-action links |
| `src/components/business/ClinicScorecardTab.tsx` | Add health indicator dot/badge to each card |
| `src/components/business/PerformanceInsightsTab.tsx` | Add grouped section headers around charts |
| `src/pages/ReportsPage.tsx` | No changes (stays as standalone route for Reports nav item) |

## Design Direction

- Hero strip uses the same `stat-card` pattern as the dashboard
- Section headers reuse the existing `SectionHeader` component from Financial Health
- Health indicators use the existing `chip-success` / `chip-warning` / `chip-error` CSS tokens
- Tab badges use a minimal 8px dot positioned top-right of the icon

