

## Render the real `InvoicePreview` in the onboarding reveal

### What changes

Replace the custom compact `InvoicePreviewCard` in `OnboardingInvoiceReveal.tsx` with the **actual `<InvoicePreview />` component** used on the invoice detail page and the public invoice page — so onboarding shows pixel-identical invoices to what users see post-login (matching the screenshot you uploaded).

### Behavior

- For each invoice generated from the user's onboarding shifts (same scoping logic as today: invoices that contain at least one `sessionShiftId`), render the real `<InvoicePreview />`.
- Cap at 3, sorted by most recent `invoice_date`.
- Wrap each preview in a thin status header strip above it: `Invoice WPV-10 · Greenfield Vet` on the left, status badge (`Draft` / `Upcoming` / `Sent` / `Paid`) on the right. This keeps the onboarding context (which invoice is which, what status) without altering the invoice document itself.
- Drop the custom body (line-item mini-list, totals row, due-date footer) — those are already rendered inside `<InvoicePreview />`.
- Keep the existing top banner ("Your invoices are already being prepared for you" + sub) and the bottom reminder card unchanged.

### Data wiring (real data only — no fabrication)

`<InvoicePreview />` requires `sender`, `billTo`, `invoiceNumber`, `invoiceDate`, `dueDate`, `lineItems`, `total`, `balanceDue`, `notes`. Source for each:

| Field | Source |
|---|---|
| `sender.firstName / lastName / company / address / email / phone` | `useUserProfile().profile` (`first_name`, `last_name`, `company_name`, `company_address`, `invoice_email`, `invoice_phone`) — same fields the real detail page uses |
| `billTo.facilityName / address` | `facilities.find(f => f.id === invoice.facility_id)` |
| `billTo.contactName / email` | `facility.invoice_name_to` / `facility.invoice_email_to` |
| `invoiceNumber / invoiceDate / dueDate / notes / total / balanceDue` | Directly from the real `invoice` row |
| `lineItems` | `lineItems.filter(li => li.invoice_id === invoice.id)` |

If a sender field is empty (new user hasn't filled out invoicing settings yet), `<InvoicePreview />` already handles it gracefully (e.g. shows "Your Company"). No placeholders or fake values added.

### Files

**Modified:**
- `src/components/onboarding/OnboardingInvoiceReveal.tsx`
  - Import `InvoicePreview` from `@/components/invoice/InvoicePreview` and `useUserProfile`.
  - Remove the local `InvoicePreviewCard` sub-component.
  - For each derived invoice, render: status header strip → `<InvoicePreview .../>` inside a single bordered card.
  - Keep banner + summary line + reminder card as-is.

**Untouched:** `InvoicePreview.tsx`, `OnboardingPage.tsx`, all data context logic.

### Notes

- The previews will visually match the invoice document the user sees after login (same header, bill-to grid, line-item table, totals block, notes section).
- Onboarding may render up to 3 full-size invoice previews stacked vertically — the page already scrolls within the onboarding layout, so this is fine.
- Status determination logic is unchanged.

