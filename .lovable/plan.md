## Goal
Three related improvements to the Draft → Sent flow in `src/components/invoice/InvoiceActionBar.tsx` (plus a small icon/label addition in `src/components/invoice/InvoiceTimeline.tsx`).

## 1. Guard "Mark as sent" against stale state

Wrap the actual flip inside `handleProceedAlreadySent()` with a re-check of `invoice.status`:

- If `invoice.status !== 'draft'` at the moment the user confirms (e.g. another tab moved it to Sent, or it was reverted), abort and show:
  - `toast.error('Invoice status changed', { description: 'This invoice is no longer a draft. Refresh to see the latest status.' })`
- This single guard protects all three confirm dialogs (existing "I already sent this", new post-download prompt, new post-share-link prompt) since they all funnel through `handleProceedAlreadySent`.

## 2. Prompt after copying / creating a share link on a Draft invoice

Reuse the same `AlertDialog` pattern. Add one prompt with two trigger points:

- After `handleCreateShareLink` succeeds and `isDraft === true` → open prompt.
- After `handleCopyShareLink` runs and `isDraft === true` → open prompt.

Dialog copy:
- Title: *"Mark this invoice as sent?"*
- Body: *"You just shared this invoice link. If you've sent it to the clinic, mark it as sent to start tracking payment."*
- Cancel: *"Not yet"* · CTA: *"Mark as sent"*
- Confirm runs `handleProceedAlreadySent` with source `'share_link'`.

State: `confirmMarkSentAfterShareOpen`.

## 3. Record the source of a manual "Mark as sent"

No DB schema change. Encode the source through the existing `invoice_activities` row written by `handleProceedAlreadySent`:

- Refactor `handleProceedAlreadySent(source: 'manual' | 'pdf_download' | 'share_link' = 'manual')`.
- Action stays `'marked_sent_manually'` (back-compat for existing rows / timeline icon).
- Description varies by source:
  - manual → `'Invoice marked as sent manually (sent outside Locum Ops)'` (unchanged)
  - pdf_download → `'Marked as sent after downloading the PDF'`
  - share_link → `'Marked as sent after sharing the public link'`
- The post-download dialog passes `'pdf_download'`; the post-share dialog passes `'share_link'`; the original "I already sent this" dialog passes `'manual'` (default).

The Activity timeline (`InvoiceTimeline.tsx`) already renders `description` verbatim, so the source surfaces automatically. Add an `marked_sent_manually` entry to the `ICONS` map (currently missing — falls back to FileText) so all three variants render the `Send` icon consistently.

## Out of scope
- DB column for `sent_source` on `invoices` (the activity log is the canonical source-of-truth for status changes; adding a column would duplicate data).
- Realtime subscription to detect status changes while the dialog is open — the on-confirm re-check covers the requested behavior.
- Changing the existing `InvoiceStatusTimeline` stepper (it's a status visualization, not an audit trail; the audit trail is `InvoiceTimeline`).
