

# Onboarding Flow Restructure: 6 Steps → 3 Steps

## Summary
Restructure the onboarding from 6 steps to 3, remove Profile/Notifications/Calendar Sync as separate screens, update micro-copy throughout, and simplify the finish screen.

## Files to Modify

### 1. `src/pages/OnboardingPage.tsx` — Major rewrite
- Change `Phase` type to `'manual_facility' | 'first_shift' | 'tax_enablement' | 'finish'`
- Update `PHASE_STEP` to 3-step mapping (manual_facility=1, first_shift=2, tax_enablement=3, finish not shown in layout)
- Set `TOTAL_STEPS = 3` and update `PHASE_LABEL` ("Add a clinic", "Log a shift", "Your taxes")
- Remove `'profile'` phase rendering entirely
- Always auto-save profile on mount (first/last name from auth metadata + auto-detected timezone), not just for OAuth users
- Auto-set default notification preferences on mount (call `useReminderPreferences` to seed defaults)
- Add inline greeting bar at top of `manual_facility` phase: "Hi [FirstName]! Timezone: [tz] ✏️ Change" with timezone dropdown
- Update `manual_facility` micro-copy (title, subtitle, "Why add clinics?" box text per spec)
- Tax step now calls `onContinue` → sets phase to `'finish'` (no reminders/calendar_sync)
- Update skip handlers to only offer skips for steps 1 and 2
- Render a simplified finish screen inline (no `WorkspaceReady` component) OR create a new lightweight component

### 2. `src/components/onboarding/OnboardingShiftStep.tsx` — Micro-copy updates
- Subtitle: "Each shift you log feeds your invoices, earnings, and tax estimate automatically."
- Invoice callout text: "Every shift you log creates a draft invoice. Review, edit, and send it from your Invoices page — or set up auto-reminders."
- Earnings helper text: "Based on 1 shift. Your Business Hub shows weekly, monthly, and annual earnings across all clinics. The more shifts you log, the more complete your financial picture becomes."

### 3. `src/components/onboarding/OnboardingTaxStep.tsx` — Multiple changes
- Remove `Checkbox` import and `disclaimer` state
- Replace interactive disclaimer checkbox with static gray text block containing the disclaimer text
- Remove `canProceed` logic that requires checkbox — button always enabled when tax toggle is on or off
- Change CTA text from "Almost done →" to "Finish Setup →"
- Add helper line above CTA: "Your tax estimate updates as you log more shifts throughout the year."
- Update `onContinue` call to pass `taxEnabled` directly (no disclaimer gating)

### 4. `src/components/onboarding/WorkspaceReady.tsx` — Simplify into finish screen
- Remove Calendar Sync section entirely (no `CalendarSyncStep` import)
- Remove `calendarDone` state — show completion summary immediately
- Update heading to "🎉 You're all set!"
- Update subtext to: "Everything you just entered is working together — your shifts generate invoices, your invoices feed your tax picture."
- Keep the 4 result checkmark cards
- Remove "Optional Next Steps" card entirely
- Remove secondary navigation buttons (Schedule, Clinics, Invoices grid)
- Keep only the single "Go to My Dashboard →" primary CTA

### 5. `src/components/onboarding/OnboardingLayout.tsx` — No changes needed
The layout already accepts dynamic `step`, `totalSteps`, and `stepLabel` props.

## No changes to:
- Welcome page (`WelcomePage.tsx`) — stays as-is
- Visual design, colors, layout
- Form validation, onChange handlers, submit logic
- Any other components outside onboarding

## Technical Notes
- Profile auto-save uses existing `updateProfile()` from `useUserProfile` context
- Timezone detection uses existing `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Default notification prefs will be seeded by calling the existing `useReminderPreferences` hook's update methods on mount
- The inline timezone picker reuses the same `Select` component already used in the old profile step

