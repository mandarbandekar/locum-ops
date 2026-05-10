## Goal

After a user downloads an invoice PDF from a **Draft** invoice OR Ready for Review section, prompt them with a confirmation dialog asking if they want to mark it as Sent. Clicking "Mark as sent" runs the same flow as the existing "I already sent this" button.

## Scope

Single file: `src/components/invoice/InvoiceActionBar.tsx`

## Behavior

1. **Trigger** — Only when invoice status is `draft` and the PDF download succeeds (`handleDownloadPdf`). Skip for Sent / Paid / Overdue invoices (no value in re-marking).
2. **Dialog** — New `AlertDialog` titled *"Mark this invoice as sent?"* with body *"You just downloaded this invoice. If you've shared it with the clinic, mark it as sent to start tracking payment."*
  - Cancel button: *"Not yet"*
  - Primary CTA: *"Mark as sent"*
3. **Action** — On confirm, run the existing `handleProceedAlreadySent()` (same checklist validation + status flip + activity log as the "I already sent this" button).
4. **Toast** — Keep existing "PDF downloaded" success toast; the dialog opens right after.

## Implementation details

- Add state: `const [confirmMarkSentAfterDownloadOpen, setConfirmMarkSentAfterDownloadOpen] = useState(false);`
- In `handleDownloadPdf`, after the successful download toast, add:
  ```ts
  if (isDraft) setConfirmMarkSentAfterDownloadOpen(true);
  ```
- Add a third `AlertDialog` block alongside the existing two, wired to `handleProceedAlreadySent`.
- No changes to overdue/paid flows, no changes to Share Link flow (out of scope per request).

## Out of scope

- Triggering the same prompt after copying the share link (not requested).
- Persisting "don't ask again" preference (not requested).