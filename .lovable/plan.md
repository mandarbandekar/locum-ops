# Mobile UX polish pass

Goal: make the mobile app feel native — tighter type, sticky compact headers, real safe-area support, sheet-based forms, and consistent press feedback. No backend or desktop changes.

## 1. Shared tokens (`src/index.css` mobile block)

Add a fluid, responsive type scale and tap-target tokens used by every mobile screen so layouts adapt from 320px (iPhone SE) to 430px (Pro Max):

```text
--m-text-xs:    clamp(10.5px, 2.8vw, 11.5px)   // captions, eyebrows
--m-text-sm:    clamp(12px,   3.2vw, 13px)     // secondary
--m-text-base:  clamp(13.5px, 3.6vw, 14.5px)   // body
--m-text-md:    clamp(14.5px, 3.8vw, 15.5px)   // emphasized body
--m-text-lg:    clamp(15.5px, 4vw,   17px)     // section titles
--m-text-xl:    clamp(18px,   4.6vw, 20px)     // page subtitle/metric
--m-title:      clamp(20px,   5.4vw, 24px)     // page header title (was 26px hard-coded)
--m-tap:        44px                            // min hit target
--m-gutter:     clamp(14px, 4vw, 18px)          // page side padding (replaces px-5)
```

Plus utility classes: `.m-title`, `.m-subtitle`, `.m-eyebrow`, `.m-body`, `.m-caption`, `.m-press` (active:scale-[0.98] active:opacity-90 transition), `.m-tap` (min-h/min-w 44px), `.m-gutter` (px = var(--m-gutter)).

## 2. Sticky compact header (`MobilePageHeader`)

- Convert header to `sticky top-0 z-30` with `backdrop-blur` and translucent `bg-[hsl(var(--m-card)/0.85)]`.
- Replace hard-coded `text-[26px]` with `var(--m-title)`; subtitle uses `--m-text-sm`.
- Add optional `onBack` prop rendering a 44px chevron-left button (used by all detail pages — replaces ad-hoc back buttons in `MobileClinicDetailPage` etc.).
- Profile button: 40→44px tap target, `.m-press` feedback.
- Use `var(--m-gutter)` for side padding; `pt-safe` already handles notch.

## 3. App shell + bottom nav

- `MobileAppShell`: add `overscroll-contain` and `touch-pan-y` to the scroll main; ensure `pt-safe` is applied at the shell root for screens that opt-out of header.
- `MobileBottomNav`: keep 64px but make icons/labels respond to `--m-text-xs`; add `.m-press` per tab; bump hit area via `min-h-[var(--m-tap)]`; thicken active indicator only on the active tab.
- `MobileFab`: respect bottom-nav + safe-area offset via `bottom: calc(var(--m-bottom-nav-h) + var(--m-safe-bottom) + 16px)` so it never overlaps the home indicator on iPhone 14/15 Pro.

## 4. Per-screen polish

For each page below: swap hard-coded `text-[NNpx]` to the new tokens (moderate shrink: headings −2 steps, body 14px, captions 12px), apply `var(--m-gutter)` instead of `px-5`, add `.m-press` to all interactive cards/rows, and ensure no horizontal overflow at 320px (replace fixed grids with `flex-wrap` or `min-w-0` + `truncate` where needed).

- `MobileTodayPage` — quick-action tiles in grid become equal-width with `min-w-0`; metric rows use `--m-text-lg/sm`.
- `MobileSchedulePage` — month switcher buttons get 44px hit area; day cards tighten to `--m-text-sm` meta.
- `MobileMoneyPage` + `MobileInvoiceDetailPage` — amounts use `--m-text-xl`, labels `--m-text-xs uppercase`; status chips already correct.
- `MobileInsightsPage` — metric cards (`MobileMetricCard`) value to `--m-text-xl`, eyebrow to `--m-text-xs`.
- `MobileClinicsPage` + `MobileClinicDetailPage` — list rows min-h 64px, replace inline back button with header `onBack`, contact quick-action tiles wrap on narrow screens.
- `MobileSettingsPage` — section rows already close; tighten body to `--m-text-md`, captions to `--m-text-xs`, add `.m-press`.

## 5. Bottom-sheet forms

Any dialog still used inside the mobile shell switches to `Drawer` (bottom sheet) the same way `AddExpenseDialog` already does. Audit + convert:

- `AddFacilityDialog`
- `ShiftFormDialog` (mobile only — desktop keeps Dialog)
- `AddContactDialog` / contact edit
- `InvoiceCreateDialog` wizard steps
- Settings edit dialogs invoked from mobile (timezone, profile, rate card edit)

Pattern: `useIsMobile()` → `Drawer` with `max-h-[92vh]`, body `flex-1 overflow-y-auto`, sticky footer button row with safe-area padding. Shared JSX form body, no duplication.

## 6. Press + safe-area details

- Global rule in mobile CSS: `button, a, [role="button"] { -webkit-tap-highlight-color: transparent; }`
- Standard `.m-press` applied to every tappable surface (rows, tiles, FAB, nav).
- Bottom nav, FAB, and any fixed footer all consume `env(safe-area-inset-bottom)`.
- Header consumes `env(safe-area-inset-top)` via existing `pt-safe`.

## Out of scope

- Desktop layouts (`useIsMobile` guards keep them unchanged).
- Information architecture / routing changes (e.g. the previously rejected clinic sub-screen split).
- New features, copy rewrites, or data model changes.
- Dark mode tweaks beyond what the existing tokens already provide.

## Technical notes

- All sizes flow through CSS variables so future tuning is one-file.
- `clamp()` keeps text legible from 320px to 430px+ without media queries.
- `MobilePageHeader.onBack` is additive — existing call sites that don't pass it keep current behavior.
- Drawer conversions reuse the AddExpenseDialog pattern already shipped, so no new dependency.
