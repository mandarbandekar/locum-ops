## Revert Add Clinic to the previous stepper flow

Restore the pre–Jun 8 Add Clinic experience. The multi-step `AddClinicStepper` (Clinic Details → Engagement → Rates → Contacts → Billing) still exists at `src/components/facilities/AddClinicStepper.tsx` and is what onboarding already uses — we'll bring it back to the Facilities / Today / Dashboard entry points and delete the Quick Add surface.

### What changes

1. **Rebuild `src/components/AddFacilityDialog.tsx`** so it mounts `AddClinicStepper` inside a `Dialog` (max-w 680px, single column per design system), with a header + footer wired to the stepper handle (`back`, `next`, `skip`, `primaryLabel`, `step / totalSteps`). On `onSaved` it calls `onCreated(facilityId)` and closes — no `?setup=1` redirect, no toast with "Add details", no "Save & close" / "Save & add details" buttons.

2. **Remove the post-creation setup surface** in `src/pages/FacilityDetailPage.tsx`:
   - Delete the `SetupBanner` component and its imports.
   - Remove `setupChecklist`, `setupRequested`, `showSetupBanner`, `dismissSetupBanner`, and the `?setup=1` read/strip logic.
   - Remove the `<SetupBanner …/>` render.

3. **Remove the "Setup incomplete · Add details" chip** in `src/pages/FacilitiesPage.tsx`:
   - Delete `isSetupIncomplete` and its render branch on each clinic card.

4. **Drop `?setup=1` deep links** elsewhere:
   - `src/pages/mobile/MobileClinicDetailPage.tsx` line 116 → navigate to `/facilities/${fac.id}` without the query.

5. **Preserve mobile shell behavior** — mobile entry points (`MobileTodayPage`, `MobileClinicsPage`) keep using `AddFacilityDialog`, which now hosts the stepper. The stepper is responsive enough for the mobile sheet width; no separate mobile branch is added in this pass.

### Out of scope

- Changes to `AddClinicStepper` internals, onboarding, or the `RatesEditor` / `EngagementSelector` it composes.
- Mobile-specific redesign of the stepper (can be a follow-up if it feels cramped on the mobile shell).
- Schema, analytics, or telemetry changes.

### Files touched

- `src/components/AddFacilityDialog.tsx` — rewrite to host the stepper.
- `src/pages/FacilityDetailPage.tsx` — remove `SetupBanner` + checklist logic.
- `src/pages/FacilitiesPage.tsx` — remove setup-incomplete chip + helper.
- `src/pages/mobile/MobileClinicDetailPage.tsx` — drop `?setup=1` link.
