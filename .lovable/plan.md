# Visual status timeline on the invoice detail page

Replace the plain stepper above the alerts with a richer **horizontal status timeline** that shows each lifecycle milestone (Draft → Sent → Paid) with its actual date, and surfaces Overdue as a destructive variant of the Paid milestone when applicable. Partially-paid invoices get a third "Partial" indicator on the Paid node.

The existing activity list (`InvoiceTimeline`) stays as-is for the full audit trail.

## New component

**`src/components/invoice/InvoiceStatusTimeline.tsx`** — replaces visual usage of `InvoiceStepper`. Same horizontal layout, but each node is a richer card:

| Step | Icon | Date shown | State logic |
|------|------|------------|-------------|
| Draft | `FileText` | `invoice.created_at` (or `invoice_date`) | Always complete (every invoice was a draft once) |
| Sent | `Send` | `invoice.sent_at` if present, else "Not sent yet" | Complete when status ≠ draft |
| Paid / Overdue | `CheckCircle` (paid) or `AlertTriangle` (overdue) | `paid_at` if paid, else due date | Complete only when fully paid; destructive style when overdue; amber "Partial" sub-label when status = partial with `payments` count |

Visual:
```text
 ●──────────●──────────●
 Draft      Sent       Paid
 Apr 12     Apr 14     —
```

When overdue:
```text
 ●──────────●──────────⚠
 Draft      Sent       Overdue
 Apr 12     Apr 14     12d past due
```

Style notes:
- Connector line between completed nodes uses `bg-primary`; incomplete uses `bg-border`; the segment leading into Overdue uses `bg-destructive/40`.
- Node circle: `bg-primary text-primary-foreground` for complete, `bg-primary/15 text-primary border-2 border-primary` for current, `bg-muted text-muted-foreground` for pending, `bg-destructive/15 border-2 border-destructive text-destructive` for overdue.
- Below each label: a small `text-xs text-muted-foreground` date line. Use `formatDateSafe` (already in the project) to avoid timezone drift.
- For partial: under the Paid node show a tiny amber pill `Partial · $X of $Y` using existing `payments` totals (passed in via props).

## Wire-up

**`src/pages/InvoiceDetailPage.tsx`**
- Swap the `<InvoiceStepper status={computedStatus} />` block (line 228–230) for `<InvoiceStatusTimeline invoice={invoice} payments={invoicePayments} computedStatus={computedStatus} />`.
- Keep the existing `InvoiceTimeline` activity card (collapsible) untouched.

## Cleanup

- Leave `InvoiceStepper.tsx` in place (still imported elsewhere — check before deleting). If `rg "InvoiceStepper"` shows no other consumers, remove it; otherwise leave it.

## Out of scope

- No data model changes.
- No changes to mobile/desktop layouts beyond the swap (the timeline is responsive; on `<sm` it stacks vertically using `flex-col sm:flex-row`).
- Activity log untouched.
