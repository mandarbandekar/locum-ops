## Goal

When a user clicks **Add Shift** from a Clinic Detail page, the clinic is already known — they shouldn't have to confirm it as Step 1 of a 4-step wizard.

## Behavior change

- Opening `ShiftFormDialog` from `FacilityDetailPage` skips the "Choose a clinic" step entirely.
- The wizard becomes a **3-step flow**: Schedule → Details → Review.
- Stepper shows "Step X of 3"; the progress dots collapse to 3.
- The Review screen still shows the clinic row, but its "Edit" affordance is hidden (since clinic is locked to this page's facility).
- Behavior from the global Schedule page is unchanged — still 4 steps with clinic selection first.

## Implementation

1. **`ShiftFormDialog.tsx`**
   - Add an optional prop `lockedFacilityId?: string`.
   - If provided:
     - Initialize `facilityId` to that value, `step` to `2`.
     - Compute `totalSteps = 3` and remap the stepper display: render Steps 2/3/4 as 1/2/3.
     - Don't render `renderStep1`; "Back" buttons that previously went to Step 1 instead either disable or close the dialog (Step 2's Back button becomes hidden).
     - In Step 4 (Review), drop the clinic row's "Edit" link (clinic is locked).

2. **`FacilityDetailPage.tsx` (`ShiftsTab`)**
   - Pass `lockedFacilityId={facilityId}` to both `ShiftFormDialog` instances (add and edit). For edit, the dialog already shows a single screen, so this is a no-op safety net.

3. **No backend, schema, or business-logic changes.** Pure UX.

## Out of scope

- Editing flow (already single-screen).
- Global Schedule page entry point (keeps the clinic picker as Step 1).
- Renaming or restructuring steps beyond hiding Step 1.
