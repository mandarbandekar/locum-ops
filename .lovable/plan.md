

# Restructure Onboarding: 7 Steps → 5 Steps

## Summary

Reorder, merge, and trim the onboarding flow so users reach product value (a saved clinic) by Step 2. Remove the Workflow step entirely and absorb the Review/Expand step into the new Step 3.

## New Step Map

```text
Old Flow (7 steps)              New Flow (5 steps)
─────────────────               ─────────────────
1. Profile (full)          →    1. Profile (trimmed)
2. Workflow                →    REMOVED
3. Tax Enablement          →    4. Tax Intelligence
4. Add Practice            →    2. Add Practice (moved up)
5. Add Shift               →    3. Log Shift + Results (merged w/ old 6)
6. Review & Expand         →    ABSORBED into Step 3
7. Calendar Sync           →    5. Calendar Sync + Done
```

## Step-by-Step Changes

### Step 1: Profile (trimmed)
- **Keep**: First name, last name, email (read-only from auth), timezone (auto-detected)
- **Remove from step** (not from DB/Settings): company name, business address, phone, currency
- **CTA text**: "Looks good, let's go →" when all fields pre-filled; "Continue →" otherwise
- **Auto-advance**: If all 4 fields populated from OAuth, show "Welcome, [First Name]!" for 1 second then auto-advance (user can still edit to cancel auto-advance)

### Step 2: Add Practice (moved up, enhanced)
- **Headline**: "Add a clinic you work with"
- **Subtext**: "Start with the one from your most recent shift. You can always add more later."
- Keep existing form (Google Places search, manual fallback, billing fields, rates, cadence)
- **Post-save**: Don't auto-advance. Show saved clinic as a styled confirmation card with: name (bold), address, billing contact/email if provided, day rate if provided, green "Added ✓" badge
- **Two CTAs below card**: Primary "Log your first shift →", Secondary text link "Add another clinic" (clears form, keeps card visible)
- **Skip**: Jumps to Step 5 (calendar_sync) with note: "You can add clinics and log shifts anytime from your dashboard."
- **Hint**: "💡 Tip: The day rate you set here becomes the default when you log shifts — saves you from re-entering it every time."

### Step 3: Log Shift + Results (merged old 5+6)
- Opens ShiftFormDialog as before
- After saving, show inline results (absorbing old manual_expand): summary of practices + shifts added, with "Add another shift" and "Add another practice" options
- Primary CTA: "Continue →" to Step 4

### Step 4: Tax Intelligence (repositioned)
- Same as old Step 3, no changes to content
- Skippable → advances to Step 5

### Step 5: Calendar Sync + Done
- Same CalendarSyncStep component
- On completion → workspace_ready screen (unchanged)

## Technical Changes

### `src/pages/OnboardingPage.tsx`
- Update `Phase` type: remove `'workflow'` and `'manual_expand'`, add `'first_shift'`
- Update `PHASE_STEP` to 5-step numbering
- Update `TOTAL_STEPS` to `5`
- Update `PHASE_LABEL` and `PHASE_BACK` mappings
- Remove workflow state variables (`currentTools`, `facilitiesBand`, `invoicesBand`) and `saveWorkflow`/`toggleTool`
- Remove `TOOL_OPTIONS` constant
- Remove `workflow` and `manual_expand` cases from `renderContent()`
- Rewrite `profile` case: trim fields, add email display, auto-advance logic, dynamic CTA text
- Rewrite `manual_facility` case: new headline/subtext, post-save confirmation card UI, two CTAs, skip-to-step-5 with note, tip hint
- Merge `manual_shift` + `manual_expand` into new `first_shift` case: show shift form, then inline results with add-more options
- Update `saveProfile` to advance to `'manual_facility'` instead of `'workflow'`
- Update skip handlers for new step order
- Remove unused imports (`Checkbox`, `RadioGroup`, `RadioGroupItem`)

### `src/components/onboarding/ManualExpandScreen.tsx`
- No changes needed (may become unused — can keep for now)

### `src/components/onboarding/OnboardingLayout.tsx`
- No changes needed (progress bar, back/skip all driven by props)

### No database changes. No changes to `UserProfileContext`, `DataContext`, or any settings pages.

