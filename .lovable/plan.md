## Simplify Billing Cadence & Payment Terms copy

Users are confused by the jargon ("Net 15", terse section labels). Replacing with plain-English questions and human-readable day labels — no functional changes, no new fields, no schema work.

### Changes (Step 4 of `AddClinicStepper.tsx`)

**Section A — Billing Cadence**

- Section label changes from `BILLING CADENCE` to:  
**"Billing cadence — How often do you want to bill this clinic?"**
- Cadence card copy stays the same (Monthly / Weekly / Daily with their one-line examples).

**Section B — Payment Terms**

- Section label changes from `PAYMENT TERMS` to:  
**"**Payment Terms: What is the required timeframe for payment?"**"**
- Pill labels drop the "Net" prefix:
  - `Net 7` → `7 days`
  - `Net 14` → `14 days`
  - `Net 15` → `15 days`
  - `Net 30` → `30 days`
  - `Net 45` → `45 days`
  - `Net 60` → `60 days`
- Helper line below pills updated from *"Industry standard for relief vet work is Net 15 to Net 30."* to:  
*"Most relief vets give clinics 15 to 30 days to pay."*

### Untouched

- All persistence, `invoice_due_days` numeric values, billing cadence enum.
- Sample invoice header preview at the bottom of the step.
- Steps 1–3, the engagement branch, and the footer behavior.

### Files

- `src/components/facilities/AddClinicStepper.tsx` — copy/label updates only (one Section A label, one Section B label, the pill text, and the helper line).