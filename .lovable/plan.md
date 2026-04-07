

# Per-Shift Tax Withholding Nudge

## Summary

Add an ambient "set aside for taxes" nudge on three surfaces: the shift list view rows, a brief inline confirmation when an invoice is marked paid, and a running total footer in the list view. All calculations reuse the existing `calculateTax` engine from `TaxDashboard.tsx`.

## Key Design Decision: What Counts as "Paid"

Shifts don't have a `status` field. A shift is "paid" when its linked invoice (via `invoice_line_items.shift_id`) has `status === 'paid'`. The nudge will derive this by cross-referencing shifts with invoices/line items from `useData()`.

## New Files

### `src/lib/taxNudge.ts` — Utility function

```
getShiftTaxNudge(shiftIncome, effectiveRate) → { setAsideAmount, netAfterSetAside, effectiveRate }
```

- `effectiveRate = totalAnnualTax / projectedAnnualIncome` (from the same `calculateTax` function in TaxDashboard)
- Clamp rate to 10%–45%
- Round all outputs to nearest dollar
- Export a `computeEffectiveSetAsideRate(profile, grossIncome)` that runs the tax engine and returns the clamped rate — this avoids duplicating the calculation logic

### `src/components/schedule/ShiftTaxNudge.tsx` — Nudge row component

- Accepts `shiftIncome`, `taxProfile` (or null), and `isPaid` boolean
- If no profile: renders lock icon + "Complete your tax profile to see your set-aside amount →" with link to `/tax-center`
- If `shiftIncome === 0`: renders nothing
- If `isPaid`: renders piggy bank icon + "Set aside $X for taxes · Keep $Y" with amber styling for set-aside amount
- If not paid: renders nothing (per spec — only show on paid/completed shifts)

## Modified Files

### `src/pages/SchedulePage.tsx`

**List view table (lines 378–446):**
- Import `useTaxIntelligence` hook and `ShiftTaxNudge` component
- Determine which shifts are "paid" by joining `lineItems` and `invoices` — build a `Set<string>` of shift IDs whose invoice is paid
- For each shift row in the list view `<tbody>`, add a secondary row beneath it (using `colspan`) that renders `<ShiftTaxNudge>` when the shift is paid
- Add a **summary footer row** at the bottom showing: "Year-to-date paid: $X · Recommended set-aside: $Y (Z% of income)" in 13px muted text — only when there are paid shifts

**Month/Week calendar views:** No changes — the calendar cells are too compact for inline nudges. The list view is the primary surface.

### `src/components/invoice/InvoiceSentPanel.tsx` (Surface 2 — Mark-paid moment)

- After `toast.success('Invoice paid in full!')` on line 106, show an inline confirmation state within the card
- Add a transient state `showPayNudge` that's set to `true` when `isPaidNow` is true
- Render a 4-second auto-dismissing inline banner: "Shift marked paid ✓ · Set aside $X for taxes from this payment"
- Uses `useEffect` with `setTimeout` to collapse after 4 seconds
- Requires tax profile — if none, skip the nudge (don't show the setup CTA in this transient moment)

### `src/hooks/useTaxIntelligence.ts`

- No structural changes needed — already exports `profile`, `hasProfile`, and `loading`
- The existing hook is sufficient for all three surfaces

## Calculation Flow

```
SchedulePage / InvoiceSentPanel
  → useTaxIntelligence() → profile
  → computeEffectiveSetAsideRate(profile, projectedAnnualIncome)
    → calculateTax(projectedAnnualIncome, profile) [reuse from TaxDashboard]
    → effectiveRate = totalAnnualTax / projectedAnnualIncome
    → clamp(10%, 45%)
  → getShiftTaxNudge(shiftIncome, effectiveRate)
    → setAsideAmount = Math.round(shiftIncome * rate)
    → netAfterSetAside = shiftIncome - setAsideAmount
```

The `calculateTax` function will be extracted from `TaxDashboard.tsx` into `taxConstants2026.ts` or a shared location so both `TaxDashboard` and `taxNudge.ts` can import it without circular dependencies.

## Edge Cases

- **S-Corp users**: `calculateTax` already handles the S-Corp path (lower effective rate, no SE tax on distributions). The nudge copy uses "taxes" not "SE tax"
- **$0 shift income**: Nudge row hidden entirely
- **No tax profile**: Lock icon + setup CTA on list view; no nudge on mark-paid moment
- **Very high shifts**: Shows rate percentage as micro-line: "Based on your X% estimated rate"

## Demo Mode

`useTaxIntelligence` already returns a demo profile when `isDemo` is true. The nudge will work automatically in demo mode using the demo effective rate.

## Files Summary

| File | Action |
|---|---|
| `src/lib/taxNudge.ts` | New — utility functions |
| `src/components/schedule/ShiftTaxNudge.tsx` | New — nudge row component |
| `src/pages/SchedulePage.tsx` | Add nudge rows to list view + summary footer |
| `src/components/invoice/InvoiceSentPanel.tsx` | Add transient nudge on mark-paid |
| `src/components/tax-intelligence/TaxDashboard.tsx` | Extract `calculateTax` to shared location |

