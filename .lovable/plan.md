

# Remove Shift & Facility Statuses — Simplification Plan

## Summary

Remove the shift status dropdown entirely (proposed/booked/completed/canceled/prebooked) and simplify facility status from 3 options (prospect/active/paused) to a single implicit model. Shifts exist = they're real and invoiceable. Delete a shift = it's gone. Facilities are simply "active" or "archived."

## Current Dependencies on Shift Status

These are the areas that reference shift status and need updating:

| Area | Current Behavior | New Behavior |
|------|-----------------|-------------|
| **Invoice eligibility** | Only booked/completed → invoiced; proposed/canceled excluded | All shifts are invoice-eligible (they exist = invoiceable) |
| **Auto-complete** | Booked → completed after end time passes | Remove entirely — no status to transition |
| **Conflict detection** | Filters to booked/proposed/prebooked | All shifts conflict (since deleted = gone) |
| **Calendar sync/ICS** | Only booked shifts synced | All shifts synced |
| **Dashboard KPIs** | `status === 'completed'` for earned revenue; `!== 'canceled'` for projections | All shifts count; past shifts = earned, future = projected |
| **Reports** | Filters `!== 'canceled'` | All shifts count (no filter needed) |
| **Confirmations** | Hash includes status | Hash without status field |
| **Edge function (generate-auto-invoices)** | Filters `neq('status', 'canceled')` | No status filter needed |
| **Shift form dialog** | Status dropdown in form | Remove status field from form |
| **Schedule page** | StatusBadge on shifts, filter by status | No status badge, no status filter |

## Current Dependencies on Facility Status

| Area | Current Behavior | New Behavior |
|------|-----------------|-------------|
| **Invoice onboarding** | Filters `f.status === 'active'` | All non-archived facilities |
| **Bulk invoice dialog** | Filters `f.status === 'active'` | All non-archived facilities |
| **Confirmations** | Filters active facilities | All non-archived facilities |
| **Auto-promote on shift add** | Sets facility to 'active' when shift is added | No auto-promotion needed |
| **Reminder engine** | Prospect-specific outreach reminders | Archive-based logic |
| **Facility detail page** | Status badge + status select | Archive toggle |

## Facility Status Simplification

Replace `prospect | active | paused` with a boolean `archived` concept:
- Default: facility is active (no status badge needed)
- User can "Archive" a facility (soft-hide from lists)
- No DB migration needed initially — we just treat `paused` as "archived" in the UI and stop showing the status dropdown. The `status` column stays in DB for backward compat; code defaults all non-paused to "active."

## Files to Change

### Core Types & Logic (6 files)
1. **`src/types/index.ts`** — Remove `ShiftStatus`, `FacilityStatus` types. Remove `status` from `Shift` interface. Change facility status to just `'active' | 'archived'`.
2. **`src/lib/businessLogic.ts`** — `detectShiftConflicts`: remove status filters (all shifts conflict). Remove status checks.
3. **`src/lib/invoiceAutoGeneration.ts`** — `isShiftInvoiceEligible`: remove status check (only check if already invoiced). 
4. **`src/lib/icsGenerator.ts`** — Remove `STATUS:CANCELLED/CONFIRMED` logic, always `CONFIRMED`.
5. **`src/types/confirmations.ts`** — Remove `status` from shift hash computation.
6. **`src/data/seed.ts`** — Remove `status` from seed shift data.

### DataContext (1 file)
7. **`src/contexts/DataContext.tsx`** — Remove auto-complete booked→completed effect. Remove `status !== 'canceled'` filter in auto-invoice logic. Remove facility auto-promote to 'active' on shift add. Remove `.neq('status', 'canceled')` from DB queries.

### UI Components (5 files)
8. **`src/components/schedule/ShiftFormDialog.tsx`** — Remove status state, status dropdown, status in onSave payload. Default to `'booked'` in DB for backward compat.
9. **`src/components/onboarding/ManualShiftForm.tsx`** — No status field (already doesn't have one — good).
10. **`src/components/schedule/WeekTimeGrid.tsx`** — Remove status-based filtering/display.
11. **`src/components/StatusBadge.tsx`** — Remove shift-related statuses (proposed/booked/completed/canceled). Keep invoice statuses. Add 'archived' for facilities.
12. **`src/components/AddFacilityDialog.tsx`** — Remove status dropdown. Default to 'active'.

### Pages (6 files)
13. **`src/pages/SchedulePage.tsx`** — Remove `s.status !== 'canceled'` filters. Remove status badge from list view. Remove facility auto-promote logic.
14. **`src/pages/DashboardPage.tsx`** — Remove `s.status === 'completed'` / `!== 'canceled'` filters. Past shifts = earned, all shifts count.
15. **`src/pages/ReportsPage.tsx`** — Remove all `shift.status` filters.
16. **`src/pages/FacilityDetailPage.tsx`** — Remove status badge, status select. Add archive/unarchive toggle. Remove `s.status !== 'canceled'` filter.
17. **`src/pages/FacilitiesPage.tsx`** — Replace status filter with active/archived toggle. Remove status column.
18. **`src/pages/OnboardingPage.tsx`** — Remove status from shift creation.

### Invoice Components (2 files)
19. **`src/components/invoice/BulkInvoiceDialog.tsx`** — Replace `f.status === 'active'` with `f.status !== 'archived'` (or just `!== 'paused'` for DB compat).
20. **`src/components/invoice/InvoiceOnboardingStepper.tsx`** — Same filter update.

### Edge Function (1 file)
21. **`supabase/functions/generate-auto-invoices/index.ts`** — Remove `.neq('status', 'canceled')` filter on shifts query.

### Tests (5 files)
22. **`src/test/businessLogic.test.ts`** — Update conflict detection tests (no status filtering).
23. **`src/test/invoiceAutoGeneration.test.ts`** — Update eligibility tests.
24. **`src/test/dashboard.test.ts`** — Remove status checks.
25. **`src/test/confirmations.test.ts`** — Update hash tests.
26. **`src/test/clinicConfirmations.test.ts`** — Update if status-dependent.

### Hooks (2 files)
27. **`src/hooks/useManualSetup.ts`** — Hardcode `status: 'booked'` when inserting shifts.
28. **`src/hooks/useReminders.ts`** / **`src/lib/reminderEngine.ts`** — Replace `f.status === 'prospect'` with archive-based logic.

## DB Strategy

**No migration needed.** The `status` column on `shifts` and `facilities` tables stays. We simply:
- Always insert shifts with `status: 'booked'` (hardcoded, hidden from users)
- Never filter by shift status in queries
- Map facility `status: 'paused'` → "archived" in UI; everything else = active
- The column remains for backward compatibility and data integrity

## Risk Mitigation

- Invoice auto-generation rules stay identical in structure — we just remove the status filter. Since users said "delete = gone" (no cancel), every existing shift is invoice-eligible by definition.
- The `generate-auto-invoices` edge function gets the same simplification.
- All existing data with `status: 'booked'` or `'completed'` continues to work unchanged.

## Implementation Order

1. Types + core logic (no UI breakage)
2. DataContext (remove auto-complete, simplify queries)
3. ShiftFormDialog + SchedulePage (biggest UX change)
4. Dashboard + Reports (filter cleanup)
5. Facility pages (archive toggle)
6. Edge function + tests

