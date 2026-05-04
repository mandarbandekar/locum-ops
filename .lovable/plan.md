## Problem

On the invoice detail page, while an invoice is in **Draft**, the bottom action bar only shows:
- Download Invoice PDF
- I already sent this
- Send to clinic (currently a "coming soon" dialog)

The **Copy share link** action is gated behind the Sent/Paid statuses and lives inside a "More" dropdown — so a user who wants to grab a public link, paste it into their personal email or text, and then mark the invoice sent has no path to do that without first marking it sent (chicken-and-egg).

Per the user stories, sharing the invoice should be a first-class option *alongside* downloading and sending — available from the draft state, so the user can choose any channel (Locum Ops email when ready, their own email, text, etc.) and then confirm it as sent.

## Goal

Surface three equally-weighted "delivery" options on a draft invoice, plus a clear way to confirm the invoice was sent outside Locum Ops:

1. **Download PDF** (existing)
2. **Copy share link** (new on draft — generates token on first use, copies URL, logs activity)
3. **Send to clinic** (existing — still the primary CTA; opens compose / coming-soon)

Then a secondary **"I already sent this"** confirmation that promotes the invoice from Draft → Sent.

The share link should also remain easily accessible after the invoice is sent (already true today, just refined).

## UX Plan

### Draft state — bottom action bar

Reorder and group the buttons so the three delivery channels read as siblings, with the manual-confirm action visually separated:

````text
[Total: $1,700]                    [Download PDF] [Copy share link] [I already sent this]   |   [Send to clinic →]
````

- **Download PDF** — outline button, unchanged behavior.
- **Copy share link** — new outline button.
  - If `share_token` doesn't exist yet: create one (reuse existing `handleCreateShareLink`), copy URL to clipboard, toast "Share link created and copied".
  - If it exists: copy URL, toast "Share link copied".
  - Clicking does NOT change invoice status — user still chooses how to confirm sending.
- **I already sent this** — outline, unchanged behavior. Confirmation dialog updated to mention it covers email, text, or share-link delivery (not just "your own email").
- **Send to clinic** — primary CTA, unchanged (still opens the coming-soon dialog for now).

On narrow viewports, hide labels and keep icons (Download / Link / Check / Send) to avoid overflow; "Send to clinic" keeps its label as the primary action.

### Draft state — supporting affordance

After the user clicks **Copy share link** for the first time, show a subtle inline hint above the action bar (or as a follow-up toast action) along the lines of:

> Link copied. Paste it into your email or text, then click **"I already sent this"** to mark the invoice as Sent.

This closes the loop between "share via my own channel" and "mark sent" without forcing the user to discover it themselves.

### Sent / Partial / Overdue / Paid states

- Promote **Copy share link** out of the "More" dropdown to a visible outline button next to the existing primary action (matches the Paid layout that already does this). The "More" menu keeps Download PDF, Resend email, and Revert to Draft.
- No behavior changes to the share-token logic itself.

### "I already sent this" copy update

Current dialog body says: *"Use this only if you've already sent this invoice from your own email."*

Update to: *"Use this if you've already delivered this invoice — by your own email, text message, or by sharing the public link. The invoice will move to Sent without sending any email from Locum Ops."*

## Out of Scope

- No changes to the share-token backend, the public invoice page, or `generate-invoice-pdf`.
- No changes to invoice status logic, auto-generation, or activity log schema (we reuse existing `share_link_created` and `marked_sent_manually` actions).
- "Send to clinic" stays as the existing coming-soon stub — wiring it to a real send flow is a separate effort.

## Files to Edit

- `src/components/invoice/InvoiceActionBar.tsx` — the only file that needs changes:
  - Add **Copy share link** button to the draft branch.
  - Reorder draft buttons so `[Download] [Copy share link] [I already sent this] | [Send to clinic]`.
  - Promote share-link button to visible row in Sent/Partial/Overdue branches (parallel to the existing Paid branch).
  - Update the "I already sent this" `AlertDialogDescription` copy.
  - Optional: after first share-link creation in draft, show a one-time toast with the "now click I already sent this" hint.
