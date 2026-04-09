

# Add Optional Enrichment Steps After Facility Creation

## Summary

After the current 4-step flow (Welcome → Clinic Details → Contacts → Billing Setup) creates the facility, show a **post-creation enrichment screen** instead of immediately closing the dialog. This screen lets users optionally fill in detailed rates, mileage, and tech/clinic access — or skip with a clear message that these are accessible from each clinic's detail tabs.

## New Flow

```text
Steps 0–3 (unchanged)          Step 4 (NEW — post-creation)
───────────────────            ──────────────────────────────
0. Welcome                     4. "Clinic Added!" enrichment screen
1. Clinic Details                 - Detailed shift rates (RatesEditor)
2. Contacts                       - Mileage from home (miles input)
3. Billing Setup → SUBMIT         - Tech access (computer, wifi, PIMS)
                                  - Clinic access (door codes, parking)
                                  [Save & Close] or [Skip — I'll do this later]
```

## Key UX Decisions

- The facility is **already created** after step 3 — step 4 is purely updating it
- Step 4 uses collapsible accordion sections so it doesn't feel overwhelming
- Each section has a one-line explanation of why it matters for relief vets
- Skip button shows: "You can always add these under the clinic's Overview tab"
- If user fills any section and saves, toast confirms the update
- If user skips entirely, a softer toast: "Clinic added — you can enrich details anytime from the clinic page"

## Changes to `src/components/AddFacilityDialog.tsx`

1. **Add step 4 to `STEP_META`**: `{ label: 'Optional Details', icon: Settings2, required: false, hint: '...' }`
2. **Track `createdFacilityId`** state — set after successful submit at step 3
3. **Move `handleSubmit` to trigger at step 3 → step 4 transition** (not at last step)
4. **Add new state** for tech/clinic access fields (`techComputer`, `techWifi`, `techPims`, `clinicAccess`, `mileageMiles`) and import `RatesEditor` + `RateEntry` types
5. **Step 4 UI**: Render 4 accordion sections:
   - **Shift Rates** — embed `RatesEditor` (compact, no card wrapper), pre-populate with day rate from step 1 if set
   - **Mileage from Home** — single numeric input with helper text about automatic expense tracking
   - **Tech Access** — 3 text inputs (computer/login, wifi, PIMS) with helper: "Save these so you're not scrambling on your first day at a new clinic"
   - **Clinic Access** — textarea for door codes, parking, entry instructions
6. **Step 4 navigation**: "Save & Close" button (saves all filled fields via `updateFacility` + `updateTerms`, then closes) and a "Skip — I'll add these later" link that closes with a guidance toast
7. **Update `totalSteps`** to 5, adjust progress bar
8. **Update stepper**: Show steps 1–3 normally, step 4 as a separate "bonus" indicator (dotted border or different styling to signal optional enrichment)

## Accordion Section Details

Each section in step 4:
- **Header**: Icon + title + "Why this matters" one-liner
- **Rates**: "Different clinics pay different rates for weekends, holidays, and partial days. Setting these now means your invoices are accurate from day one."
- **Mileage**: "Enter your one-way drive distance to auto-track mileage deductions after every shift at this clinic."  
- **Tech Access**: "Computer logins, wifi passwords, and PIMS details — save them here so you're prepared before each shift."
- **Clinic Access**: "Door codes, parking instructions, after-hours entry — everything you need to walk in confidently."

## File Changes

| File | Change |
|---|---|
| `src/components/AddFacilityDialog.tsx` | Add step 4 with accordion enrichment, split submit logic, new state fields |

Single file change. No database or routing changes — all fields already exist on the facility model.

