

## Match Add Shift design to the Add Clinic guided flow

Right now the Add Shift dialog (`ShiftFormDialog`, new-shift mode) uses its own `StepIndicator` (numbered circles + labels) and bare uppercase `Label` section headers. The Add Clinic stepper uses a cleaner pattern: a slim progress bar header, and each step wrapped in `GuidedStep` (icon + title + subtitle + optional preview card). This plan brings Add Shift visually in line with that — no behavior changes, no new fields.

### Changes — `src/components/schedule/ShiftFormDialog.tsx` (new-shift mode only)

**1. Replace the `StepIndicator` header with the AddClinicStepper progress header**
Drop the numbered-circle component and render the same compact header AddClinic uses:

```
Step 2 of 3                          ▭▭▭ ▭▭▭ ▭▭▭
```

(small uppercase "Step X of Y" left, three pill segments right; current/done = `bg-primary`, future = `bg-muted`).

**2. Wrap each of the 3 steps in `GuidedStep`** (`@/components/onboarding/GuidedStep`)

| Step | Icon | Title | Subtitle |
|---|---|---|---|
| 1 — Facility | `Building2` | "Which clinic?" | "Pick the practice this shift is for. Add a new one if it's missing." |
| 2 — Schedule | `CalendarDays` | "When are you working?" | "Tap one or more dates, then set your start and end time." |
| 3 — Details | `DollarSign` | "Rate & details" | "Confirm your rate, pick a color, and add notes if needed." |

The form bodies stay exactly as they are — just rendered as `children` of `GuidedStep`. The current uppercase mini-headers inside each step (e.g. "DATE", "TIME", "RATE", "COLOR") get removed since `GuidedStep` already provides the section heading; the icons currently next to those headers move into the `GuidedStep` icon slot.

**3. Step 3 gets a `preview` slot** — move the existing "Review summary" muted card (`{N} shift{s} at {facility} · dates · time · total`) out of the body and into `GuidedStep`'s `preview` prop, matching the way AddClinic's step 4 shows the sample-invoice preview at the bottom. Keeps the same content, just rendered in the consistent preview surface.

**4. Edit mode (`renderEditForm`) is untouched** — same as AddClinicStepper, the guided design is for the *new* flow; editing stays a flat single-screen form. This matches existing memory: "3-step for new, single-screen for edit."

**5. Footer/navigation buttons stay as-is** (Back / Next / Add Shift). No changes to `handleSubmit`, validation, conflict warnings, OT pill, custom-rate toggle, or any data shape.

### Untouched
- All form state, validation, save logic, OT computation, custom-rate save-to-facility flow.
- Edit-mode layout.
- `OnboardingShiftStep` (the onboarding "log first shift" screen — separate component, not this dialog).

### Files
- `src/components/schedule/ShiftFormDialog.tsx` — replace `StepIndicator` with the slim progress header from AddClinicStepper; wrap each of the 3 step renderers in `GuidedStep`; promote the step-3 review summary into `GuidedStep`'s `preview` slot; delete the now-redundant inline section labels.

