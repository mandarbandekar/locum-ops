

# 1099 vs S-Corp Side-by-Side Comparison View

## Summary

Add a new comparison component accessible from the Tax Dashboard that runs both `calculate1099Tax()` and `calculateSCorpTax()` with the user's current profile inputs, displaying results side-by-side so users can instantly see the tax savings difference between entity types.

## Design

A new collapsible section (or toggle button) on the TaxDashboard, below the hero card. When expanded, it shows a two-column card comparing key numbers:

```text
┌─────────────────────────┬─────────────────────────┐
│     1099 / Sole Prop    │      S-Corporation      │
├─────────────────────────┼─────────────────────────┤
│ Gross income   $200,000 │ Gross revenue  $200,000 │
│ Expenses       -$15,000 │ Expenses       -$15,000 │
│ Net income     $185,000 │ W-2 salary     -$80,000 │
│                         │ Employer FICA   -$6,120 │
│                         │ K-1 distrib.   $83,880  │
├─────────────────────────┼─────────────────────────┤
│ SE tax          $22,646 │ SE tax            $0    │
│ Federal tax     $28,xxx │ Federal tax     $28,xxx │
│ State tax        $x,xxx │ State tax        $x,xxx │
├─────────────────────────┼─────────────────────────┤
│ Annual due      $48,xxx │ Annual due      $11,xxx │
│ Quarterly       $12,xxx │ Quarterly        $2,xxx │
└─────────────────────────┴─────────────────────────┘
│          You could save ~$X,XXX/year as S-Corp    │
└───────────────────────────────────────────────────┘
```

For S-Corp users who haven't set a salary, we'll default to 40% of net income as reasonable compensation (industry standard for relief vets). Users can adjust with a slider.

## File Changes

### New file: `src/components/tax-intelligence/EntityComparisonCard.tsx`
- Accepts `TaxIntelligenceProfile` as prop
- Internally builds two `TaxProfileV1` objects (one with `entityType: '1099'`, one with `entityType: 'scorp'`)
- For S-Corp side: if no `scorp_salary` set, defaults to 40% of (gross − expenses); includes a salary slider (40–60% range)
- Calls `calculate1099Tax()` and `calculateSCorpTax()` via `useMemo`
- Renders two-column comparison card with key line items
- Shows savings banner: "Potential annual savings as S-Corp: $X,XXX" (or vice versa)
- Includes disclaimer: "This comparison is simplified. S-Corp has additional costs (payroll service, separate tax return). Discuss with your CPA."
- Responsive: stacks vertically on mobile

### Modified file: `src/components/tax-intelligence/TaxDashboard.tsx`
- Import and render `<EntityComparisonCard>` below the "How we got there" collapsible
- Only show when `hasProfile` is true (profile setup complete)

## Technical Details

- Pure client-side calculation — no DB changes, no new API calls
- Both paths use the same `taxCalculatorV1.ts` engine already built
- The salary slider for the S-Corp column uses `useState` locally; no profile mutation
- Mobile layout: single column stack with labels "As 1099" / "As S-Corp"

