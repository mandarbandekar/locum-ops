
# Mobile PWA for Locum Ops

A focused, field-friendly mobile companion that lives alongside the existing desktop app. Desktop routes, layouts and business logic stay untouched — mobile renders a different shell over the same data.

## Approach

- **One codebase, two shells.** `Layout.tsx` decides between the existing desktop shell and a new `MobileAppShell` based on viewport width (<768px) **or** PWA standalone display mode. Listens to a `useIsMobile()` hook that watches both `matchMedia('(max-width: 767px)')` and `matchMedia('(display-mode: standalone)')`.
- **Same routes.** Mobile reuses the existing URLs (`/`, `/schedule`, `/facilities`, `/invoices`, etc.). Each top-level page conditionally renders a mobile page component when in the mobile shell, otherwise the existing desktop page. No router restructuring. No `/m/*` parallel routes.
- **Same data layer.** All hooks, `DataProvider`, Supabase queries, invoice edge function, mileage logic, expense logic — reused as-is. Mobile components are presentation only.
- **Installable PWA, manifest only.** No service worker (per choice). Splash, icons, theme color, safe-area handling.

## Mobile screens

Each mobile screen is a thin presentation layer that pulls from existing hooks/data:

| Route | Mobile component | Reuses |
|---|---|---|
| `/` | `MobileTodayPage` | dashboard hooks, next-shift query, business snapshot |
| `/schedule` | `MobileSchedulePage` | existing shift queries + edit flow |
| `/facilities` | `MobileClinicsPage` | facilities query |
| `/facilities/:id` | `MobileClinicDetailPage` | facility detail query |
| `/invoices` (Money tab) | `MobileMoneyPage` (segmented: Invoices / Expenses / Mileage) | invoices, expenses, mileage hooks |
| `/invoices/:id` | `MobileInvoiceDetailPage` | invoice detail + PDF edge function |
| `/business` | `MobileInsightsPage` | business insights query |

Bottom nav tabs map to: Today → `/`, Schedule → `/schedule`, Clinics → `/facilities`, Money → `/invoices`, Insights → `/business`.

## Reusable mobile components

Under `src/components/mobile/`:
- `MobileAppShell` (wraps content + bottom nav, applies safe-area insets)
- `MobileBottomNav` (5 tabs, active teal indicator)
- `MobilePageHeader` (title + subtitle + profile button)
- `MobileMetricCard`
- `MobileActionButton` / `MobilePrimaryCTA` (sticky variant)
- `MobileShiftCard`, `MobileClinicCard`, `MobileInvoiceCard`, `MobileExpenseCard`
- `MobileBottomSheet` (wraps shadcn Drawer)
- `MobileSegmentedControl`
- `MobileFloatingButton`

## Forms / flows

Reuse existing form logic; render in a `MobileBottomSheet` or full-screen mobile sheet rather than the desktop dialog:
- **Add clinic** — mobile wrapper around existing `AddFacilityDialog` form fields.
- **Add / edit shift** — mobile wrapper around existing shift creation/edit logic (3-step on new, single-screen edit per existing convention).
- **Add / edit expense** — wraps current expense form.
- **Confirm mileage** — calls existing mileage confirmation mutation.

## Invoice review & share

- `MobileInvoiceDetailPage` shows summary, line items, totals.
- "Edit invoice" opens existing invoice editor (mobile-sheet wrapper).
- "Share PDF":
  1. Call existing invoice PDF edge function → Blob.
  2. Cache Blob in IndexedDB keyed by `invoice_id + updated_at` for instant re-share.
  3. If `navigator.canShare({ files: [pdfFile] })` → `navigator.share(...)` (Gmail, Messages, Mail, AirDrop, etc).
  4. Fallback: trigger download via object URL.

## Insights

Lightweight inline SVG sparkline (no new dep) for the revenue trend. Metric cards + top clinics list reuse existing business insights query.

## PWA setup

- `public/manifest.webmanifest`: name "Locum Ops", short_name "Locum Ops", `display: standalone`, theme/background colors matching the mobile palette, icons (192, 512, maskable).
- `index.html`: `<link rel="manifest">`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-capable`, `viewport-fit=cover`.
- iOS splash assets for common sizes.
- Safe-area: `env(safe-area-inset-*)` on bottom nav and sticky CTAs.
- **No service worker** (per choice — keeps Lovable preview clean and avoids stale-cache risk).

## Design tokens

Add mobile-scoped tokens to `index.css` (do not change desktop theme):
- `--mobile-bg` warm off-white
- `--mobile-card` white
- `--mobile-primary` deep teal
- `--mobile-accent` light mint
- `--mobile-text` dark navy
- `--mobile-text-muted` muted gray
- Card radius 16px, large tap targets (min 44px), subtle borders (flat — no shadows per project memory).

The "no box shadows on cards" project rule is preserved; the spec's "subtle shadows" is interpreted as subtle borders + slight elevation only for the floating action button and sticky CTAs.

## What does NOT change

- Desktop `Layout.tsx`, `AppSidebar.tsx`, all desktop pages render identically at ≥768px.
- All Supabase tables, RLS, edge functions, hooks, contexts: untouched.
- Existing invoice automation, mileage logic, scheduling rules, timezone handling: untouched.
- No schema changes required.

## Out of scope (V1)

- Offline data caching / service worker.
- Native camera capture beyond `<input type="file" accept="image/*" capture>`.
- Push notifications.
- Mobile-specific settings screens (settings remain desktop-only in V1; mobile profile button links to a basic profile sheet).

## Technical details

```text
src/
  components/
    mobile/
      MobileAppShell.tsx
      MobileBottomNav.tsx
      MobilePageHeader.tsx
      MobileBottomSheet.tsx
      MobileSegmentedControl.tsx
      cards/ (Shift, Clinic, Invoice, Expense, Metric)
      sheets/ (AddClinicSheet, AddShiftSheet, AddExpenseSheet, EditShiftSheet)
  pages/mobile/
    MobileTodayPage.tsx
    MobileSchedulePage.tsx
    MobileClinicsPage.tsx
    MobileClinicDetailPage.tsx
    MobileMoneyPage.tsx
    MobileInvoiceDetailPage.tsx
    MobileInsightsPage.tsx
  hooks/
    useIsMobile.ts (viewport + standalone detection)
    useInvoicePdfShare.ts (Web Share API + IndexedDB cache + download fallback)
public/
  manifest.webmanifest
  icons/ (192, 512, maskable, apple-touch)
  splash/ (iOS splash images)
```

Routing change: `Layout.tsx` switches shell based on `useIsMobile()`. Each page module exports a small `if (isMobile) return <MobileXPage />` guard, so the existing `<Routes>` block in `App.tsx` stays intact.

## Tests

Vitest unit tests for:
- Bottom nav active state on each route.
- Mobile shell renders for narrow viewport, desktop shell for wide.
- Today screen renders next shift + needs-attention items from mock data.
- Share PDF: Web Share path vs download fallback.
- Add clinic / add shift / add expense sheets open and submit through existing mutations.
- Snapshot test confirming desktop pages render unchanged at ≥768px.
