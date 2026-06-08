# Mobile Companion for Locum Ops — Build Plan

## Goal
A responsive mobile experience layered on top of the existing app. Desktop is untouched. On phones (< 768px), users see a dedicated mobile shell with bottom nav and focused field workflows (before/during/after shift). Tablets get the existing desktop layout with light spacing tweaks (hybrid).

No backend, schema, or business-logic changes. All mobile screens consume the existing hooks (`useCalendarEvents`, `useExpenses`, `useFacilities`, `useInvoices`, etc.) and the existing Supabase client.

## Architecture

```text
App.tsx
 └─ AuthenticatedApp
     └─ ResponsiveLayout            ← NEW: picks shell by viewport
         ├─ Layout (desktop, existing, unchanged)
         └─ MobileLayout (NEW)
             ├─ MobileTopBar (compact: title + theme + feedback)
             ├─ <main> with safe-area padding
             └─ MobileBottomNav (Home / Calendar / Clinics / Invoices / More)
```

Routing strategy:
- Keep all existing routes.
- Add 5 mobile-only routes that render inside `MobileLayout` when `useIsMobile()` is true. On desktop the same routes fall back to the existing pages so deep links stay valid.
- `useIsMobile` already exists at `src/hooks/use-mobile.tsx` — reuse it.

Bottom nav routes:
| Tab       | Route        | Mobile screen              | Desktop fallback     |
|-----------|--------------|----------------------------|----------------------|
| Home      | `/`          | `MobileHomePage`           | `DashboardPage`      |
| Calendar  | `/schedule`  | `MobileSchedulePage`       | `SchedulePage`       |
| Clinics   | `/facilities`| `MobileFacilitiesPage`     | `FacilitiesPage`     |
| Invoices  | `/invoices`  | `MobileInvoicesPage`       | `InvoicesPage`       |
| More      | `/more`      | `MobileMorePage` (NEW)     | redirect to `/settings/profile` |

Detail routes (`/facilities/:id`, `/invoices/:id`) get mobile variants that share the same URLs.

## New files

```text
src/components/mobile/
  MobileLayout.tsx                 shell, safe-area, sticky bottom nav
  MobileTopBar.tsx                 title + minimal actions
  MobileBottomNav.tsx              5-item nav, large tap targets
  ResponsiveLayout.tsx             chooses Mobile vs desktop Layout
  cards/
    NextShiftCard.tsx              hero card on Home
    ShiftListItem.tsx              shared by Home/Calendar
    ClinicCard.tsx
    InvoiceCard.tsx
    UrgentTaskCard.tsx
  sheets/
    QuickActionsSheet.tsx          bottom sheet: directions/contact/notes/expense/complete
    QuickAddShiftSheet.tsx         simplified shift add (wraps existing creation hook)
    MarkPaidSheet.tsx
    SendReminderSheet.tsx

src/pages/mobile/
  MobileHomePage.tsx
  MobileSchedulePage.tsx           agenda/list view grouped by date + month selector
  MobileFacilitiesPage.tsx         searchable list of ClinicCard
  MobileFacilityDetailPage.tsx     quick-reference card + sticky CTAs
  MobileInvoicesPage.tsx           grouped by status (Draft/Sent/Overdue/Paid)
  MobileInvoiceDetailPage.tsx      view + Mark paid / Send reminder / Download
  MobileMorePage.tsx               links to Credentials/Expenses/Mileage/Settings/Help
```

## Modified files

- `src/App.tsx` — wrap routes in `ResponsiveLayout`; add `/more` route; mount mobile detail variants when `useIsMobile()`.
- `src/index.css` — add safe-area CSS vars + `.mobile-tap-target` utility (44×44 min), `body { overscroll-behavior-y: contain }`.
- `index.html` — add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (verify), `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon` references.
- `public/manifest.webmanifest` — name, short_name, theme/background color, `display: "standalone"`, icons (manifest-only per PWA skill; no service worker).

## Screen contracts

**Home (`MobileHomePage`)**
- Pulls next upcoming shift from `useCalendarEvents` (earliest future shift).
- `NextShiftCard`: clinic name, date, time (clinic tz), address, status pill.
- Quick actions row → opens `QuickActionsSheet`: Directions (Google Maps deep link), Contact (tel:/mailto: from facility contacts), View notes (sheet), Add expense (prefilled facility/date), Mark complete.
- Urgent tasks list: overdue invoices, expiring credentials (≤30d), unpaid invoices — reuses existing hooks already feeding dashboard.
- Month-to-date revenue summary (from existing dashboard data source).
- Sticky FAB: Quick Add Shift.

**Calendar (`MobileSchedulePage`)**
- Default agenda list; month selector at top (chevrons + month label).
- Shifts grouped by date, each rendered as `ShiftListItem` (clinic, time, rate type, invoice status pill).
- FAB: Quick Add Shift.

**Clinics (`MobileFacilitiesPage` / detail)**
- Search input sticky at top; results as `ClinicCard`.
- Detail screen: address (tap → maps), primary contact, invoice contact, default rate, parking/entry notes, latest shift notes. Sticky bottom CTAs: Call, Email, Add shift.

**Invoices (`MobileInvoicesPage` / detail)**
- Sectioned by Draft / Sent / Overdue / Paid.
- `InvoiceCard`: clinic, period, amount, due, status.
- Detail: line summary + actions: Mark paid (sheet w/ date + method), Send reminder, View/Download PDF (existing edge function). No editing in V1.

**More (`MobileMorePage`)**
- Tile list → routes: `/credentials`, `/expenses`, `/expenses?tab=mileage`, `/settings/profile`, `/settings/help` (or external help URL).

## Data & business logic
- All read paths reuse existing hooks; no new queries written from scratch unless an existing hook is missing.
- All write paths (mark paid, add expense, add shift, send reminder) call the **same mutations the desktop UI already calls**. No duplicated logic.
- No schema changes. No new RLS, no new migrations.

## Responsive rules
- `< 768px` → MobileLayout + mobile pages.
- `≥ 768px` → existing Layout + existing pages (unchanged).
- Tablet hybrid: keep desktop layout; we only adjust paddings via existing Tailwind responsive classes (no new tablet shell in V1).

## PWA scope (manifest-only)
Per project PWA guidance: add manifest + icons + meta tags only. No service worker, no `vite-plugin-pwa`, no offline behavior in V1. Users can "Add to Home Screen".

## Out of scope (V1)
- Editing invoices on mobile
- Offline support / background sync
- Push notifications
- Mobile-specific tax/CPA/business deep dives (kept under More → existing pages)
- Tablet-specific layout

## Verification
- Toggle preview between mobile and desktop viewports; confirm desktop pages render unchanged at ≥768px and mobile shell renders at <768px.
- Manually walk: Home → quick actions → add expense; Calendar → quick add shift; Clinics → detail → call; Invoices → mark paid; More → credentials.
- Confirm no new migrations were generated.
