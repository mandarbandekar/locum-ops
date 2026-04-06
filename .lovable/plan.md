

# Improve Sidebar Navigation UX

## Problem

The current sidebar is a flat list of 7 items with generic labels. It doesn't communicate a workflow narrative — users see disconnected pages rather than a cohesive system for managing their locum practice. Key issues:

1. **Flat structure** — no grouping signals which items relate to each other
2. **Generic labels** — "Business" and "Credential Management" don't convey workflow value
3. **No live context** — sidebar doesn't surface counts, badges, or status that pull users toward action
4. **No workflow grouping** — scheduling, invoicing, and facilities are the core loop but appear as peers to settings

## Proposed Changes

### 1. Group nav items into labeled sections

Organize into three visual groups using `SidebarGroupLabel`:

```text
──────────────────
  [Logo] LocumOps
──────────────────
  OVERVIEW
    Dashboard

  PRACTICE
    Clinics & Facilities
    Schedule
    Invoices & Payments

  BACK OFFICE
    Expenses & Mileage
    Credentials & CE
    Tax Planning

  ──────────────────
  Settings
  Logout
```

This makes the core work loop (Practice) visually distinct from support functions (Back Office).

### 2. Rename nav items for clarity

| Current | New | Why |
|---------|-----|-----|
| Practice Facilities | Clinics & Facilities | Matches how relief vets talk |
| Business | split into Expenses & Tax | "Business" is vague; splitting surfaces the two distinct workflows |
| Credential Management | Credentials & CE | Shorter, includes CE which lives there |

### 3. Add attention badges

Show small count badges on nav items when action is needed:
- **Invoices**: count of draft invoices ready to send
- **Schedule**: count of unconfirmed upcoming shifts
- **Credentials**: count of items expiring within 30 days
- **Expenses & Mileage**: count of draft mileage entries pending review

Badges use the existing `Badge` component, small and muted, appearing next to the label.

### 4. Promote Expenses to top-level nav

Currently Expenses is buried inside the Business page as a tab. By giving it (and Tax Planning) their own sidebar entries under "Back Office," users can reach them directly. The Business page becomes the "Insights" / reports view only — or we remove it and link reports from Dashboard.

### 5. Collapsible groups

Each section group is collapsible (using `Collapsible` from the existing UI library) but defaults to open. In collapsed sidebar mode (icon-only), groups are hidden and only icons show.

## Files to Change

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Restructure into grouped sections, rename items, add badge counts, split Business into separate entries |
| `src/pages/ExpensesPage.tsx` | Ensure it works as a standalone route (it already does via `/business?tab=expenses`, but needs its own `/expenses` route) |
| `src/App.tsx` | Add `/expenses` and `/tax-planning` routes pointing to `ExpensesPage` and `TaxStrategyPage` |
| `src/pages/BusinessPage.tsx` | Remove Expenses and Tax tabs; keep only Insights/Reports + Tax Advisor (or merge Tax Advisor into tax-planning route) |

## Technical Notes

- Badge counts are derived from existing hooks: `useData()` for invoices/shifts, `useCredentials()` for credentials, `useExpenses()` for draft mileage
- Groups use `SidebarGroup` + `SidebarGroupLabel` already available in the sidebar component library
- Collapsed mode hides labels and group headers, showing only icons — no change needed there
- Routes for `/expenses` and `/tax-planning` are simple additions to the existing router

