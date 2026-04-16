

## Goal

User opens an auto-generated draft → quickly verifies preview matches reality → fixes dates or line items inline → sends. Right now the editor is noisy and the line item table is unreadable (8 wrapped lines per row in the screenshot).

## Diagnosis from the screenshot

1. **From / Bill To cards** duplicate the preview — wasted space.
2. **Line items table is unusable** in the 2-column layout. "Apr 16, 2026 — Relief coverage (8:00 AM – 6:00 PM)" wraps to 7 lines, columns crush together. Rate "$1600" is missing the comma.
3. **No visual link** between the auto-generated banner ("2 shifts") and the line items it produced.
4. **Dates section is a separate card** with no context — users don't know *why* those dates were chosen (last shift + facility net terms).
5. The preview on the right is the source of truth, but the left is fighting it instead of supporting it.

## Proposed UX

**Principle:** Left panel = "verify & adjust the inputs". Right panel = "see the output". Strip everything that isn't an input.

### Layout (desktop, draft state only)

```text
┌──────────────────────────────────────────────────────────┐
│ [Auto-generated banner] · 2 shifts · MedVet Campbell     │
├─────────────────────────────┬────────────────────────────┤
│ EDITOR (2/5)                │ LIVE PREVIEW (3/5, sticky) │
│                             │                            │
│ ┌─ Dates ──────────────┐    │  [Full invoice preview]    │
│ │ Invoice #  MC-2026-2 │    │                            │
│ │ Issued     Apr 16 ▾  │    │                            │
│ │ Due        May 1 ▾   │    │                            │
│ │  ↳ "Net 15 from last │    │                            │
│ │      shift"          │    │                            │
│ └──────────────────────┘    │                            │
│                             │                            │
│ ┌─ Shifts on this invoice ─ │                            │
│ │ ✓ Apr 16 · 8a–6p  $1,600  │                            │
│ │ ✓ Apr 15 · 8a–6p  $1,600  │                            │
│ │ + Add custom line item    │                            │
│ │                           │                            │
│ │ Subtotal         $3,200   │                            │
│ └──────────────────────┘    │                            │
│                             │                            │
│ Notes (collapsed by default)│                            │
│ Bill-to contact (link only) │                            │
└─────────────────────────────┴────────────────────────────┘
```

### Specific changes

**1. Remove the From / Bill To cards from the editor.** They're already in the preview. Replace with a single one-line link: "Billing to: Manny at MedVet Campbell · *Edit*" — opens the existing billing dialog.

**2. Rewrite line items as a vertical card list (not a table) in the 2-col layout.** Each row:
```
[shift icon] Apr 16, 2026 · 8:00 AM – 6:00 PM       $1,600
             Relief coverage · 1 × $1,600           [✏] [🗑]
```
Single line per shift, hover reveals edit/delete. Clicking opens an inline editor. Custom (non-shift) lines look the same with a different icon. This fixes the unreadable wrapped table.

**3. Reframe the Dates card with context.** Add a one-line helper under the dates explaining the auto-derivation:
- Issue date: "Set to last shift date (Apr 16)"
- Due date: "Net 15 from issue date · *Change in facility settings*"

This tells the user *why* the dates are what they are, so they trust them or know how to change them.

**4. Add a subtotal row at the bottom of the line items card.** Mirrors the preview, gives a single number to verify against the right side without scanning.

**5. Move Notes into a collapsed section.** Most auto-invoices don't need notes; collapse by default with "+ Add notes" trigger.

**6. Fix number formatting in line items** (`$1,600` not `$1600`) — affects both editor row and add-line input.

**7. Tighten the auto-generated banner**: make it the page header (replace the current location) with the shift count clickable to scroll/highlight the shifts list. Reinforces "these 2 shifts → these 2 line items".

**8. Read-only "Verify" hints** (subtle, only for auto-drafts on first view): a soft check-mark next to each shift line item indicating it pulled from a real shift, vs. a "manual" tag for custom lines. Helps the user mentally tick off "yes this matches reality."

### Files to change

1. `src/components/invoice/InvoiceEditPanel.tsx` — remove From/Bill To cards, rewrite line items as card-list (drop the table for the 2-col view), add subtotal row, add date-context helper text, collapse notes, single-line bill-to link, fix `toLocaleString` on rates.
2. `src/pages/InvoiceDetailPage.tsx` — move the auto-generated banner to be the primary page header subtitle (replacing the redundant facility name in the top row), make shift count clickable.
3. No changes to `InvoicePreview.tsx`, `InvoiceActionBar.tsx`, or the data layer.

### Out of scope

- Mobile layout keeps the existing tab toggle (Edit | Preview) — the new card-list works there too without changes.
- Sent/Paid read-only states keep their current compact layout.
- No changes to auto-generation logic, suppression, or the compose flow.

