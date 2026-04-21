

## Goal
When a clinic's billing cadence changes (e.g., daily → weekly, monthly → daily), automatically re-group existing **draft** invoices for that facility under the new cadence. Sent/partial/paid invoices are never touched.

## Why this matters
Today, `updateFacility` just saves the new cadence — but existing draft invoices keep their old period boundaries. If a user switches a clinic from daily to weekly, they're left with seven daily drafts plus a stale weekly one going forward. The drafts no longer match how the clinic is being billed.

## Behavior

### What gets re-grouped
- **Only `draft` + `automatic`-generation invoices** for the affected facility
- All shifts currently on those drafts get released and re-bucketed using the **new** cadence
- New draft invoices are created per the new period boundaries (daily → 1 per day, weekly → 1 per Mon–Sun week, monthly → 1 per month)

### What is preserved
- **Sent / partial / paid** invoices: untouched. Shifts already billed stay billed.
- **Manual** drafts (user-created via Bulk Invoice flow): untouched.
- **Suppressed periods**: still respected — no draft created for a suppressed period under the new cadence.
- **Invoice numbers**: existing draft numbers reused where periods overlap; new ones generated as needed.

### Edge cases
- **Shift already on a sent invoice** stays there. Only un-billed shifts (or shifts on auto-drafts) get re-bucketed.
- **No change** if the new cadence equals the old one — skip silently.
- **Confirmation prompt** before re-grouping: a small dialog explains "This will reorganize 3 draft invoice(s) into [weekly] periods. Sent invoices won't change." with Cancel / Re-group buttons.
- After re-group, show a toast: *"Drafts reorganized: 3 daily drafts merged into 1 weekly draft."*

## UX flow
1. User edits cadence in **Invoicing Preferences** card on facility detail page (`InvoicingPreferencesCard.tsx`) and clicks **Save**.
2. If the new cadence differs from the saved one **and** the facility has at least one automatic draft invoice, show a `<Dialog>` confirming the re-group.
3. On confirm: facility cadence is updated, then the re-group routine runs.
4. On cancel: the cadence change is **not saved** (user can either cancel entirely or save with no re-group, but to keep things consistent we treat cadence change as inseparable from re-group).

## Technical changes

### `src/lib/invoiceAutoGeneration.ts`
Add a new pure helper:
```ts
regroupDraftsForCadenceChange(
  facility, allShifts, existingInvoices, existingLineItems, newCadence
): {
  draftsToDelete: string[];      // draft invoice IDs to remove
  draftsToCreate: { invoice, lineItems }[];  // new drafts under new cadence
}
```
Logic:
- Collect facility's automatic drafts and their line items
- Collect all shift IDs currently on those drafts (these are "free to re-bucket")
- Mark all current automatic drafts for deletion
- Group released shifts into new periods using `getBillingPeriod(newCadence, shift.start)`
- For each new period, build a draft via `buildAutoInvoiceDraft`
- Skip periods covered by suppressed-periods list

### `src/contexts/DataContext.tsx`
- Extract a new exported method: `regroupFacilityDrafts(facilityId, newCadence): Promise<{ removed: number; created: number }>`
- Inside `updateFacility`: detect cadence change → call `regroupFacilityDrafts` after the DB update
- Removes old drafts (cascades line items via existing logic), inserts new drafts + line items, updates local state, returns counts for the toast

### `src/components/facilities/InvoicingPreferencesCard.tsx`
- In `handleSave`, detect if `billingCadence !== facility.billing_cadence`
- If yes and facility has automatic drafts, open a `<AlertDialog>` showing the count and new cadence
- On confirm → call `onUpdate(...)` (which triggers the context re-group)
- Show resulting toast message from the returned counts

### `src/test/invoiceAutoGeneration.test.ts`
Add tests:
- Daily → weekly: 5 daily drafts in one week become 1 weekly draft
- Weekly → monthly: 4 weekly drafts in one month become 1 monthly draft
- Monthly → daily: 1 monthly draft with 3 shifts becomes 3 daily drafts
- Sent invoice with shifts is never touched; its shifts not re-bucketed
- Suppressed period under new cadence is skipped

## Files touched
- `src/lib/invoiceAutoGeneration.ts` (new helper function)
- `src/contexts/DataContext.tsx` (re-group method + cadence-change detection in `updateFacility`)
- `src/components/facilities/InvoicingPreferencesCard.tsx` (confirmation dialog before saving cadence change)
- `src/test/invoiceAutoGeneration.test.ts` (new test cases)

No DB migration required. No edge function changes required (the nightly `generate-auto-invoices` function continues to work on the new cadence going forward).

