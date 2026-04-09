

# Unified Invoice Detail Page — Improved Lifecycle UX

## Current Issues

1. **Two completely separate panels** — Draft uses `InvoiceEditPanel` + `InvoiceActionBar`, while Sent uses `InvoiceSentPanel`. Switching status feels like loading a different page.
2. **Sticky bottom action bar only in draft** — After marking sent, all actions move into the left panel cards, losing the prominent CTA pattern.
3. **Too many cards in sent mode** — Send & Share, Balance, Line Items (read-only), Payment History, and Revert are all separate cards stacked vertically.
4. **Stepper click → confirmation dialog** is clunky for a simple status transition.
5. **Mobile**: Preview shows above edit panel (via `order` classes) but no way to toggle between them; both render simultaneously.

## Design

### Single unified page with a persistent action strip

Instead of swapping between two entirely different panel components, keep one consistent layout across all statuses:

```text
┌─────────────────────────────────────────────┐
│ ← Back  INV-2026-001  [Draft]  Facility     │
│ ●─────────●─────────○  Draft → Sent → Paid  │
├──────────────────┬──────────────────────────┤
│  Edit/Info Panel │  Live Preview (sticky)    │
│  (always present │                           │
│   but read-only  │                           │
│   when not draft)│                           │
├──────────────────┴──────────────────────────┤
│  [Contextual Action Bar — always visible]    │
│  Draft: Save Draft | PDF | → Mark as Sent    │
│  Sent:  PDF | Share | Record Payment         │
│  Paid:  PDF | Share | ✓ Paid in Full         │
└─────────────────────────────────────────────┘
```

### Key Changes

**1. Unified left panel** — Replace the `InvoiceEditPanel` / `InvoiceSentPanel` swap with a single component:
- **Draft**: Editable fields (invoice #, dates, notes, line items) — same as today
- **Sent/Overdue/Partial**: Same layout but fields become read-only text with an inline "Edit" button that reverts to draft
- **Paid**: Read-only with paid confirmation banner

**2. Persistent contextual action bar** — The sticky bottom bar stays visible in ALL statuses, not just draft:
- **Draft**: `Save Draft` | `PDF` | `→ Mark as Sent`
- **Sent**: `PDF` | `Share Link` | `Record Payment`
- **Overdue**: `Send Reminder` | `PDF` | `Record Payment`
- **Partial**: `PDF` | `Record Payment ($X remaining)`
- **Paid**: `PDF` | `Share` | `✓ Paid` (muted)

**3. Inline payment recording** — Instead of a dialog, expand a payment form inline in the left panel when "Record Payment" is clicked, keeping the user on the same page.

**4. Stepper improvements** — Direct status transitions on click without the intermediate confirmation dialog (keep only for backward moves like Sent → Draft).

**5. Mobile toggle** — On small screens, add a tab toggle (`Edit` / `Preview`) instead of stacking both panels. Only one shows at a time.

**6. Payment history + timeline** — Collapse these into an expandable section at the bottom of the left panel instead of separate cards.

## Files

| File | Change |
|---|---|
| `src/pages/InvoiceDetailPage.tsx` | Unify layout: remove panel swap, add mobile tab toggle, always render action bar, remove stepper confirmation for forward moves |
| `src/components/invoice/InvoiceActionBar.tsx` | Make status-aware: render contextual buttons for all statuses (draft/sent/overdue/partial/paid) |
| `src/components/invoice/InvoiceEditPanel.tsx` | Add `readOnly` prop: when true, render fields as text instead of inputs, with an "Edit (revert to draft)" link |
| `src/components/invoice/InvoiceSentPanel.tsx` | Remove — functionality absorbed into unified EditPanel + ActionBar |
| `src/components/invoice/InvoiceStepper.tsx` | Remove confirmation dialog for forward transitions; keep only for backward moves |

No database changes needed.

