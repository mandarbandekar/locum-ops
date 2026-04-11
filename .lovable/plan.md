

# Add Notification Preferences to Onboarding

## Overview
Add a new step to the onboarding flow where users choose how they want to be notified. The step is lightweight — just channel selection (email/SMS) and which reminder categories to enable. We scope categories to only the four the user cares about: invoice review, overdue invoices, credential expirations, and CE deadlines.

## Changes

### 1. New component: `src/components/onboarding/OnboardingRemindersStep.tsx`
A focused step with:
- **Channel toggles**: Email (on by default), SMS (off by default, shows phone input when enabled)
- **Category toggles** (all on by default):
  - "Invoice ready for review" 
  - "Overdue invoices"
  - "Credential expirations" 
  - "CE deadlines"
- A "Continue" button that persists selections to `reminder_preferences` and `reminder_category_settings` tables
- A note: "You can change these anytime in Settings → Reminders"

The component will use `useReminderPreferences` under the hood — on save, it calls `updatePrefs` for channel toggles and `updateCategory` for each relevant category. Since `useReminderPreferences` auto-seeds default rows on first load, the rows will exist by the time the user hits this step.

### 2. Update `src/pages/OnboardingPage.tsx`
- Add a new phase `'reminders'` between `tax_enablement` and `calendar_sync`
- Update `TOTAL_STEPS` from 5 → 6
- Update `PHASE_STEP`, `PHASE_LABEL`, `PHASE_BACK` maps
- Render `OnboardingRemindersStep` for the `reminders` phase
- Allow skipping (defaults stay as-is)

### 3. Update `src/components/onboarding/OnboardingLayout.tsx`
No changes needed — it already accepts dynamic `totalSteps`.

### No database changes
The `reminder_preferences` and `reminder_category_settings` tables already exist with the right columns. The hook auto-seeds default rows on first access.

## Design Details
- The step groups invoice reminders (ready for review + overdue) and credential reminders (expirations + CE) visually with small section headers
- SMS toggle reveals a phone number input inline (similar to Settings page)
- Clean, minimal UI matching the rest of the onboarding aesthetic
- Categories not shown in onboarding (confirmations, contracts, outreach, shifts, taxes) keep their seeded defaults — users can customize later in Settings

