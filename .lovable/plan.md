# Stripe-style Live Preview for Invoice Detail

## Goal
Make the right-hand "Live Preview" on `/invoices/:id` feel like Stripe's invoice editor — a polished, framed, multi-surface preview that shows the user exactly what the clinic will receive across each delivery channel.

## Inspiration recap (from screenshot)
- Tinted/muted background panel with the invoice rendered as a floating "paper" card with a soft shadow.
- Tabbed switcher above the preview: **Invoice PDF**, **Email**, **Payment page**.
- Clean header label ("Preview") with a small settings affordance.
- Sticky, scroll-independent preview while the left form scrolls.

## Scope (frontend only)
Only the preview column on `InvoiceDetailPage` (desktop) and the Preview tab (mobile). No backend, no PDF/email pipeline changes — we're rendering existing data in nicer wrappers.

## Changes

### 1. New `InvoiceLivePreview.tsx` (in `src/components/invoice/`)
A self-contained component that wraps the existing `InvoicePreview` plus two new surfaces.

Layout:
```text
┌─ Preview ──────────────────────────── ⚙ ─┐
│  [Invoice PDF] [Email] [Public link]     │
│ ─────────────────────────────────────── │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │   <surface for active tab>       │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

- Outer container: `bg-muted/40` (themed), rounded, padded. No box-shadow on the outer (per design rules), but the inner "paper" gets a soft shadow + border to read as a document floating on the surface.
- Header row: "Preview" label on the left, small **status pill** (Draft/Sent/Paid) on the right for context.
- Tabs (shadcn `Tabs`): three triggers.

Tabs:

**a. Invoice PDF (default)**
- Renders the existing `<InvoicePreview ... />` unchanged inside the paper frame.
- This preserves the live-edit reactivity already wired through `liveFields`.

**b. Email**
- Renders a faux email client preview: From line (user's `invoice_email` / company), To line (billing contact), Subject (mirrors the same subject builder used by `InvoiceComposeDialog`), and the email body using a simplified version of the `invoice-send` template — plain HTML rendered inside the paper frame. Includes the "View invoice" CTA button styled as it appears in the real email.
- Read-only; small caption underneath: "This is what your clinic will see in their inbox."
- If draft and no billing email is set, show a subtle inline notice: "Add a billing email to preview the email."

**c. Public link (Payment page equivalent)**
- Renders a scaled-down/embedded preview of the public invoice page (same visual as `PublicInvoicePage`): the muted background, the invoice card, and a disabled "Download PDF" button.
- We reuse `<InvoicePreview ... />` inside a styled wrapper that mimics `PublicInvoicePage` chrome.
- Footer caption: "This is what anyone with the share link will see." If no `share_token` exists yet, show a small "Generate a link from the action bar to share publicly" hint — no action button (existing flow handles creation).

### 2. `InvoiceDetailPage.tsx`
- Replace the current "Live Preview" right column block (lines ~362–369) and the mobile preview `TabsContent value="preview"` with `<InvoiceLivePreview ... />`, passing through the same props (`previewComponent` data, `invoice`, `facility`, `profile`, `billingEmailTo`, `billingNameTo`, `items`, `computedStatus`, `isDraft`).
- Keep the existing sticky behavior (`lg:sticky lg:top-4 self-start`).
- Remove the now-redundant "Live Preview / Changes update in real-time" mini-header (the new component owns its header).

### 3. Styling tokens
- Use semantic tokens only: `bg-muted`, `border-border`, `text-muted-foreground`, `text-foreground`. No raw color classes.
- Paper card: `bg-card border border-border rounded-lg shadow-sm` (single light shadow is acceptable on the inner paper to convey "document"; outer panel stays flat per project rule).
- Tabs use shadcn defaults — match existing visual weight elsewhere in the app.

## Out of scope
- Real PDF rendering inside the preview (we keep using `InvoicePreview` as the visual proxy).
- Sending/generating logic.
- Any mobile-specific redesign beyond swapping in the new component.
- The settings cog from Stripe's screenshot — skipping for v1; can revisit if useful.

## Files
- New: `src/components/invoice/InvoiceLivePreview.tsx`
- Edited: `src/pages/InvoiceDetailPage.tsx`
