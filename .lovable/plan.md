

# Improve Onboarding UX — Add Contextual Guidance Across All Steps

## Summary

Add contextual explanations, "how it works" hints, and product education to each onboarding step so first-time users understand what LocumOps does as they set things up. No structural changes — just enriching existing screens with helpful copy, explainer cards, and visual cues.

## Changes by File

### 1. `src/pages/OnboardingPage.tsx`

**Step 1 (Profile):**
- Add a small "What is LocumOps?" explainer card below the form with 3 bullet points:
  - "Centralize your clinics, shifts, and invoices in one place"
  - "Auto-generate invoices when you log shifts"
  - "Track taxes and credentials so nothing slips through the cracks"
- Style: muted background card with a subtle icon

**Step 2 (Add Clinic):**
- Add a "Why add clinics?" context card below the tip, explaining: "Each clinic you add becomes a billing entity. When you log shifts at this clinic, LocumOps auto-generates invoices, tracks payments, and builds your earnings reports — no spreadsheets needed."

### 2. `src/components/onboarding/OnboardingShiftStep.tsx`

**Phase 1 (before submit):**
- Add a "How it works" explainer strip above the form with 3 mini steps (icon + short text, horizontal row):
  1. "Log a shift" (clipboard icon)
  2. "Invoice auto-created" (file-text icon)
  3. "Track earnings" (trending-up icon)
- Connected with a dashed line or arrow between them
- Style: compact, muted background, small text

**Phase 2 (after submit):**
- **Block 1 (Invoice Banner):** Add expanded subtitle: "Every shift you log at a clinic automatically generates a draft invoice. You can review, edit, and send it from your Invoices page — or set up auto-reminders."
- **Block 2 (Invoice Preview):** Add a small footer note below the total: "This is a real draft saved to your account. Head to Invoices anytime to review, customize, or send it to the clinic."
- **Block 3 (Earnings Snapshot):** Add a context line: "Your Business Hub tracks weekly, monthly, and annual earnings across all clinics. The more shifts you log, the more accurate your financial picture becomes."

### 3. `src/components/onboarding/OnboardingTaxStep.tsx`

**With shift data:**
- Add a "How we calculate this" collapsible or always-visible info card below the breakdown rows, explaining in plain language: "We project your quarterly income based on your day rate and an average of 60 shift-days per quarter. Your effective tax rate (30%) includes federal income tax, self-employment tax, and an estimated state rate. These numbers refine automatically as you log more shifts throughout the year."
- Add context to the S-Corp nudge: "LocumOps monitors your income trajectory and will alert you when switching to an S-Corp structure could meaningfully reduce your self-employment tax burden."

**Without shift data:**
- Improve the placeholder text: "Tax Intelligence automatically calculates your estimated quarterly taxes, tracks payment deadlines, and alerts you before due dates. It uses your actual shift income — no manual data entry needed."

**Toggle area:**
- Add a small note below the toggle: "You can always enable or disable this later in Settings > Business & Taxes."

### 4. `src/components/onboarding/WorkspaceReady.tsx`

**Completion Summary:**
- Add a brief "What you can do next" intro paragraph below "Here's what's ready:" — "Each of these tools works together. Log shifts to auto-generate invoices. Invoices feed your earnings reports and tax estimates. Everything stays in sync."
- Enhance the "Optional next steps" section with brief descriptions:
  - "Add your credentials (DEA, state license, USDA)" → add "(get renewal reminders before they expire)"
  - "Set up email reminders for invoices" → add "(auto-nudge clinics when payment is due)"
  - "Customize your invoice template" → add "(add your logo, payment instructions, and terms)"
  - "Log more shifts to improve tax accuracy" → add "(quarterly estimates get smarter over time)"

## No structural, routing, or database changes. All additions are copy/UI-only within existing components.

