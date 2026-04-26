## Goal

Insert a visually rich "Welcome / Why LocumOps" screen as the first step of the onboarding flow — shown right before "Set up your rates" (the current Step 1 of 6). It will sell the platform's benefits in a polished, animated way, then drop the user into the existing rate setup.

## What the user will see

A full-screen onboarding step (no app chrome, sidebar, or progress bar) themed with our sage/gold palette. Center-stage hero headline + subhead, followed by a grid of 4 animated benefit cards, then a single primary CTA "Let's get set up →".

### Benefit cards (4)
1. **One home for every clinic** — Store contracts, contacts, rates, and notes per facility.
2. **Shifts → Invoices, automatically** — Log a shift; an invoice drafts itself.
3. **Never miss a renewal** — License, DEA, and CE tracking with proactive reminders.
4. **Tax-ready year-round** — Real-time withholding nudges and CPA-ready exports.

Each card: large icon (lucide), short title, one-line description. Subtle stagger-in animation on mount, gentle hover lift.

### Visual treatment
- Soft gradient background (sage → background) with low-opacity blurred orbs for depth.
- Animated entrance: hero fades/slides in first, cards stagger 80ms apart.
- Floating "what you'll do next" footer chip: "Takes about 3 minutes" with a clock icon.
- Single CTA button (primary sage) — no "skip" (this is purely informational, one screen).
- Respects light/dark mode and brand tokens from `mem://style/visual-identity`.

### Skip-on-return behavior
Shown only the first time a user lands on onboarding. We persist a `welcome_seen` flag in `onboarding_progress`; returning users (resumed mid-flow) jump straight to their saved phase. Existing users mid-flow are unaffected.

## Technical Implementation

### New phase + component
- Add new phase `welcome` to `OnboardingPhase` in `src/contexts/UserProfileContext.tsx` and to `OnboardingProgress` add `welcome_seen?: boolean`.
- Update `src/pages/OnboardingPage.tsx`:
  - Add `welcome` to `PHASE_STEP`, `PHASE_LABEL`, `PHASE_BACK` maps. `welcome` step = 0 (no progress bar shown) and `PHASE_BACK.rate_card = 'welcome'` is intentionally **not** set (welcome is not reachable via Back — it's a one-shot intro).
  - Bump `TOTAL_STEPS` reference: keep total at 6 (welcome doesn't count toward setup steps); pass a flag to `OnboardingLayout` to hide the progress chrome on welcome.
  - Initial phase resolution: if no persisted phase AND `!welcome_seen` → start at `welcome`; otherwise honor saved phase.
  - On CTA click: set `welcome_seen: true`, advance to `rate_card`, persist.
- Create `src/components/onboarding/OnboardingWelcomeScreen.tsx`:
  - Receives `onContinue: () => void`.
  - Uses `Card`, `Button`, lucide icons (`Building2`, `Receipt`, `ShieldCheck`, `Calculator`, `Clock`, `ArrowRight`, `Sparkles`).
  - Tailwind animation classes for stagger (`animate-in fade-in slide-in-from-bottom-4` with inline `style={{ animationDelay }}`).
  - Background decorative elements as absolutely-positioned blurred divs.

### OnboardingLayout
- Add optional `hideProgress?: boolean` prop; when true, render without the "Step X of 6" header/progress bar (welcome screen uses this).

### Analytics
- Fire `onboarding_welcome_viewed` on mount and `onboarding_welcome_continued` on CTA via existing `trackOnboarding()` helper.

## Files to modify
- `src/contexts/UserProfileContext.tsx` — extend phase + progress types
- `src/pages/OnboardingPage.tsx` — wire new phase
- `src/components/onboarding/OnboardingLayout.tsx` — `hideProgress` prop
- `src/lib/onboardingAnalytics.ts` — add 2 event names

## Files to create
- `src/components/onboarding/OnboardingWelcomeScreen.tsx`

## Out of scope
- No video/Lottie assets (kept pure CSS/SVG for fast load and zero new deps).
- No A/B variants — single welcome screen.
- No changes to the rate-card screen itself.
