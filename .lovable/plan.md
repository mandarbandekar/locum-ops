## Goal

Turn the right-hand invoice Preview into a click-to-edit surface. On a draft invoice, every visible field — your sender block, the bill-to block, invoice number/dates, line items, notes — can be edited in place. Edits are saved as **overrides on this invoice only**; your profile and the clinic record are not touched.

## Behavior

- Hovering a field on the preview shows a subtle "click to edit" affordance (light underline + pencil on hover).
- Click → field becomes an inline input/textarea, autofocused. Enter (or blur) saves; Esc cancels.
- All overrides persist on the invoice row, so the PDF, the public link, and the email all use the edited values.
- A small "Reset to clinic / profile" link appears next to any overridden field so you can revert.
- Editing is **disabled** once the invoice is Sent/Partial/Paid (matches today's "revert to draft to edit" model). Read-only preview in those states.
- Line items remain editable through the existing line-item controls (already supported) — clicking a line on the preview scrolls/highlights its card in the edit panel rather than duplicating the editor inline, to avoid two competing editors.

## Fields that become editable on the preview

Sender block: company, your name, address, email, phone.
Bill To block: facility name, contact name, email, address.
Invoice meta: invoice number, invoice date, due date.
Notes block: full notes textarea.
Line items: click any row to jump-focus its existing editor in the left panel.

## Technical details

**Schema (single migration on `public.invoices`)** — add nullable override columns; null = fall back to profile/facility:

```
sender_company_override        text
sender_name_override           text
sender_address_override        text
sender_email_override          text
sender_phone_override          text
billto_facility_name_override  text
billto_contact_name_override   text
billto_email_override          text   -- distinct from billing_email_to (which is the send-to)
billto_address_override        text
```

No new tables, no RLS changes needed (existing "Users can CRUD own invoices" policy covers it). Update `src/integrations/supabase/types.ts` will regenerate automatically.

**Frontend**

- New small component `EditableField` in `src/components/invoice/EditableField.tsx` — handles hover state, click-to-edit, Enter/Esc, single-line vs multi-line, optional "Reset" affordance. Uses existing `Input`/`Textarea` design tokens.
- Refactor `InvoicePreview.tsx` to:
  - Accept an `editable: boolean` prop and an `onFieldChange(field, value)` callback.
  - Wrap each currently-rendered field in `EditableField` when `editable` is true; otherwise render plain text exactly as today.
  - Resolve display value as `override ?? sourceValue` and expose `isOverridden` to the field for the reset affordance.
- `InvoiceLivePreview.tsx` — pass through `editable={isDraft}` and an `onFieldChange` that calls `updateInvoice(...)` with the appropriate `*_override` column. Optimistic update via existing `liveFields` pattern so the preview reflects edits instantly.
- `InvoiceDetailPage.tsx` — extend the `liveFields` state to carry the override values; pass `isDraft` down. No layout change.
- `PublicInvoicePage.tsx`, `OnboardingInvoiceReveal.tsx`, and the PDF generator already render through `InvoicePreview`. They keep `editable={false}` (default) and continue to consume the resolved values, which the data layer will already serve as `override ?? source`.
- `supabase/functions/generate-invoice-pdf/index.ts` and `supabase/functions/public-invoice/index.ts` — read the new override columns and apply the same `override ?? source` fallback before rendering, so PDFs and the public link match the in-app preview.

**Out of scope**

- No changes to line item editing logic (works today via the left panel).
- No changes to profile or facility records — overrides are per-invoice only, per your choice.
- No edit-after-sent flow — drafts only, per your choice.