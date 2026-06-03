## Goal
When a user downloads a paid invoice as a PDF, the downloaded PDF should match the on-screen "paid" treatment: a rotated red **PAID** stamp across the page, and a totals block that shows Subtotal → Amount Paid → Balance Due ($0.00).

The on-screen "Download Invoice PDF" button already exists on paid invoices (`InvoiceActionBar.tsx`), so no UI changes are needed. The fix lives entirely in the PDF edge function, which today still prints "Amount Due" and no stamp.

## Changes

### `supabase/functions/generate-invoice-pdf/index.ts`

1. **Compute paid state** near where invoice/lineItems are loaded:
   - `const isPaid = invoice.status === 'paid';`
   - `const amountPaid = Math.max(0, Number(invoice.total_amount) - Number(invoice.balance_due));`

2. **Totals block** (currently lines ~340–352): when `isPaid` or `amountPaid > 0`, render three rows instead of two:
   - Subtotal
   - Amount Paid (in success green, prefixed `-`)
   - Balance Due (bold; green when fully paid, primary blue otherwise)

   Always use the label "Balance Due" (replaces the existing "Amount Due" label so it matches the React preview).

3. **PAID stamp overlay** when `isPaid`:
   - Draw after all content is rendered on the first page (so it sits on top).
   - Use `page.drawRectangle` for a double red border box centered roughly over the line-items area (~middle of page, ~220pt wide × 90pt tall).
   - Use `page.drawText('PAID', { rotate: degrees(-12), ... })` with a large bold font in red (`rgb(0.8, 0.15, 0.15)`), `opacity: 0.75`.
   - Below the word PAID, render the `paid_at` date (formatted "MMM d, yyyy") in smaller red text, also rotated -12°.
   - Use pdf-lib's existing `rgb`, `degrees`, and `helveticaBold` already imported in the file.

4. No DB, no RLS, no other file changes.

## Out of scope
- No changes to `InvoiceActionBar` (Download PDF button already present for paid invoices).
- No changes to `InvoicePreview.tsx` (on-screen stamp already added previously).
- No changes to the public/share-link page or PDF endpoint signature.

## Verification
- Open a paid invoice in the preview and click Download Invoice PDF; confirm the PDF shows the angled red PAID stamp and a totals block with Subtotal, Amount Paid, Balance Due $0.00.
- Open a partial-paid invoice and confirm the breakdown shows but the stamp does not.
- Open a draft/sent invoice and confirm behavior is unchanged.
