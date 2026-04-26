## Goal

Polish the onboarding welcome screen so it feels like a true brand moment — richer graphics, clearer hierarchy, no repeated "Welcome" copy. Single file change: `src/components/onboarding/OnboardingWelcomeScreen.tsx`.

## What changes for the user

**Top of screen — fix the redundancy**
- Remove the eyebrow chip "Welcome to LocumOps" (it duplicates the headline).
- Replace it with a single elegant brand mark: the `LocumOpsMark` emblem + small "LocumOps" wordmark, centered above the hero. This becomes the only "Welcome to LocumOps" cue.
- Headline becomes punchier — drop the "Welcome, {firstName}" prefix variant. New copy:
  - H1: **"Your relief practice, organized end-to-end."**
  - Optional small greeting line above the H1 (only when firstName is known): *"Hi {firstName} —"* in muted small-caps, so it greets without competing.
- Subhead unchanged in spirit, slightly tightened.

**Benefit cards — add real graphics, not just an icon**
Each of the 4 cards gets a small custom illustrated motif rendered as inline SVG (no new assets, no new deps). Motifs use the sage primary + gold accent tokens and pick up on the card's theme:

1. **One home for every clinic** — stacked clinic "buildings" silhouette with a soft pin marker.
2. **Shifts → invoices, automatically** — a stylized shift card morphing into an invoice (two overlapping rounded rects connected by an arrow).
3. **Never miss a renewal** — shield with a clock arc + tick.
4. **Tax-ready year-round** — calendar grid with a highlighted Q-marker and a small upward sparkline.

Each motif sits in a 96×96 rounded "tile" with a soft sage→accent gradient background and 1px ring. Lucide icon is removed in favor of these richer SVG vignettes. Card body stays text-light: title + 1 line.

**Layout & rhythm**
- Cards become a 2×2 grid on desktop, stacked on mobile (unchanged structure, refined spacing).
- Slightly reduce vertical scroll on tall viewports: tighter top padding, cards `gap-5` instead of `gap-4`.
- Add a thin animated horizontal accent line (sage→gold gradient, ~120px) above the headline for polish.
- Keep the existing blurred orbs background but tone down opacity (orbs were competing with the cards).

**CTA & footer**
- CTA stays "Let's get set up →".
- Add a subtle row of 3 small reassurance pills under the timer line:
  - "No credit card" · "Cancel anytime" · "Your data, encrypted"
  Rendered as small ghost chips, separated by tiny dots. Keeps the moment trustworthy without sales-y noise.

**Motion**
- Brand mark fades in first (delay 0).
- Headline + subhead stagger in (60ms, 160ms).
- Cards stagger 90ms apart with a gentle slide-from-bottom + fade.
- Each card's SVG motif animates one internal element on hover (e.g., pin bobs, arrow nudges right, clock hand rotates a hair, sparkline draws). All CSS-only via Tailwind `group-hover:` transforms.
- Respects `prefers-reduced-motion` automatically (Tailwind `motion-safe:` gating on the hover micro-animations).

## Visual language

- Stays inside the sage/gold tokens from `mem://style/visual-identity`. No new colors.
- Card surfaces: `bg-card/80` with `backdrop-blur-sm`, `border-border/60`, hover lifts to `border-primary/40` + shadow.
- Motif tile gradient: `from-primary/15 via-primary/5 to-accent/15`, ring `ring-primary/15`.
- Typography unchanged (Manrope display, Inter body).

## Technical notes

- Single-file edit: `src/components/onboarding/OnboardingWelcomeScreen.tsx`.
- Define 4 small inline SVG components co-located in the file (`ClinicMotif`, `InvoiceMotif`, `RenewalMotif`, `TaxMotif`) — each ~30–50 lines of SVG using `currentColor` + `text-primary` / `text-accent` for theming, with `group-hover:` classes on inner `<g>` / `<path>` elements for motion.
- Import `LocumOpsMark` from `@/components/brand/LocumOpsMark` for the top brand cue.
- Keep `trackOnboarding('onboarding_welcome_viewed')` and `_continued` events as-is.
- No changes to props, routing, `OnboardingPage.tsx`, layout, or analytics module.
- No new packages.

## Out of scope

- No Lottie/video.
- No copy changes to subsequent onboarding steps.
- No changes to `welcome_seen` persistence or phase routing.
