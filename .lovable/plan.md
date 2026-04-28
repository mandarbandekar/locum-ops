# Simplify Rates: Make the Rate Card Optional, Clinic-First

## The problem (from beta)

Right now we treat the user's **Rate Card** (a global library of default rates stored on the user profile) as the canonical source of truth. We force it during onboarding ("Add at least one rate to continue") and then auto-apply it to every new clinic. Beta feedback shows this misreads the audience:

- Some relief vets really do charge **one rate everywhere** → a global Rate Card is great for them.
- Many others charge **different rates per clinic** → a global Rate Card adds confusion ("why is $850 showing on this clinic? I never agreed to that here").
- Either way, **rates per clinic are usually a one-time setup** that users can edit. We don't need a separate global library to make the shift form usable.

Net: the Rate Card is a power feature dressed up as a required onboarding step.

## Proposal — three guiding principles

1. **Clinic-level rates are the source of truth.** That matches how relief vets actually think.
2. **The Rate Card becomes an optional shortcut**, not a gate. Users opt in only if they want to reuse the same rates across clinics.
3. **The shift form keeps working the same way** — rates from the clinic, plus (if present) rates from the Rate Card, plus a "custom rate" that can be saved back to the clinic.

## What changes for the user

### Onboarding (new flow)

```text
Welcome → Add your first clinic (with rates inline) → Add shifts → See invoices → Done
```

- **Remove the "Set up your rates" step** as a forced gate. The Rate Card is no longer mentioned in the default onboarding path.
- The **Add Clinic** step in onboarding now **shows the Rates step inline** for direct clinics (today it's hidden because we expected the global Rate Card to fill it). User enters one or two rates for this clinic — done.
- Platform/agency clinics still skip rates entirely (already shipped).
- After onboarding, a low-key tip on the dashboard or Settings → Rate Card explains the optional shortcut: "Charge the same rates everywhere? Save them once as a Rate Card."

### Settings → Rate Card (existing page, repositioned)

- Stays exactly where it is, but reframed as **optional**. Page intro changes from "Your default rates" to something like:
  > "Optional. If you charge the same rates across most clinics, save them here once and they'll show up as quick picks when you add a shift. Clinic-specific rates always take priority."
- No behavior change in the shift form — clinic rates + Rate Card rates already merge today.

### Add Shift form

- No functional change. Today it already shows clinic rates + Rate Card rates + custom. With most users skipping the Rate Card, the dropdown just shows clinic rates + custom — which is what they expect.
- The existing "Save this rate to the clinic" checkbox stays. It's the right primitive.

## What changes in code

```text
src/pages/OnboardingPage.tsx
  - Remove the `rate_card` phase from the default path:
      welcome → add_clinic → bulk_shifts → invoice_reveal → business_map
  - Drop `handleRateCardContinue`, the rate_card case in renderStickyFooter,
    and the rate_card case in renderContent.
  - Remove the "Add at least one rate to continue" gate.
  - Update PHASE_STEP / TOTAL_STEPS / PHASE_BACK / PHASE_LABEL accordingly
    (TOTAL_STEPS goes from 5 to 4).
  - Keep `OnboardingRateCard` component on disk — unused for now, but useful
    if we ever want to offer it as an opt-in detour. Do not delete.

src/components/facilities/AddClinicStepper.tsx
  - In onboarding usage, stop passing `hideRatesStep`. The Rates step should
    appear inline for direct clinics during onboarding too.
  - No logic change to the stepper itself; just the call site in
    OnboardingPage.tsx.

src/pages/SettingsRateCardPage.tsx
  - Reword the page intro to make it clear this is optional and that
    clinic-specific rates win.
  - No data-model changes.

src/contexts/UserProfileContext.tsx / DB
  - No schema changes. `default_rates` and `default_billing_preference`
    remain on the profile; existing users keep their data.

src/lib/onboardingAnalytics.ts
  - `maybeTrackActivation` currently treats `rateCardCompleted` or
    `rateCardSkipped` as part of activation. Update the activation latch so
    it no longer requires either — activation = first clinic + first shift
    (+ invoice reveal seen, as today).

Existing users
  - Anyone who already has `default_rates` keeps them — the Rate Card page
    still works and the shift form still merges them in. No migration.
  - Anyone mid-onboarding on the `rate_card` phase: coerce to `add_clinic`
    on hydrate (one-line guard in OnboardingPage).
```

## Why this is the right call

- **Removes the highest-friction step** for the majority of users without taking the feature away from the minority who love it.
- **Aligns the mental model**: "I work with Clinic X at $Y" — not "I have a global rate sheet that overrides per clinic."
- **Zero data loss, zero schema churn.** Existing Rate Card users are unaffected.
- **Keeps the door open** to re-introduce the Rate Card as an opt-in nudge later (e.g., after a user has added 3 clinics with the same rate, prompt: "Save this as a default?"). That's a follow-up, not part of this change.
- Make sure the existing users dont get affected with this change. 

## Out of scope (intentionally)

- Auto-detecting "you've used $850 on 3 clinics, want to save as a default?" smart prompt — good idea, separate ticket.
- Removing the Rate Card page entirely — premature; we'd lose the shortcut for the users who do want it.
- Changing how rates merge inside `ShiftFormDialog` — current behavior is correct.