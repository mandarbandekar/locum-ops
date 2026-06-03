## Goal
When an invoice is fully paid, make it visually unmistakable: stamp the invoice with a red angled "PAID" mark and show a clear payment summary (Subtotal → Amount Paid → Balance Due of $0).

## Changes

### 1. `src/components/invoice/InvoicePreview.tsx`
- Add two optional props: `isPaid?: boolean` and `paidAt?: string | null`.
- When `isPaid` is true:
  - Add a `relative` wrapper around the invoice card body and render an absolutely-positioned **PAID stamp** overlay:
    - Rotated ~-12°, bold red, double-ring border, semi-transparent (`opacity-80`), centered over the line-items area.
    - Includes "PAID" in large tracking-wider text and the paid date below in smaller text (e.g. "Jun 3, 2026").
    - `pointer-events-none` so it doesn't block clicks; `print:opacity-100` so it appears in PDFs.
    - Uses a semantic `--success` / red token (added to `index.css` if not already present) — no raw hex.
- Update the **Totals block** so it always renders three rows when paid (and keeps current behavior otherwise):
  - Subtotal
  - Amount Paid (green, negative or positive convention: show paid amount)
  - Balance Due (bold; $0.00 when fully paid, highlighted in success color)
- Non-paid invoices: unchanged — still show Subtotal + Amount Due.
- Partial payments: show Subtotal, Amount Paid, Balance Due (no stamp).

### 2. `src/components/invoice/InvoiceLivePreview.tsx`
- Pass `isPaid={computedStatus === 'paid'}` and `paidAt={invoice?.paid_at}` through to `InvoicePreview`.

### 3. `src/pages/PublicInvoicePage.tsx`
- Pass `isPaid={invoice.status === 'paid'}` and `paidAt={invoice.paid_at}` so the public/shared link and PDF download both show the stamp.

### 4. `src/components/invoice/InvoicePreview.tsx` — print styles
- Ensure the stamp uses `print-color-adjust: exact` (Tailwind `print:[color-adjust:exact]`) so the red prints in the PDF.

## Out of scope
- No DB or status logic changes — relies on existing `paid_at` / computed `paid` status.
- No changes to "Mark Paid" flow itself.
- PDF edge function (`generate-invoice-pdf`) renders from the same React preview, so the stamp will appear in downloads automatically.

## Visual reference
Matches the user-provided mockup: angled red "PAID" stamp across the middle of the invoice, with the totals area below clearly showing Balance Due = $0.
