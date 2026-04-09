

# Streamline Add Facility Dialog: 8 Steps → 4 Steps

## Problem

The current 8-step wizard asks for too much upfront. Steps like Tech Access, Clinic Access, CC/BCC contacts, and Invoice Prefix are details users rarely have at hand and can fill in later from the facility detail page.

## Proposed New Flow (4 steps)

```text
Current (8 steps)                    New (4 steps)
──────────────                       ─────────────
0. Welcome                           0. Welcome (trimmed)
1. General (name/address)            1. Clinic Details (name + address + day rate)
2. Shift Rates                       2. Contacts (scheduling + billing "To" only)
3. Tech Access          → REMOVE     3. Billing Preferences (cadence + due days) + Summary
4. Clinic Access        → REMOVE
5. Scheduling Contact
6. Invoicing Preferences
7. Invoice Settings     → TRIM
```

## What Gets Removed / Deferred

| Field | Where it moves |
|---|---|
| Tech Access (computer, wifi, PIMS) | Facility Detail page (already editable there) |
| Clinic Access (door codes, parking) | Facility Detail page (already editable there) |
| CC/BCC contacts | Facility Detail page → Invoice Settings card |
| Invoice Prefix | Auto-generated from clinic initials (editable later) |
| Notes | Facility Detail page |

## New Step Details

**Step 0 — Welcome** (simplified)
- Keep icon + headline, trim the bullet list to 3 items: Clinic info, Contacts, Billing setup
- "Only clinic name is required. Everything else can be added later."

**Step 1 — Clinic Details** (merge old Steps 1 + 2)
- Google Places search → name + address (same as now)
- Below: inline day rate field (single input, not the full RatesEditor)
- This is the only required step (clinic name)

**Step 2 — Contacts** (merge old Steps 5 + 7 "To" only)
- Two sections on one screen: Scheduling Contact (name + email) and Billing Contact (name + email, "To" only)
- Both marked required but with smart default: if scheduling contact is filled, offer "Same as scheduling contact" checkbox for billing
- Remove CC/BCC entirely from creation flow

**Step 3 — Billing + Summary** (merge old Steps 6 + 7 partial)
- Billing cadence selector (daily/weekly/monthly)
- Due days selector (Net 7/14/30/45/60)
- Completion summary grid below
- CTA: "Add Facility"

## Changes to `src/components/AddFacilityDialog.tsx`

1. Reduce `STEP_META` from 8 entries to 4
2. Remove state for: `techComputer`, `techWifi`, `techPims`, `clinicAccess`, `notes`, `invoiceNameCc`, `invoiceEmailCc`, `invoiceNameBcc`, `invoiceEmailBcc`, `invoicePrefix`
3. Auto-compute `invoicePrefix` from `getInitials(name)` at submit time
4. Add `dayRate` state (single number input) instead of full `RatesEditor`
5. Add `sameAsScheduling` checkbox state for billing contact
6. Merge contact fields into one step, billing fields into another
7. Update `validateStep`, `handleSubmit`, `summaryItems` accordingly
8. On submit, if `dayRate > 0`, create a terms record with `weekday_rate: dayRate`

Single file change only. No database or routing changes.

