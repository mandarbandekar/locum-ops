

## Multi-State Tax Profile — Design

### The real-world problem
Relief vets often work across state lines (e.g., live in OR, do shifts in WA & CA). Each state has its own income tax rules, residency thresholds, and filing requirements. Adding a second state isn't just a UI checkbox — it changes how income is sourced and taxed.

### How taxes actually work across states (the rules we honor)
1. **Resident state** taxes you on **all income**, regardless of where it was earned.
2. **Non-resident states** tax only income **earned within their borders**.
3. To avoid double taxation, your resident state usually gives a **credit** for taxes paid to non-resident states (capped at what the resident state would have charged on that income).
4. Some states have **no income tax** (TX, FL, WA, NV, etc.) — those non-resident shifts add no extra tax.

### Realistic design — a small, honest expansion (not a full multi-state engine)
Rather than building a full state-by-state apportionment engine (CPA-grade complexity), we model it accurately enough to give a reliable estimate, with clear disclaimers.

**Profile changes (Step 5 "State"):**
- Rename to **"Where do you file taxes?"**
- **Resident state** dropdown (required) — same as today
- Toggle: *"I also work in other states"*
  - When on, reveal a list of **non-resident states** with one input each: *"Approx. % of relief income earned here"* (or dollar amount)
  - "Add another state" button (cap at 4 to keep it sane)
  - Live validation: percentages must sum to ≤ 100% (remainder = resident-state work)

**Calculation changes (`taxCalculatorV1.ts`):**
1. Split `netIncome` (1099) or `personalStateIncome` (S-Corp) by the entered allocations.
2. For each non-resident state, run `calculateStateTax(allocatedIncome, fs, stateKey)`.
3. For the resident state, calculate tax on **full income**, then subtract a **credit** equal to `min(nonResidentTaxPaid, residentTaxOnSameIncome)` — standard "credit for taxes paid to other states" logic.
4. Sum: `totalStateTax = residentTaxAfterCredit + sum(nonResidentTax)`.
5. Feed totalStateTax into the same set-aside / quarterly logic — no downstream changes needed.

**Database changes:**
- Add `work_states JSONB` to `tax_intelligence_profiles` — shape: `[{ state_code: 'WA', income_pct: 30 }, ...]`
- Keep existing `state_code` as the resident state (no breaking change).

**UI surfaces that show state info:**
- **TaxDashboard "How we got there"** — show a state-by-state breakdown row when multi-state
- **Tax Payment Hub** — list payment links for **each** non-zero-tax state the user files in
- **Quarterly callout** — unchanged (federal deadlines)

### What we explicitly do NOT do (and tell the user)
- We don't track per-shift state (would require a `shift.state` column and reconciliation against allocations — out of scope here).
- We don't auto-detect residency rules, reciprocal agreements (e.g., NJ↔PA), or PTE elections per state.
- A short disclaimer in the multi-state section: *"Multi-state estimates use the income split you provide. For complex situations (residency changes, reciprocal states), confirm with your CPA."*

### Files touched
- `src/components/tax-intelligence/TaxProfileSetup.tsx` — expand state step UI
- `src/lib/taxCalculatorV1.ts` — add `workStates` to `TaxProfileV1`, update both `calculate1099Tax` and `calculateSCorpTax` to apply credit logic
- `src/hooks/useTaxIntelligence.ts` — add `work_states` field to interface + mapping
- `src/components/tax-intelligence/TaxDashboard.tsx` — show per-state breakdown row
- `src/components/tax-intelligence/TaxPaymentHub.tsx` — render payment links per filed state
- New migration: add `work_states JSONB DEFAULT '[]'` to `tax_intelligence_profiles`

### Risk / scope check
This is a **moderate** lift — most logic stays the same; we're slicing one number (state tax) into a sum and adding a credit. The UI addition is one toggle + a repeatable row. No breaking changes for existing single-state users (empty `work_states` → behaves exactly as today).

