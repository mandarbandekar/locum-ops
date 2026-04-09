

# Guided Walkthrough — Spotlight Tour for Dashboard & App

## Summary

Build a step-by-step spotlight tour system that highlights key UI sections with a focused overlay, tooltip-style cards, and navigation controls. Accessible from the header (all users) and auto-triggered on first dashboard visit for new users. Each step spotlights a real element on the page with rich context tailored to relief vets.

## Architecture

Create a reusable `SpotlightTour` component that:
- Renders a full-screen overlay with a "cutout" around the target element (using `getBoundingClientRect` + CSS clip-path or box-shadow trick)
- Positions a tooltip card adjacent to the highlighted element
- Supports step navigation (Next / Back / Skip / Finish)
- Persists completion state in localStorage

```text
┌─────────────────────────────────────┐
│  Dark overlay (z-50)                │
│  ┌─────────┐                        │
│  │ Cutout   │← highlighted element  │
│  └─────────┘                        │
│     ┌──────────────────┐            │
│     │ Step 2 of 9      │            │
│     │ Title            │            │
│     │ Description...   │            │
│     │ [Back] [Next]    │            │
│     └──────────────────┘            │
└─────────────────────────────────────┘
```

## Tour Steps (9 steps across dashboard + sidebar)

| # | Target Element | Title | Description |
|---|---|---|---|
| 1 | Daily briefing strip | Your Daily Briefing | A personalized summary of what needs your attention today — upcoming shifts, overdue invoices, expiring credentials, and tax deadlines. This updates every time you open LocumOps. |
| 2 | Upcoming Shifts card | Upcoming Shifts | Your next 7 days at a glance. See which clinics you're covering, track your shift streak, and jump straight to your schedule. Relief vets juggling multiple clinics can spot gaps or double-bookings instantly. |
| 3 | Money to Collect card | Money to Collect | Track outstanding invoices, monthly revenue pace, and your oldest unpaid balance. LocumOps auto-generates invoices from your shifts — this card shows you who owes you money and how your cash flow is trending. |
| 4 | Needs Attention card | Needs Attention | Your prioritized action list: overdue invoices to follow up on, credentials about to expire, unconfirmed shifts, and upcoming tax deadlines. Items are sorted by urgency so you always know what to handle first. |
| 5 | Sidebar: Clinics & Facilities | Clinics & Facilities | Your clinic CRM. Store contact info, billing preferences, day rates, and contract checklists for every practice you work with. When you log shifts, invoices auto-generate based on each clinic's billing cadence. |
| 6 | Sidebar: Schedule | Schedule | A visual weekly calendar built for locum work. Book shifts, block personal time, detect conflicts, and send clinic confirmations. Shifts you log here flow directly into invoicing and tax tracking. |
| 7 | Sidebar: Invoices & Payments | Invoices & Payments | Invoices are auto-created from your shifts — no spreadsheets needed. Review drafts, send to clinics via secure links, track payment status, and set up auto-reminders for overdue balances. |
| 8 | Sidebar: Relief Business Hub | Relief Business Hub | Your financial command center. Revenue reports, facility-level analytics, and performance insights help you understand which clinics are most profitable and where your income is trending. |
| 9 | Sidebar: Tax Intelligence | Tax Intelligence | Estimated quarterly tax calculations based on your actual shift income. Track IRS payment deadlines, see your effective tax rate, and get S-Corp assessment nudges — all using 2026 tax brackets. |

## New Files

### `src/components/SpotlightTour.tsx`
- Props: `steps: TourStep[]`, `isOpen: boolean`, `onClose: () => void`
- Each `TourStep`: `{ targetSelector: string, title: string, description: string, placement: 'top'|'bottom'|'left'|'right' }`
- Uses `useEffect` + `ResizeObserver` to track target element position
- Renders overlay with box-shadow cutout: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)`
- Tooltip card with step counter, title, rich description, Back/Next/Skip buttons
- Scrolls target into view on each step
- On finish/skip: sets `localStorage.setItem('locumops_tour_completed', 'true')`

### `src/hooks/useSpotlightTour.ts`
- Manages tour open state
- Checks `localStorage` for completion
- Exposes `startTour()`, `isTourCompleted`, `resetTour()`
- Auto-starts tour on first dashboard visit if `onboarding_completed_at` is set but tour not completed

## Modified Files

### `src/pages/DashboardPage.tsx`
- Import `SpotlightTour` and `useSpotlightTour`
- Add `data-tour="briefing"`, `data-tour="shifts"`, `data-tour="money"`, `data-tour="attention"` attributes to the 4 dashboard sections
- Render `<SpotlightTour>` at bottom of page with all 9 steps
- Auto-trigger on mount if tour not completed (with 1s delay for layout)

### `src/components/AppSidebar.tsx`
- Add `data-tour="facilities"`, `data-tour="schedule"`, `data-tour="invoices"`, `data-tour="business"`, `data-tour="tax"` to the relevant sidebar menu items

### `src/components/Layout.tsx`
- Replace `DemoGuideDialog` with a "Take a Tour" button (visible for all users, not just demo)
- Button calls `startTour()` from the tour hook
- Keep existing `DemoGuideDialog` for demo mode as well

## UX Details

- Overlay uses `z-50` with smooth transitions
- Cutout element gets a subtle pulsing ring animation
- Tooltip card: rounded-xl, bg-card, max-w-sm, with step indicator dots
- Keyboard support: Escape to skip, arrow keys for nav
- Tour pauses if user navigates away; resumes on return to dashboard
- Sidebar auto-expands collapsed groups when spotlighting sidebar items

## No database changes. No routing changes. localStorage only for persistence.

