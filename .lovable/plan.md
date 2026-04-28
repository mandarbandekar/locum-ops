# Prevent duplicate creation when going back in onboarding

## The problem

When a user navigates **back** during onboarding and re-submits the same step, new records are created instead of reusing the ones already saved:

- **Add Clinic step**: pressing Back from "Add Shifts" → "Replace with a different clinic" → re-submitting creates a brand-new clinic, even if the same name/address was entered. The previously created clinic stays in the database.
- **Bulk Shifts step**: pressing Back from Invoice Reveal → re-tapping "Add N shifts" calls `addShift` again for each selected date. Since the picker doesn't pre-load already-created session shifts, the user can easily select the same dates a second time, producing duplicate shift rows for the same clinic + date.

Result: the user ends up with phantom clinics and double-booked shifts they never intended to create.

## Fix overview

Two complementary guards — a friendly UI warning **before** submission, and defensive de-duplication logic that protects the database.

### 1. Clinic step — warn on duplicate name + address

In `AddClinicStepper.handleSave` (and the onboarding wrapper), before calling `addFacility`:

- Compare the trimmed `name` (case-insensitive) and `address` against existing `facilities` from `useData()`.
- If a match is found that is **not** the clinic currently being edited (`firstFacilityId`):
  - Show a `toast.error` with a clear message: *"You already added this clinic. Continue with the existing one or change the name."*
  - Optionally show inline validation under the Name field.
  - Block the save.
- Provide a "Use existing clinic" affordance — call `handleClinicSaved(existing.id)` so we reuse instead of duplicate.

### 2. Shifts step — warn on duplicate clinic + date

In `OnboardingBulkShiftCalendar.handleSubmit`, before the `for` loop that calls `addShift`:

- Build a set of existing shift dates for `facility.id` from the `shifts` array already in `useData()` (use `YYYY-MM-DD` from `start_datetime`, normalized per the project's date-handling rule).
- Filter `selectedDates` into:
  - **new dates** → proceed with `addShift`.
  - **already-booked dates** → collect for the warning.
- If any duplicates exist:
  - If **all** selected dates are duplicates: show `toast.error("These shifts are already saved for {clinic}. Pick new dates or go forward.")` and abort.
  - If **some** dates are duplicates: show `toast.warning("{n} date(s) skipped — already saved.")` and only create the new ones.
- Also disable/visually mark already-saved dates inside the calendar picker so they're obvious before submission.

### 3. Back navigation polish

When the user clicks Back from `bulk_shifts` to `add_clinic`, the existing clinic card is shown ("Saved" state) — that's already correct. We will NOT clear `firstFacilityId` on Back. The existing "Replace with a different clinic" button stays as the explicit override (and now goes through the duplicate guard above).

## Files to change

- `src/components/facilities/AddClinicStepper.tsx` — duplicate-clinic guard in `handleSave`, "Use existing" path.
- `src/components/onboarding/OnboardingBulkShiftCalendar.tsx` — pre-submit duplicate-date filter, calendar-day disabled styling for already-booked dates, toast messaging.
- `src/pages/OnboardingPage.tsx` — pass existing facilities/shifts context where needed (already available via `useData`); minor copy tweaks.

## Out of scope

- No database schema changes / unique constraints in this pass — we'll rely on UI guards plus de-duplication in the submit handlers. (Can be added later if we see duplicates from race conditions.)
- No cleanup migration for already-duplicated rows.
