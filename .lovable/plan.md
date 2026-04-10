

# Guided 3-Step Shift Creation Flow

## Analysis

The current shift form crams everything into one dense two-column layout — facility, calendar, time, rate, color, notes all at once. This works for power users but is overwhelming on mobile and for new users. A stepped flow lets users focus on one decision at a time while keeping things fast (3 steps, not 5).

### Recommended 3-Step Flow

**Step 1 — Where?** Pick a facility (or add new). This is the anchor decision — it determines available rates.

**Step 2 — When?** Multi-date calendar + start/end time. Conflict warnings show inline. This is the core scheduling step and deserves full attention.

**Step 3 — Details** — Rate (auto-populated from facility terms), color, optional note. Review summary of what's being created, then submit.

This order is better than calendar-first because: selecting the facility first lets us pre-populate rates in step 3 and show facility-specific conflicts in step 2.

### Edit mode stays single-screen
When editing an existing shift, skip the stepper and show the current flat form (all fields visible). The guided flow only applies to new shift creation.

## File Changes

### Modified: `src/components/schedule/ShiftFormDialog.tsx`

**Add stepper state:**
- `const [step, setStep] = useState(1)` — reset to 1 when dialog opens
- Step indicator: 3 small circles/pills at top with labels ("Facility", "Schedule", "Details")
- Back/Next buttons replace the single Submit button (Submit only on step 3)

**Step 1 — Facility selection:**
- Full-width facility selector (existing Select + "Add New" option)
- Large facility cards could be nice but the Select is already clean — keep it, just give it more breathing room
- Next button enabled when `facilityId` is set
- On mobile: full-width, centered

**Step 2 — Calendar + Time:**
- Calendar component (multi-select mode) takes full width on mobile
- Start/end time inputs below calendar
- Selected dates summary + conflict warnings
- Back button + Next button (enabled when ≥1 date selected)

**Step 3 — Rate, Color, Notes + Review:**
- Rate selector (preset or custom, same logic as today)
- Color picker row
- Optional notes toggle
- Summary strip: "3 shifts at Animal Hospital, Dec 5–7, 8am–6pm, $850/day"
- Submit button: "Add 3 Shifts" / "Add Shift"

**Mobile responsive:**
- Each step is a single column, full-width
- Calendar renders full-width on mobile (no side-by-side)
- Step indicator uses compact dots on mobile, pills with labels on desktop
- Navigation buttons are full-width on mobile

**Edit mode bypass:**
- When `existing` is set, render the current flat layout (no stepper)
- Only new shift creation uses the guided flow

**Dialog sizing:**
- Keep `max-w-[680px]` but step content is simpler per screen so it never feels cramped
- Step transitions use a simple fade or no animation (keep it snappy)

### No other files change
- Props and external API stay identical
- `onSave`, `onDelete`, conflict detection, custom rate saving — all unchanged
- The `embedded` mode (used in onboarding) continues to work by rendering the form content directly

