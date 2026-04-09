

# Onboarding Steps 3–5: Implementation Plan

## Overview

Replace the current `first_shift`, `tax_enablement`, `calendar_sync`, and `workspace_ready` phases with rich, data-driven experiences. The file `src/pages/OnboardingPage.tsx` is the primary target. Two new helper components will be extracted to keep it manageable.

## New Components

### 1. `src/components/onboarding/OnboardingShiftStep.tsx`
Step 3 — inline shift form + results phase on same screen.

**Phase 1 (input):**
- If user added 1 facility: show non-editable reference card (name, address, "Just added" badge) — no dropdown
- If multiple facilities: show a dropdown selector
- Fields: date (default yesterday), start time (08:00), end time (18:00), rate (pre-filled from facility's terms `day_rate`, fallback `$650` placeholder)
- CTA: "Log shift →"

**Phase 2 (results — appears after submit, same screen):**
- Form collapses (dims with reduced opacity)
- Call `addShift(...)` which already auto-generates the draft invoice in DataContext
- After shift saved, read back the newly created invoice + line items from DataContext state
- Render 3 result blocks with staggered slide-up animation (200ms each):
  1. **Invoice Generated Banner** — gradient bg, ⚡ icon, "Invoice auto-generated", subtitle
  2. **Invoice Preview Card** — styled like a real invoice document: "INVOICE" header, invoice number, date, "Net 30", bill-to clinic name, line item "Relief veterinary services — Xh", total, "Draft" badge
  3. **Earnings Snapshot Card** — "📊 Business Hub — Earnings this week", large green dollar amount, 35% progress bar, footnote
- Below blocks: Primary "See my tax estimate →", secondary text links "Add another shift" | "Add another practice"
- "Add another shift" scrolls up and resets form
- "Add another practice" opens `AddFacilityDialog`

**Props:** `facilities`, `shifts`, `terms`, `invoices`, `lineItems`, `addShift`, `onContinue`, `onAddPractice`

### 2. `src/components/onboarding/OnboardingTaxStep.tsx`
Step 4 — data-driven tax opt-in.

**If shift data exists (rate available):**
- Tax Snapshot Card with gradient border:
  - Quarterly income = rate × 60, quarterly tax = quarterly_income × 0.30
  - Two large side-by-side metrics with scale-up animation
  - Breakdown rows: federal (×0.22), SE tax (×0.153), state (×0.05)
  - Footer with assumptions
- S-Corp Savings Nudge card: savings = quarterly_income × 0.05
- Opt-in toggle (ON by default) + disclaimer checkbox (same text as current)
- CTA: "Almost done →"

**If no shift data:**
- Simplified message + toggle (OFF by default) + disclaimer
- Grayed-out preview mockup of tax dashboard
- CTA: "Almost done →"

**Props:** `shiftRate`, `hasShiftData`, `timezone`, `onContinue`, `onEnableTax`

### 3. `src/components/onboarding/WorkspaceReady.tsx` — Rewrite
Step 5 — merge calendar sync + completion summary into one screen.

**Section 1: Calendar Sync**
- Reuse existing `CalendarSyncStep` UI but without its own "Continue" button
- Frame: "Sync your shifts to your calendar" + "Optional — you can set this up later in Settings."

**Section 2: Completion Summary**
- "You're all set" headline
- 4 result cards with staggered animation (100ms):
  - 🏥 Clinic CRM — "[name] added" or "No clinics yet" (dimmed + "Set up →")
  - 📋 Shift Log — "X shift(s) tracked" or "No shifts yet"
  - 📄 Invoice — "$X draft ready to send" or "No invoices yet"
  - 🧮 Tax Estimate — "$X quarterly projection" or "Disabled"
- Completed = green check + full opacity; skipped = dimmed + deep-link
- Optional Next Steps checklist (4 unchecked items)
- Primary: "Go to Dashboard"; Secondary row: "Schedule" | "Clinics" | "Invoices"
- Any navigation CTA calls `completeOnboarding()` then navigates

**Props:** `facilities`, `shifts`, `invoices`, `taxEnabled`, `shiftRate`, `onNavigate`, `onCompleteOnboarding`

## Changes to `src/pages/OnboardingPage.tsx`

1. Remove `workspace_ready` as separate phase — merge into `calendar_sync` phase
2. Update `PHASE_STEP`: keep as-is (calendar_sync = 5)
3. Replace `first_shift` case with `<OnboardingShiftStep>`
4. Replace `tax_enablement` case with `<OnboardingTaxStep>`
5. Replace `calendar_sync` + `workspace_ready` cases with new `<WorkspaceReady>` (combined)
6. Pass `invoices` and `lineItems` from `useData()` to child components
7. Track `taxEnabled` state, `lastShiftRate` state (set after shift save)
8. Remove `ShiftFormDialog` usage (replaced by inline form)
9. Remove `shiftDialogOpen` state

## Animations

Add to `tailwind.config.ts`:
- `slide-up`: translateY(20px) → 0 with fade, 400ms
- `scale-up`: scale(0.8) → 1, 400ms ease-out

Use inline `style={{ animationDelay: '200ms' }}` for staggering.

## Skip Logic (unchanged from current)
- Step 2 skip → Step 5
- Step 3 skip → Step 4
- Step 4 skip → Step 5

## Mobile Considerations
- Invoice preview card: full-width
- Tax metrics: stack vertically below 480px (`flex-col` at `max-sm:`)
- All already inside `OnboardingLayout` which collapses to single column

## What's NOT Changing
- Auth flow, routing, `onboarding_completed_at` logic
- Database schema
- `OnboardingLayout` component
- Steps 1 and 2 (already implemented)
- `DataContext.addShift` auto-invoice generation (we rely on it)
- `CalendarSyncStep` internals (reused as-is inside new Step 5)

## File Summary

| File | Action |
|---|---|
| `src/components/onboarding/OnboardingShiftStep.tsx` | Create — inline shift form + results |
| `src/components/onboarding/OnboardingTaxStep.tsx` | Create — data-driven tax opt-in |
| `src/components/onboarding/WorkspaceReady.tsx` | Rewrite — calendar sync + completion |
| `src/pages/OnboardingPage.tsx` | Update — wire new components, remove dialog approach |
| `tailwind.config.ts` | Add slide-up + scale-up keyframes |

