# Mobile Invoices UX redesign

The mobile Invoices tab is currently a flat list sorted by date with a generic 3-card metric strip (Outstanding / Expenses / Mileage). The desktop experience is much richer: a summary strip, an overdue alert, a "Ready to review" CTA, and collapsible groups (Overdue, Ready to Review, Sent & Awaiting, Upcoming, Paid). Mobile loses all of that signal.

This plan brings the same mental model to mobile, adapted for a 390px width and thumb-friendly interactions.

## What changes

### 1. Invoice-specific summary tiles (replace generic strip when on Invoices tab)
When the Invoices tab is active, the 3 top metric cards become invoice-focused and tappable as filters/scroll-tos:
- **Overdue** — balance + count, red tone
- **Awaiting** — sent + partial balance, blue tone
- **Ready to review** — draft total, amber tone

Expenses and Mileage tabs keep their existing relevant tiles.

### 2. Overdue alert banner
If any overdue exists, show a compact red banner above the list:
"$X overdue across N invoices" with a "Review" link to the first overdue invoice.

### 3. Ready-to-review CTA banner
If any draft is ready, show an amber banner:
"N invoices ready to review" + "Review next →" button (jumps into the first one).

### 4. Status-grouped sections (replace flat list)
Five collapsible sections in this order, hidden when empty:
1. **Overdue** — open by default, red accent
2. **Ready to review** — open by default, amber accent
3. **Sent & awaiting payment** (sent + partial) — open by default, blue accent
4. **Upcoming auto-generated** — collapsed by default, muted
5. **Paid** — collapsed by default, green accent; show "Paid this month: $X" in header

Each section header shows: icon, title, count chip, total/balance amount, chevron to toggle.

### 5. Invoice row
Compact card per invoice:
- Line 1: Facility name (bold) + total amount (right)
- Line 2: Invoice # · date · status chip
- Tap card → invoice detail
- Action row (only where meaningful):
  - Overdue / Awaiting: **Mark paid** + **Share**
  - Ready to review: **Review & send** (primary) + **Share**
  - Paid: **Share** only
  - Upcoming: no action row (tap-only)

### 6. FAB stays
Icon-only "Create invoice" FAB remains in the bottom-right corner.

### 7. Empty state
When no invoices at all, show a single centered card ("No invoices yet. They'll appear here once shifts are completed.") instead of the current bare message.

## Files to touch

- `src/pages/mobile/MobileMoneyPage.tsx` — main rewrite of the `tab === "invoices"` branch and the top metrics strip (conditional per tab).
- Possibly add `src/components/mobile/MobileInvoiceGroup.tsx` — small collapsible section component reused for each status group.

No changes to desktop, business logic, or data layer. Status derivation reuses `getComputedInvoiceStatus` and `isInvoiceOverdue` already exposed via `DataContext` / `invoiceHelpers`.

## Out of scope

- Mark-paid dialog flow on mobile (will navigate to invoice detail for now; can be added later).
- Bulk actions and facility grouping inside "Ready to review" (desktop-only complexity).
- Filters / search bar (can be added in a follow-up).
