## Goal

Replace the long, passive strikethrough checklist on the Invoice Detail page with a focused, **guided next-action panel** that pushes the user straight to the screen where they can resolve the blocker.

## Problems with current UX

- Shows all 9 items at once, with completed items struck through — visual noise, hard to spot what's missing.
- Some rows have a "Go to Settings" / "Add Details" link, others have nothing — inconsistent.
- Generic helper text ("Add your company name in Invoice Profile settings") doesn't actually navigate.
- Bottom "Fix missing items" button does nothing meaningful when only sender fields are missing.
- User has to hunt through the list to know what to do next.

## New design

A compact, action-oriented card that surfaces only what's blocking the send, grouped by destination, each with a single clear CTA.

### Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚠ 2 items left before you can send this invoice             │
│   Step 1 of 2                              [████░░░░] 7/9   │
├─────────────────────────────────────────────────────────────┤
│ ① Complete your sender profile                              │
│    Missing: Company name, Business address                  │
│                              [ Open Invoice Profile → ]     │
├─────────────────────────────────────────────────────────────┤
│ ② Add billing contact for {Facility name}                   │
│    Missing: Contact name, Email                             │
│                              [ Add Billing Contact → ]      │
├─────────────────────────────────────────────────────────────┤
│ ③ Set a due date                                            │
│                              [ Pick due date → ] (scrolls)  │
└─────────────────────────────────────────────────────────────┘
       ▸ Show 7 completed items
```

### Behavior

- **Group missing items by destination**, not by individual field:
  - `sender_*` (first/last name, company, address) → one group, CTA: **Open Invoice Profile** → `navigate('/settings/invoice-profile')`
  - `billing_name`, `billing_email` → one group titled with the facility name, CTA: **Add Billing Contact** → opens existing `setBillingDialogOpen(true)` dialog
  - `bill_to` (no facility selected) → CTA: **Choose facility** scrolls to/opens the facility selector
  - `line_items` → CTA: **Add line item** scrolls to the line items section and focuses the "Add" button
  - `due_date` → CTA: **Pick due date** scrolls to the Invoice Details card and focuses the due-date input
- **Hide completed items by default**, with a small `▸ Show N completed items` disclosure for users who want reassurance.
- **Progress indicator** at the top: "X of 9 ready" + a thin progress bar so progress is visible while the list shrinks.
- **Numbered steps** (①②③) replace generic checkboxes — feels like a guided flow, not a passive checklist.
- **Smart ordering**: groups appear in the order the user should fix them (sender profile → facility/billing → invoice details).
- **Single primary CTA per group**, button-style (not link), right-aligned, with arrow icon.
- When all required items are complete, the panel collapses into the existing "Ready to send" success state (already handled by parent — `allComplete` returns `null`).

### Smooth scroll + focus targets

Add `id` anchors and refs in `InvoiceDetailPage.tsx`:
- `#invoice-due-date` on the Due input
- `#invoice-line-items` on the line items section, with a ref to focus the "Add line item" button
- `#invoice-facility` on the facility selector

The new CTAs use `scrollIntoView({ behavior: 'smooth', block: 'center' })` then focus the relevant control with a brief highlight ring (`ring-2 ring-primary` for ~1.5s) so the user sees exactly what to fill in.

## Files to change

- **`src/components/invoice/ReadyToSendChecklist.tsx`** — rewrite the rendering to grouped action cards with progress + collapsible "completed" section. Keep `buildChecklistItems` export unchanged so `InvoiceActionBar` stays compatible. Add a `groupChecklistItems()` helper that maps items → action groups.
- **`src/pages/InvoiceDetailPage.tsx`** — pass new handlers (`onPickDueDate`, `onAddLineItem`, `onPickFacility`) that scroll-and-focus the relevant section; add `id` anchors on the Due date input, line items section, and facility selector; add a brief highlight ring effect via local state.

No backend, schema, or business-logic changes. Pure UX restructuring of the existing data.
