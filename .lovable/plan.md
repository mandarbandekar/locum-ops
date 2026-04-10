

# Show Federal & State Breakdown on Quarterly Estimate Hero

## Summary
Add a compact federal/state/SE-tax sub-breakdown beneath the big quarterly payment number in the hero card, so users know exactly how much to pay where.

## What changes

### Modified: `src/components/tax-intelligence/TaxDashboard.tsx`

Below the `$X,XXX` quarterly payment number (line ~114), add a small 2–3 row breakdown:

**For 1099 users** (three components quarterly):
- Federal income tax: `vetFederalShare / 4`
- SE tax: `totalSeTax / 4`
- State tax: `stateTax / 4`

**For S-Corp users** (two components quarterly):
- Federal on K-1: `federalOnDistribution / 4`
- State on K-1: `stateOnDistribution / 4`

Display as a compact row of pills or a mini table right under the big number, e.g.:

```
Federal $X,XXX  ·  SE Tax $X,XXX  ·  CA $XXX
```

If state tax is $0 (no-income-tax state), hide that chip. Each label gets a `<TaxTerm>` tooltip for context.

Also update the quarterly timeline cards (the 4-card grid) to show the same federal/state split beneath each quarter's total — keeping it minimal (just two small lines of text).

## Technical details
- No new files, no DB changes
- All values already exist on `Tax1099Result` and `TaxSCorpResult`
- Responsive: pills wrap naturally on mobile

