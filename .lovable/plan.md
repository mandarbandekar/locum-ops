## Goal
Right after a user marks an invoice as paid (via Record Payment → fully paid), give them a clear, prominent **Download Paid Invoice** action so they can immediately save the PDF with the new PAID stamp. Today the only paid-state download lives in the bottom action bar as a secondary outline button — easy to miss right after the success moment.

## Changes

### 1. `src/components/invoice/InvoiceEditPanel.tsx` — Paid banner becomes actionable
Currently (lines ~568–573) the "Paid in full" banner is a static green pill. Upgrade it to a row with a primary **Download Paid Invoice** button on the right:

```
[ ✓ Paid in full · Mar 14, 2026 ]                [ ⬇ Download Paid Invoice ]
```

- Reuse the existing `downloadInvoicePdf` helper logic. Easiest path: lift the helper from `InvoiceActionBar.tsx` into a small shared module `src/lib/invoicePdf.ts` (`downloadInvoicePdf(invoiceId, invoiceNumber)`), and import it in both places. No behavior change to the bar.
- Button: `variant="default"`, `size="sm"`, `Download` icon, loading spinner via local `pdfLoading` state, same `requireBusinessInfo` guard already used in the bar (duplicate the small helper or import it; simplest: inline a minimal check on `profile.company_name`/`company_address` with a toast pointing to Settings → Profile).
- On success: toast `"Paid invoice downloaded"` with filename.

### 2. `src/components/invoice/InvoiceEditPanel.tsx` — Post-payment success toast
In `handleRecordPayment` (line ~562) when `isPaidNow` is true, replace the plain `toast.success('Invoice paid in full!')` with a toast that includes an action button:

```ts
toast.success('Invoice paid in full!', {
  description: 'The PDF now shows a PAID stamp and $0.00 balance due.',
  action: {
    label: 'Download paid invoice',
    onClick: () => downloadInvoicePdf(invoice.id, invoice.invoice_number),
  },
  duration: 8000,
});
```

This gives the user a one-tap download at the exact moment of marking paid, without forcing them to scroll to the bottom action bar.

### 3. `src/components/invoice/InvoiceActionBar.tsx` — Promote in paid state
In the paid-state block (lines ~388–410), change **Download Invoice PDF** from `variant="outline"` to `variant="default"` so it becomes the primary CTA on the bottom bar for paid invoices (parity with how Record Payment is primary for sent invoices). The share link button stays outline. No layout/markup changes beyond the variant.

## Out of scope
- No changes to the PDF edge function (already renders the PAID stamp and Balance Due from the prior change).
- No changes to `InvoicePreview`, `PublicInvoicePage`, or DB schema.
- No new download endpoint — reuse the existing `generate-invoice-pdf` function.

## Verification
- Open a sent invoice, click Record Payment, fully pay it.
  - The success toast appears with a **Download paid invoice** action that downloads the PDF with the PAID stamp.
  - The "Paid in full" banner at the top of the edit panel now has a **Download Paid Invoice** button on the right; clicking it downloads the same PDF.
  - The bottom action bar shows **Download Invoice PDF** as the primary (filled) button.
- Open an already-paid invoice cold: banner + action bar both surface the download prominently; toast does not fire (no payment recorded this session).
- Open a draft or sent (unpaid) invoice: no behavior change — no paid banner, no toast action, bottom-bar layout unchanged.